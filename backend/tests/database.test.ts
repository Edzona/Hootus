import assert from 'node:assert/strict';
import { after, test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { ListingCategory, UserRole } from '../src/types/domain.js';
import { ErrorCode } from '../src/types/errorCode.js';
import { sql, withUser } from './helpers/api.js';
import { createIntegrationFixture, integrationOptions, authOptions } from './helpers/fixtures.js';

after(() => sql.end());

test('database access and pooled identity isolation', integrationOptions, async t => {
  const fixture = await createIntegrationFixture();
  const { users, owner, url } = fixture;
  try {
    await t.test('browser tokens cannot read or write application tables', async () => {
      for (const token of [undefined, users[UserRole.Student].token, users[UserRole.Admin].token]) {
        const browser = createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth: authOptions, ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
        });
        for (const table of ['profiles', 'listings', 'feed_posts', 'messages']) {
          const read = await browser.from(table).select('*').limit(1);
          assert.equal(read.error?.code, '42501', `Direct ${table} read must be denied`);
        }
        const write = await browser.from('listings').insert({
          category: ListingCategory.Sales, title: 'Bypass attempt',
        });
        assert.equal(write.error?.code, '42501');
      }
    });
    await t.test('pooled transactions isolate identities, roll back, and enforce RLS', async () => {
      const members = [users[UserRole.Student], users[UserRole.ClubLeader]];
      await Promise.all(Array.from({ length: 8 }, async (_, index) => {
        const member = members[index % members.length];
        const profiles = await withUser(member.id, tx => tx`select auth_user_id from public.profiles`);
        assert.deepEqual(profiles.map(profile => profile.auth_user_id), [member.id]);
      }));
      const marker = `rolled-back-${randomUUID()}`;
      await assert.rejects(withUser(users[UserRole.Student].id, async tx => {
        await tx`insert into public.listings (category, title) values ('sales', ${marker})`;
        throw new Error('Force transaction rollback');
      }));
      assert.equal((await owner`select public_id from public.listings where title = ${marker}`).length, 0);
      await assert.rejects(withUser(users[UserRole.Student].id, tx => tx`
        insert into public.feed_posts (kind, title, business_name)
        values ('perk', 'Unauthorized', 'Shop')
      `), { code: ErrorCode.Forbidden });
      // Raw pooled connections must never retain a user role or JWT subject.
      const [state] = await sql`
        select current_user as role,
          nullif(current_setting('request.jwt.claim.sub', true), '') as subject,
          has_table_privilege(current_user, 'public.profiles', 'select') as can_read
      `;
      assert.equal(state.role, 'hootus_server');
      assert.equal(state.subject, null);
      assert.equal(state.can_read, false);
    });
  } finally {
    await fixture.cleanup();
  }
});
