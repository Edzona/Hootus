import assert from 'node:assert/strict';
import { test } from 'node:test';
import { UserRole } from '../src/types/domain.js';
import { createTestApi } from './helpers/api.js';
import { createIntegrationFixture, integrationOptions } from './helpers/fixtures.js';

const { call } = createTestApi();

test('profile privacy and uniqueness', integrationOptions, async t => {
  const fixture = await createIntegrationFixture();
  const { users, owner } = fixture;
  try {
    await t.test('students receive only their own public profile identity', async () => {
      const result = await call('/api/profile/me', users[UserRole.Student].token);
      assert.equal(result.status, 200);
      assert.equal(result.body.data.id, users[UserRole.Student].publicId);
      assert.equal(result.body.data.role, UserRole.Student);
      assert.notEqual(result.body.data.id, users[UserRole.Student].id);
      assert(!('auth_user_id' in result.body.data));
      assert(!('internal_id' in result.body.data));
    });
    await t.test('database rejects duplicate profile emails even through privileged writes', async () => {
      await assert.rejects(owner`
        update public.profiles set email = ${users[UserRole.Student].email.toUpperCase()}
        where auth_user_id = ${users[UserRole.Admin].id}
      `, { code: '23505' });
      const [original] = await owner`select email from public.profiles where auth_user_id = ${users[UserRole.Admin].id}`;
      assert.equal(original.email, users[UserRole.Admin].email);
    });
  } finally {
    await fixture.cleanup();
  }
});
