import '../helpers/unitEnv.js';
// Load dotenv once up front so a local .env cannot refill variables deleted below.
import 'dotenv/config';
import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

let counter = 0;
const keys = [
  'PORT', 'DATABASE_URL', 'SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY', 'NODE_ENV', 'CORS_ORIGINS',
  'NOTIFICATION_LINK_URL', 'PUBLIC_API_URL', 'CRON_SECRET', 'SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_FROM',
];
const saved = Object.fromEntries(keys.map(key => [key, process.env[key]]));
const base: Record<string, string> = {
  DATABASE_URL: 'postgres://hootus_server:secret@localhost:5432/postgres',
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_PUBLISHABLE_KEY: 'pk',
};

/** Imports a fresh copy of config/env.ts so its import-time parsing sees `vars` only. */
async function loadEnv(vars: Record<string, string>) {
  for (const key of keys) delete process.env[key];
  Object.assign(process.env, base, vars);
  counter += 1;
  const module = await import(`../../src/config/env.js?case=${counter}`) as typeof import('../../src/config/env.js');
  return module.env;
}

afterEach(() => {
  for (const key of keys) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe('config/env', () => {
  it('A: minimal valid env -> defaults applied', async () => {
    const env = await loadEnv({});
    assert.equal(env.PORT, 5000);
    assert.equal(env.NODE_ENV, 'development');
    assert.deepEqual(env.CORS_ORIGINS, ['http://localhost:5173']);
    assert.equal(env.NOTIFICATION_LINK_URL, 'http://localhost:5173/#/activity');
    assert.equal(env.PUBLIC_API_URL, 'http://localhost:5001');
    assert.equal(env.SMTP_PORT, 587);
    assert.equal(env.CRON_SECRET, undefined);
    assert.equal(env.SMTP_HOST, undefined);
  });

  it('B: PORT "8080" is coerced to a number', async () => {
    assert.equal((await loadEnv({ PORT: '8080' })).PORT, 8080);
  });

  for (const port of ['0', '70000', '1.5', 'abc']) {
    it(`C: PORT "${port}" -> throws naming only PORT`, async () => {
      await assert.rejects(loadEnv({ PORT: port }), { message: 'Invalid environment: PORT' });
    });
  }

  it('D: CORS_ORIGINS "http://a.test, http://b.test" -> trimmed list', async () => {
    assert.deepEqual((await loadEnv({ CORS_ORIGINS: 'http://a.test, http://b.test' })).CORS_ORIGINS, ['http://a.test', 'http://b.test']);
  });

  it('E: CORS_ORIGINS with a non-URL entry -> throws', async () => {
    await assert.rejects(loadEnv({ CORS_ORIGINS: 'http://a.test,nope' }), { message: 'Invalid environment: CORS_ORIGINS.1' });
  });

  it('F: DATABASE_URL with the postgres owner login -> throws naming DATABASE_URL, never the secret', async () => {
    await assert.rejects(
      loadEnv({ DATABASE_URL: 'postgres://postgres:topsecret@localhost:5432/postgres' }),
      (error: Error) => {
        assert.equal(error.message, 'Invalid environment: DATABASE_URL');
        assert.doesNotMatch(error.message, /topsecret/);
        return true;
      },
    );
  });

  it('G: DATABASE_URL with login "hootus_server.projectref" (pooler style) is accepted', async () => {
    const env = await loadEnv({ DATABASE_URL: 'postgresql://hootus_server.abcdef:pw@aws.pooler.test:6543/postgres' });
    assert.equal(env.DATABASE_URL, 'postgresql://hootus_server.abcdef:pw@aws.pooler.test:6543/postgres');
  });

  it('H: DATABASE_URL with login "hootus_server_admin" or a non-postgres protocol -> throws', async () => {
    await assert.rejects(loadEnv({ DATABASE_URL: 'postgres://hootus_server_admin:pw@localhost/db' }), { message: 'Invalid environment: DATABASE_URL' });
    await assert.rejects(loadEnv({ DATABASE_URL: 'mysql://hootus_server:pw@localhost/db' }), { message: 'Invalid environment: DATABASE_URL' });
  });

  it('I: missing SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY -> both named', async () => {
    for (const key of keys) delete process.env[key];
    process.env.DATABASE_URL = base.DATABASE_URL;
    counter += 1;
    await assert.rejects(
      import(`../../src/config/env.js?case=${counter}`),
      { message: 'Invalid environment: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY' },
    );
  });

  it('J: NODE_ENV outside development/test/production -> throws', async () => {
    await assert.rejects(loadEnv({ NODE_ENV: 'staging' }), { message: 'Invalid environment: NODE_ENV' });
  });

  it('K: CRON_SECRET "" -> undefined; 15 chars -> throws; 16 chars accepted', async () => {
    assert.equal((await loadEnv({ CRON_SECRET: '' })).CRON_SECRET, undefined);
    await assert.rejects(loadEnv({ CRON_SECRET: 'x'.repeat(15) }), { message: 'Invalid environment: CRON_SECRET' });
    assert.equal((await loadEnv({ CRON_SECRET: 'x'.repeat(16) })).CRON_SECRET, 'x'.repeat(16));
  });

  it('L: SMTP_HOST without SMTP_FROM -> throws naming SMTP_FROM', async () => {
    await assert.rejects(loadEnv({ SMTP_HOST: 'smtp.test' }), { message: 'Invalid environment: SMTP_FROM' });
  });

  it('M: SMTP_HOST with SMTP_FROM -> accepted; blank SMTP_USER becomes undefined', async () => {
    const env = await loadEnv({ SMTP_HOST: 'smtp.test', SMTP_FROM: 'a@b.test', SMTP_USER: '' });
    assert.equal(env.SMTP_HOST, 'smtp.test');
    assert.equal(env.SMTP_FROM, 'a@b.test');
    assert.equal(env.SMTP_USER, undefined);
  });

  it('N: blank SMTP_HOST is treated as disabled, so SMTP_FROM is not required', async () => {
    assert.equal((await loadEnv({ SMTP_HOST: '' })).SMTP_HOST, undefined);
  });

  it('O: SMTP_PORT "465" is coerced to a number', async () => {
    assert.equal((await loadEnv({ SMTP_PORT: '465' })).SMTP_PORT, 465);
  });
});
