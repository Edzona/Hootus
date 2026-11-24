import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { sql } from '../../src/config/database.js';
import { env } from '../../src/config/env.js';
import { runDigest, unsubscribeDigest, unsubscribeQuerySchema } from '../../src/controllers/digest.controller.js';
import { signUnsubscribeToken } from '../../src/helpers/digest.js';
import { invoke, makeReq, makeRes, uuid } from '../helpers/fakes.js';

afterEach(() => mock.restoreAll());

describe('unsubscribeQuerySchema', () => {
  it('accepts a 1..300 character token', () => {
    assert.deepEqual(unsubscribeQuerySchema.parse({ token: 'x' }), { token: 'x' });
    assert.equal(unsubscribeQuerySchema.safeParse({ token: 'x'.repeat(300) }).success, true);
  });

  it('rejects empty, 301-character, missing tokens and unknown keys', () => {
    assert.equal(unsubscribeQuerySchema.safeParse({ token: '' }).success, false);
    assert.equal(unsubscribeQuerySchema.safeParse({ token: 'x'.repeat(301) }).success, false);
    assert.equal(unsubscribeQuerySchema.safeParse({}).success, false);
    assert.equal(unsubscribeQuerySchema.safeParse({ token: 'x', extra: 1 }).success, false);
  });
});

describe('runDigest', () => {
  const secret = env.CRON_SECRET!;
  const call = (authorization?: string) =>
    invoke(runDigest, makeReq({ user: null, headers: authorization === undefined ? {} : { authorization } }));

  it('A: CRON_SECRET not configured -> 503 FEATURE_DISABLED', async () => {
    const previous = env.CRON_SECRET;
    (env as Record<string, unknown>).CRON_SECRET = undefined;
    try {
      await assert.rejects(call(`Bearer ${secret}`), { status: 503, code: 'FEATURE_DISABLED', message: 'Digest cron is not configured.' });
    } finally {
      (env as Record<string, unknown>).CRON_SECRET = previous;
    }
  });

  for (const [label, header] of [
    ['missing header', undefined],
    ['Basic scheme', `Basic ${secret}`],
    ['wrong secret of the same length', `Bearer ${'x'.repeat(secret.length)}`],
    ['shorter secret', 'Bearer short'],
    ['longer secret', `Bearer ${secret}extra`],
    ['bare secret without scheme', secret],
    ['lowercase scheme', `bearer ${secret}`],
  ] as [string, string | undefined][]) {
    it(`B: ${label} -> 401 UNAUTHORIZED`, async () => {
      await assert.rejects(call(header), { status: 401, code: 'UNAUTHORIZED', message: 'Invalid cron authorization.' });
    });
  }
});

describe('unsubscribeDigest', () => {
  const run = (token: string) => invoke(unsubscribeDigest, makeReq({ user: null }), makeRes({ query: { token } }));

  for (const [label, token] of [
    ['garbage', 'garbage'],
    ['tampered mac', `${signUnsubscribeToken(uuid(1))}x`],
    ['token signed with another secret', signUnsubscribeToken(uuid(1), 'another-secret-12345678')],
  ] as const) {
    it(`B: ${label} -> 400 "Invalid unsubscribe link" HTML and no database call`, async () => {
      const begin = mock.method(sql, 'begin', (async () => {
        throw new Error('Unexpected database call in unit test');
      }) as never);
      const { res } = await run(token);
      assert.equal(res.statusCode, 400);
      assert.equal(res.contentType, 'html');
      assert.match(res.sent as string, /<h1>Invalid unsubscribe link<\/h1>/);
      assert.equal(begin.mock.callCount(), 0);
    });
  }
});
