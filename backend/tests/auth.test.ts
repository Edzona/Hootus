import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { ErrorCode } from '../src/types/errorCode.js';
import { UserRole } from '../src/types/domain.js';
import { createTestApi } from './helpers/api.js';
import { createIntegrationFixture, integrationOptions, emailedAccessToken } from './helpers/fixtures.js';

const { call } = createTestApi();

test('authentication and signup', integrationOptions, async t => {
  const fixture = await createIntegrationFixture();
  const { users, owner, ids } = fixture;
  try {
    await t.test('invalid, tampered, and expired tokens are rejected', async () => {
      assert.equal((await call('/api/profile/me', 'not-a-jwt')).status, 401);
      // Tampering with a real token's payload must fail local signature verification.
      const [header, payload, signature] = users[UserRole.Student].token.split('.');
      const claims = JSON.parse(Buffer.from(payload, 'base64url').toString());
      claims.sub = users[UserRole.Admin].id;
      const forged = [header, Buffer.from(JSON.stringify(claims)).toString('base64url'), signature].join('.');
      assert.equal((await call('/api/profile/me', forged)).status, 401);
      claims.sub = users[UserRole.Student].id;
      claims.exp = Math.floor(Date.now() / 1000) - 60;
      const expired = [header, Buffer.from(JSON.stringify(claims)).toString('base64url'), signature].join('.');
      assert.equal((await call('/api/profile/me', expired)).status, 401);
    });
    await t.test('signup does not reveal registered emails or student IDs', async () => {
      const studentId = String(Math.floor(Math.random() * 900000000) + 100000000);
      await owner`update public.profiles set student_id = ${studentId} where auth_user_id = ${users[UserRole.Student].id}`;
      // Auth rate-limits repeat requests per email, so send one request for it.
      const existing = await call('/api/auth/signup', undefined, {
        email: users[UserRole.Student].email.toUpperCase(), name: 'Another student',
        studentId: '900000002', redirectTo: 'http://localhost:5173',
      });
      assert.equal(existing.status, 202, JSON.stringify(existing.body));
      const duplicate = await call('/api/auth/signup', undefined, {
        email: `duplicate-${randomUUID()}@temple.edu`, name: 'Duplicate test',
        studentId, redirectTo: 'http://localhost:5173',
      });
      assert.equal(duplicate.status, 502);
      assert.equal(duplicate.body.error.code, ErrorCode.AuthRequestFailed);
      assert(!JSON.stringify(duplicate.body).includes(users[UserRole.Student].email));
    });
    await t.test('signup creates a profile and rejects untrusted redirects', async () => {
      const email = `signup-${randomUUID()}@temple.edu`;
      const body = {
        email, name: 'Signup test', studentId: String(Math.floor(Math.random() * 900000000) + 100000000),
        redirectTo: 'http://localhost:5173',
      };
      assert.equal((await call('/api/auth/signup', undefined, { ...body, redirectTo: 'https://evil.example' })).status, 400);
      const result = await call('/api/auth/signup', undefined, body);
      // Find any created fixture before asserting, so finally can remove it.
      const [profile] = await owner`select auth_user_id from public.profiles where email = ${email}`;
      if (profile) ids.push(profile.auth_user_id);
      assert.equal(result.status, 202, JSON.stringify(result.body));
      assert(profile);
      // Complete sign-in like a user: open the link from the local Mailpit inbox.
      const token = await emailedAccessToken(email);
      const me = await call('/api/profile/me', token);
      assert.equal(me.status, 200, JSON.stringify(me.body));
      assert.equal(me.body.data.email, email);
    });
  } finally {
    await fixture.cleanup();
  }
});
