import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UserRole } from '../../src/types/domain.js';
import { createIntegrationFixture, integrationOptions } from '../helpers/fixtures.js';

// Set before importing api/env so cron auth is enabled and SMTP is disabled for endpoint wiring checks.
process.env.CRON_SECRET = 'test-cron-secret-123456';
process.env.SMTP_HOST = '';
const { createTestApi } = await import('../helpers/api.js');
const { signUnsubscribeToken } = await import('../../src/helpers/digest.js');

const { call } = createTestApi();

test('digest HTTP endpoints enforce cron auth and persist unsubscribe in Postgres', integrationOptions, async t => {
  const fixture = await createIntegrationFixture();
  const { owner, users } = fixture;
  const student = users[UserRole.Student];
  const leader = users[UserRole.ClubLeader];

  try {
    await t.test('cron digest endpoint enforces secret and wires through to digest runner', async () => {
      assert.equal((await call('/api/digest/send', undefined, undefined, {}, 'POST')).status, 401);
      assert.equal((await call('/api/digest/send', 'wrong-secret', undefined, {}, 'POST')).status, 401);

      for (const method of ['POST', 'GET'] as const) {
        const res = await call('/api/digest/send', 'test-cron-secret-123456', undefined, {}, method);
        assert.equal(res.status, 200, JSON.stringify(res.body));
        assert.deepEqual(res.body, { data: { enabled: false, sent: 0, failed: 0 } });
      }
    });

    await t.test('unsubscribe link disables email_digest in Postgres and rejects tampered tokens', async () => {
      // Keep digest_sent_at in the future so parallel digest-delivery tests do not claim these fixtures.
      await owner`update public.profiles set email_digest = true, digest_sent_at = now() + interval '1 hour'
        where public_id in (${student.publicId}, ${leader.publicId})`;

      const token = signUnsubscribeToken(student.publicId);
      const tampered = await call(`/api/digest/unsubscribe?token=${encodeURIComponent(`${token}x`)}`);
      assert.equal(tampered.status, 400);
      assert.match(tampered.headers.get('content-type') ?? '', /text\/html/);
      assert.match(String(tampered.body), /<h1>Invalid unsubscribe link<\/h1>/);
      const [stillEnabled] = await owner`select email_digest from public.profiles where public_id = ${student.publicId}`;
      assert.equal(stillEnabled.email_digest, true);

      const valid = await call(`/api/digest/unsubscribe?token=${encodeURIComponent(token)}`);
      assert.equal(valid.status, 200);
      assert.match(valid.headers.get('content-type') ?? '', /text\/html/);
      assert.match(String(valid.body), /<h1>Unsubscribed<\/h1>/);
      const [studentRow] = await owner`select email_digest from public.profiles where public_id = ${student.publicId}`;
      const [leaderRow] = await owner`select email_digest from public.profiles where public_id = ${leader.publicId}`;
      assert.equal(studentRow.email_digest, false);
      assert.equal(leaderRow.email_digest, true);
    });
  } finally {
    await fixture.cleanup();
  }
});
