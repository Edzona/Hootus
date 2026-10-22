import { createTestApi } from './helpers/api.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { signinSchema, signupSchema } from '../src/controllers/auth.controller.js';
import { ErrorCode } from '../src/types/errorCode.js';
import { UserRole } from '../src/types/domain.js';
import { createIntegrationFixture, integrationOptions, emailedCode, authOptions } from './helpers/fixtures.js';

const { call } = createTestApi();

test('email-code requests normalize Temple emails and reject redirects and extra fields', () => {
  assert.equal(signinSchema.parse({ email: ' Student@Temple.edu ' }).email, 'student@temple.edu');
  for (const body of [{ email: 'student@example.com' }, { email: 'student@temple.edu', redirectTo: 'https://evil.example' }]) {
    assert.equal(signinSchema.safeParse(body).success, false);
  }
  assert.equal(signupSchema.safeParse({ email: 'student@temple.edu', name: 'Student', studentId: '012345678' }).success, true);
});

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
    await t.test('signup handles existing emails and duplicate student IDs without echoing account details', async () => {
      const studentId = String(Math.floor(Math.random() * 900000000) + 100000000);
      await owner`update public.profiles set student_id = ${studentId} where auth_user_id = ${users[UserRole.Student].id}`;
      // Auth rate-limits repeat requests per email, so send one request for it.
      const existing = await call('/api/auth/signup', undefined, {
        email: users[UserRole.Student].email.toUpperCase(), name: 'Another student',
        studentId: '900000002',
      });
      assert.equal(existing.status, 202, JSON.stringify(existing.body));
      const duplicate = await call('/api/auth/signup', undefined, {
        email: `duplicate-${randomUUID()}@temple.edu`, name: 'Duplicate test',
        studentId,
      });
      assert.equal(duplicate.status, 502);
      assert.equal(duplicate.body.error.code, ErrorCode.AuthRequestFailed);
      assert(!JSON.stringify(duplicate.body).includes(users[UserRole.Student].email));
    });
    await t.test('sign-in keeps account existence private and does not create unknown users', async () => {
      const email = `missing-${randomUUID()}@temple.edu`;
      const unknown = await call('/api/auth/signin', undefined, { email });
      assert.equal(unknown.status, 202);
      const [record] = await owner`select count(*)::int as count from auth.users where email = ${email}`;
      assert.equal(record.count, 0);
      const existing = await call('/api/auth/signin', undefined, { email: users[UserRole.Admin].email });
      assert.deepEqual(existing.body, unknown.body);
      const client = createClient(fixture.url, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth: authOptions });
      const verified = await client.auth.verifyOtp({ email: users[UserRole.Admin].email, token: await emailedCode(users[UserRole.Admin].email), type: 'email' });
      assert(!verified.error && verified.data.session, 'Existing accounts can verify an email code');
      assert.equal((await call('/api/profile/me', verified.data.session.access_token)).status, 200);
    });
    await t.test('signup creates a profile and verifies a one-time email code', async () => {
      const email = `signup-${randomUUID()}@temple.edu`;
      const body = {
        email, name: 'Signup test', studentId: String(Math.floor(Math.random() * 900000000) + 100000000),
      };
      assert.equal((await call('/api/auth/signup', undefined, { ...body, redirectTo: 'https://evil.example' })).status, 400);
      const result = await call('/api/auth/signup', undefined, body);
      // Find any created fixture before asserting, so finally can remove it.
      const [profile] = await owner`select auth_user_id from public.profiles where email = ${email}`;
      if (profile) ids.push(profile.auth_user_id);
      assert.equal(result.status, 202, JSON.stringify(result.body));
      assert(profile);
      const code = await emailedCode(email);
      const client = createClient(fixture.url, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth: authOptions });
      const invalid = code === '000000' ? '000001' : '000000';
      assert((await client.auth.verifyOtp({ email, token: invalid, type: 'email' })).error);
      const verified = await client.auth.verifyOtp({ email, token: code, type: 'email' });
      assert(!verified.error && verified.data.session, 'Correct email code creates a session');
      const token = verified.data.session.access_token;
      assert((await client.auth.verifyOtp({ email, token: code, type: 'email' })).error, 'Codes cannot be reused');
      const me = await call('/api/profile/me', token);
      assert.equal(me.status, 200, JSON.stringify(me.body));
      assert.equal(me.body.data.email, email);
    });
  } finally {
    await fixture.cleanup();
  }
});
