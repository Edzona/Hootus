import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { UserRole } from '../../src/types/domain.js';

interface FixtureUser {
  id: string;
  publicId: string;
  token: string;
  email: string;
}

export const integrationOptions = { skip: process.env.RUN_INTEGRATION !== '1' };
export const authOptions = { persistSession: false, autoRefreshToken: false };

// Each feature owns its users and records, including when test files run in parallel.
export async function createIntegrationFixture() {
  const url = process.env.SUPABASE_URL!;
  assert(url && ['127.0.0.1', 'localhost'].includes(new URL(url).hostname),
    'Integration fixtures must only run against local Supabase');
  const ownerUrl = process.env.SQL_GENERATION_DATABASE_URL;
  assert(ownerUrl && ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(ownerUrl).hostname),
    'Set SQL_GENERATION_DATABASE_URL to your local Supabase database');
  const owner = postgres(ownerUrl, { max: 1, onnotice: () => {} });
  const ids: string[] = [];
  const clubIds: string[] = [];
  const users: Record<string, FixtureUser> = {};

  async function cleanup() {
    try {
      for (const id of clubIds) await owner`delete from public.clubs where public_id = ${id}`;
      // Cascades remove these fixtures' profiles, listings, and feed posts.
      for (const id of ids) await owner`delete from auth.users where id = ${id}`;
    } finally {
      await owner.end();
    }
  }

  try {
    for (const role of Object.values(UserRole)) {
      const email = `hootus-test-${randomUUID()}@temple.edu`;
      const client = createClient(url, process.env.SUPABASE_PUBLISHABLE_KEY!, { auth: authOptions });
      const { data, error } = await client.auth.signUp({
        email, password: `Test-${randomUUID()}!`,
        options: { data: { full_name: `Test ${role}`, role: UserRole.Admin } },
      });
      if (data.user) ids.push(data.user.id);
      assert.ifError(error);
      assert(data.user && data.session, 'Local Auth must return a fixture session');
      const [initial] = await owner`select role, public_id from public.profiles where auth_user_id = ${data.user.id}`;
      assert.equal(initial?.role, UserRole.Student, 'Signup metadata must not grant admin');
      if (role !== UserRole.Student) {
        await owner`update public.profiles set role = ${role} where auth_user_id = ${data.user.id}`;
      }
      users[role] = { id: data.user.id, publicId: initial.public_id, token: data.session.access_token, email };
    }
    return { url, owner, users, ids, clubIds, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}

// Read actual OTP email from local Mailpit; never print codes or sessions.
export async function emailedCode(email: string) {
  const config = await readFile(new URL('../../../supabase/config.toml', import.meta.url), 'utf8');
  const port = /\[local_smtp\][^[]*?\bport\s*=\s*(\d+)/.exec(config)?.[1] ?? '54324';
  const mailpit = process.env.MAILPIT_URL ?? `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 20; attempt++) {
    const found = await (await fetch(`${mailpit}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`)).json();
    const id = found.messages?.[0]?.ID;
    if (id) {
      const message = await (await fetch(`${mailpit}/api/v1/message/${id}`)).json();
      const code = />\s*(\d{6})\s*</.exec(message.HTML)?.[1];
      assert(code, 'Sign-in email contains a six-digit code');
      assert(!message.HTML.includes('/auth/v1/verify'), 'Sign-in email must not contain a magic link');
      return code;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  assert.fail('No sign-in email arrived for the test fixture');
}
