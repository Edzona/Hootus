import { ErrorCode } from '../src/types/errorCode.js';
import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import type { Server } from 'node:http';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';
import { FeedPostKind, ListingCategory, UserRole, userRoleSchema } from '../src/types/domain.js';

// Public-route tests also work without local environment files.
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_PUBLISHABLE_KEY ||= 'test-public-key';
process.env.DATABASE_URL ||= 'postgres://hootus_server:unused@127.0.0.1:54322/postgres';
process.env.CORS_ORIGINS ||= 'http://localhost:5173';
const { default: app } = await import('../src/app.js');
const { sql, withUser } = await import('../src/config/database.js');
const { feedSchema } = await import('../src/controllers/feed.controller.js');
const { listingSchema } = await import('../src/controllers/listings.controller.js');
let server: Server;
let base: string;

async function call(path: string, token?: string, body?: unknown, headers = {}) {
  const response = await fetch(`${base}${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: response.status, body: await response.json(), headers: response.headers };
}

// Local Auth sends mail to Mailpit; follow its link to get the session a user would get.
async function emailedAccessToken(email: string) {
  // The inbox port comes from the committed config so every developer shares it.
  const config = await readFile(new URL('../../supabase/config.toml', import.meta.url), 'utf8');
  const port = /\[local_smtp\][^[]*?\bport\s*=\s*(\d+)/.exec(config)?.[1] ?? '54324';
  const mailpit = process.env.MAILPIT_URL ?? `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 20; attempt++) {
    const found = await (await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
    const id = found.messages?.[0]?.ID;
    if (id) {
      const message = await (await fetch(`${mailpit}/api/v1/message/${id}`)).json();
      const link = /https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]+/.exec(`${message.HTML} ${message.Text}`)?.[0];
      assert(link, 'Sign-in email contains a verification link');
      const verified = await fetch(link.replaceAll('&amp;', '&'), { redirect: 'manual' });
      const token = new URLSearchParams(new URL(verified.headers.get('location')!).hash.slice(1)).get('access_token');
      assert(token, 'Verification redirects with a session');
      return token;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.fail(`No sign-in email arrived for ${email}`);
}

before(async () => {
  server = await new Promise<Server>(resolve => {
    const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
  });
  const address = server.address();
  assert(address && typeof address !== 'string');
  base = `http://127.0.0.1:${address.port}`;
});
after(async () => {
  await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  await sql.end();
});

test('domain enums preserve wire values and reject unknown cases', () => {
  // Literal expectations intentionally pin the existing API/SQL contract.
  assert.deepEqual(Object.values(UserRole), ['student', 'club_leader', 'admin']);
  assert.deepEqual(Object.values(ListingCategory), ['sales', 'housing', 'gigs']);
  assert.deepEqual(Object.values(FeedPostKind), ['club_event', 'perk']);
  for (const role of Object.values(UserRole)) assert.equal(userRoleSchema.parse(role), role);
  assert.equal(userRoleSchema.safeParse('super_admin').success, false);
  assert.equal(userRoleSchema.safeParse(null).success, false);
  for (const category of Object.values(ListingCategory)) {
    assert.equal(listingSchema.parse({ category, title: 'Desk' }).category, category);
  }
  assert.equal(listingSchema.safeParse({ category: 'unknown', title: 'Desk' }).success, false);
  assert.equal(feedSchema.safeParse({ kind: 'unknown', title: 'Post' }).success, false);
  assert.equal(feedSchema.safeParse({ kind: FeedPostKind.ClubEvent, title: 'Missing event details' }).success, false);
  assert.equal(feedSchema.safeParse({ kind: FeedPostKind.Perk, title: 'Missing business' }).success, false);
});

test('health, protected routes, CORS, JSON errors and 404s', async () => {
  assert.equal((await call('/health')).status, 200);
  assert.equal((await call('/api/health')).status, 200);
  for (const path of ['/api/profile/me', '/api/listings', '/api/feed']) {
    assert.equal((await call(path)).status, 401);
  }
  assert.equal((await call('/missing')).status, 404);
  assert.equal((await call('/health', undefined, undefined, { Origin: 'https://untrusted.example' })).status, 403);
  const allowed = await call('/health', undefined, undefined, { Origin: 'http://localhost:5173' });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  const invalidJson = await fetch(`${base}/api/listings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(invalidJson.status, 400);
  assert.equal((await invalidJson.json()).error.code, ErrorCode.InvalidJson);
  assert.equal((await call('/api/auth/signup', undefined, {
    email: 'outsider@example.com', name: 'Test', studentId: '123',
    redirectTo: 'http://127.0.0.1:5173',
  })).status, 400);
});

test('local Supabase: auth, ownership, validation, roles and persistence', {
  skip: process.env.RUN_INTEGRATION !== '1',
}, async t => {
  const url = process.env.SUPABASE_URL!;
  assert(['127.0.0.1', 'localhost'].includes(new URL(url).hostname),
    'Integration fixtures must only run against local Supabase');
  const auth = { persistSession: false, autoRefreshToken: false };
  // Fixture access uses the local database owner, the same local-only URL as SQL generation.
  const ownerUrl = process.env.SQL_GENERATION_DATABASE_URL;
  assert(ownerUrl && ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(ownerUrl).hostname),
    'Set SQL_GENERATION_DATABASE_URL to your local Supabase database');
  const owner = postgres(ownerUrl, { max: 1, onnotice: () => {} });
  const ids: string[] = [];
  const users: Record<string, { id: string; publicId: string; token: string; email: string }> = {};
  try {
    for (const role of Object.values(UserRole)) {
      const email = `hootus-test-${randomUUID()}@temple.edu`;
      const password = `Test-${randomUUID()}!`;
      const client = createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth });
      // Local Auth does not require email confirmation, so signUp returns a session.
      const { data, error } = await client.auth.signUp({
        email, password, options: { data: { full_name: `Test ${role}`, role: UserRole.Admin } },
      });
      assert.ifError(error);
      assert(data.user && data.session);
      ids.push(data.user.id);
      const [initial] = await owner`select role, public_id from public.profiles where auth_user_id = ${data.user.id}`;
      assert.equal(initial?.role, UserRole.Student, 'Signup metadata must not grant admin');
      if (role !== UserRole.Student) {
        await owner`update public.profiles set role = ${role} where auth_user_id = ${data.user.id}`;
      }
      users[role] = { id: data.user.id, publicId: initial.public_id, token: data.session.access_token, email };
    }
    await t.test('invalid tokens are rejected and own profile is returned', async () => {
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
      const result = await call('/api/profile/me', users[UserRole.Student].token);
      assert.equal(result.status, 200);
      assert.equal(result.body.data.id, users[UserRole.Student].publicId);
      assert.equal(result.body.data.role, UserRole.Student);
      assert.notEqual(result.body.data.id, users[UserRole.Student].id);
      assert(!('auth_user_id' in result.body.data));
      assert(!('internal_id' in result.body.data));
    });
    await t.test('browser tokens cannot read or write application tables', async () => {
      for (const token of [undefined, users[UserRole.Student].token, users[UserRole.Admin].token]) {
        const browser = createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          auth, ...(token ? { global: { headers: { Authorization: `Bearer ${token}` } } } : {}),
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
    await t.test('database rejects duplicate profile emails even through privileged writes', async () => {
      await assert.rejects(owner`
        update public.profiles set email = ${users[UserRole.Student].email.toUpperCase()}
        where auth_user_id = ${users[UserRole.Admin].id}
      `, { code: '23505' });
      const [original] = await owner`select email from public.profiles where auth_user_id = ${users[UserRole.Admin].id}`;
      assert.equal(original.email, users[UserRole.Admin].email);
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
    await t.test('listing validation rejects spoofed ownership and negative prices', async () => {
      for (const body of [
        { category: ListingCategory.Sales, title: 'Desk', author_id: users[UserRole.Admin].id },
        { category: ListingCategory.Sales, title: 'Desk', price_jpy: -1 },
      ]) assert.equal((await call('/api/listings', users[UserRole.Student].token, body)).status, 400);
      assert.equal((await call('/api/listings?limit=101', users[UserRole.Student].token)).status, 400);
    });
    await t.test('student creates and reads a persisted listing', async () => {
      const result = await call('/api/listings', users[UserRole.Student].token, {
        category: ListingCategory.Sales, title: 'Integration test desk', price_jpy: 1500,
        image_urls: ['https://example.com/desk.jpg'],
      });
      assert.equal(result.status, 201, JSON.stringify(result.body));
      assert.deepEqual(result.body.data.author, { name: 'Test student' });
      assert(!('author_id' in result.body.data));
      const [stored] = await owner`select price_jpy from public.listings where public_id = ${result.body.data.id}`;
      assert.equal(Number(stored.price_jpy), 1500);
      assert.equal(result.body.data.price_jpy, 1500);
      assert.deepEqual(result.body.data.image_urls, ['https://example.com/desk.jpg']);
      const otherReader = await call('/api/listings?limit=100', users[UserRole.ClubLeader].token);
      assert.equal(otherReader.status, 200);
      const listing = otherReader.body.data.find((row: { id: string }) => row.id === result.body.data.id);
      assert.deepEqual(listing.author, { name: 'Test student' });
      assert(!('author_id' in listing));
      assert(!JSON.stringify(listing).includes(users[UserRole.Student].publicId));
      assert(!JSON.stringify(listing).includes(users[UserRole.Student].id));
      assert.match(listing.id, /^[0-9a-f-]{36}$/);
      assert(!('public_id' in listing));
    });
    const event = { kind: FeedPostKind.ClubEvent, title: 'Test event', room_number: '301', meeting_time: '2026-11-01T18:00:00+09:00' };
    const perk = { kind: FeedPostKind.Perk, title: 'Test perk', business_name: 'Test shop' };
    await t.test('feed role checks enforce events versus admin perks', async () => {
      assert.equal((await call('/api/feed', users[UserRole.Student].token, event)).status, 403);
      assert.equal((await call('/api/feed', users[UserRole.Student].token, perk)).status, 403);
      const created = await call('/api/feed', users[UserRole.ClubLeader].token, event);
      assert.equal(created.status, 201);
      assert.deepEqual(created.body.data.author, { name: 'Test club_leader' });
      assert(!('author_id' in created.body.data));
      const feed = await call('/api/feed', users[UserRole.Student].token);
      assert.equal(feed.status, 200);
      const post = feed.body.data.find((row: { id: string }) => row.id === created.body.data.id);
      assert.deepEqual(post.author, { name: 'Test club_leader' });
      assert(!('author_id' in post));
      assert(!JSON.stringify(post).includes(users[UserRole.ClubLeader].publicId));
      assert.equal((await call('/api/feed', users[UserRole.ClubLeader].token, perk)).status, 403);
      assert.equal((await call('/api/feed', users[UserRole.Admin].token, perk)).status, 201);
      assert.equal((await call('/api/feed', users[UserRole.Admin].token, event)).status, 201);
      assert.equal((await call('/api/feed', users[UserRole.Admin].token, { ...event, meeting_time: 'tomorrow' })).status, 400);
    });
    await t.test('role changes take effect with the existing token', async () => {
      await owner`update public.profiles set role = ${UserRole.Student} where auth_user_id = ${users[UserRole.ClubLeader].id}`;
      assert.equal((await call('/api/feed', users[UserRole.ClubLeader].token, event)).status, 403);
    });
  } finally {
    // FK cascades remove the profiles and all test listings and feed posts.
    for (const id of ids) await owner`delete from auth.users where id = ${id}`;
    await owner.end();
  }
});
