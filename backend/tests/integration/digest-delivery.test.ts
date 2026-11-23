import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { UserRole } from '../../src/types/domain.js';
import { createIntegrationFixture, integrationOptions } from '../helpers/fixtures.js';

// Set before importing the env-backed digest helper. Port 9 on localhost is closed, so every send fails fast with ECONNREFUSED.
Object.assign(process.env, {
  SMTP_HOST: '127.0.0.1', SMTP_PORT: '9', SMTP_FROM: 'digest@hootus.test', CRON_SECRET: 'test-cron-secret-123456',
});
const { sql } = await import('../../src/config/database.js');
const { sendDailyDigests } = await import('../../src/helpers/digest.js');

after(() => sql.end());

test('failed digests are attempted once per run and their window is restored', { ...integrationOptions, timeout: 60_000 }, async () => {
  const fixture = await createIntegrationFixture();
  const { owner, users } = fixture;
  const recipients = [users[UserRole.Student].id, users[UserRole.ClubLeader].id];
  try {
    await assert.rejects(
      sql.begin(async tx => {
        await tx`set local role hootus_api`;
        await tx`select set_config('request.jwt.claim.sub', ${users[UserRole.Student].id}, true)`;
        await tx`select * from private.claim_digests(1)`;
      }),
      error => (error as { code?: string }).code === '42501',
    );
    await owner`update public.profiles set email_digest = true, digest_sent_at = now() - interval '1 day'
      where auth_user_id = any(${recipients})`;
    await owner`insert into public.listings (author_id, category, title, price_jpy)
      select id, 'sales', 'Digest fixture', 100 from public.profiles where auth_user_id = ${users[UserRole.Admin].id}`;
    const before = await owner`select digest_sent_at from public.profiles where auth_user_id = any(${recipients}) order by id`;

    // A batch size of 1 keeps every batch full, which used to retry the same failure forever.
    const result = await sendDailyDigests(1);
    assert.equal(result.enabled, true);
    assert.equal(result.sent, 0);
    assert(result.failed >= recipients.length);

    const after = await owner`select digest_sent_at from public.profiles where auth_user_id = any(${recipients}) order by id`;
    assert.deepEqual(after, before);
  } finally {
    await fixture.cleanup();
  }
});
