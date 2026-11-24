import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { supabase } from '../../src/config/supabase.js';
import { signin, signinSchema, signup, signupSchema } from '../../src/controllers/auth.controller.js';
import { invoke, makeReq, makeRes } from '../helpers/fakes.js';

// createPublicClient() builds a fresh client each call; stub the shared prototype method.
const authPrototype = Object.getPrototypeOf(supabase.auth) as { signInWithOtp: unknown };

function stubOtp(result: unknown) {
  return mock.method(authPrototype, 'signInWithOtp', (async () => result) as never);
}

afterEach(() => mock.restoreAll());

describe('auth validation', () => {
  it('normalizes email casing and whitespace across signin and signup', () => {
    assert.equal(signinSchema.parse({ email: ' Student@Temple.edu ' }).email, 'student@temple.edu');
    assert.equal(signupSchema.parse({ email: ' Student@Temple.edu ', name: 'Student' }).email, 'student@temple.edu');
  });

  describe('signinSchema', () => {
    it('accepts external partner emails', () => {
      assert.equal(signinSchema.safeParse({ email: 'partner@agency.jp' }).success, true);
    });

    it('rejects invalid emails, missing emails and extra keys', () => {
      assert.equal(signinSchema.safeParse({ email: 'nope' }).success, false);
      assert.equal(signinSchema.safeParse({}).success, false);
      assert.equal(signinSchema.safeParse({ email: 'a@b.jp', name: 'x' }).success, false);
    });
  });

  describe('signupSchema', () => {
    it('rejects non-Temple emails', () => {
      assert.equal(signupSchema.safeParse({ email: 'student@example.com', name: 'Outsider' }).success, false);
    });

    it('rejects look-alike Temple domains', () => {
      assert.equal(signupSchema.safeParse({ email: 'x@temple.edu.attacker.com', name: 'X' }).success, false);
      assert.equal(signupSchema.safeParse({ email: 'x@mail.temple.edu', name: 'X' }).success, false);
      assert.equal(signupSchema.safeParse({ email: 'x@nottemple.edu', name: 'X' }).success, false);
    });

    it('accepts valid Temple student signups', () => {
      assert.equal(signupSchema.safeParse({ email: 'student@temple.edu', name: 'Student' }).success, true);
    });

    it('trims the name; rejects empty and 151-character names', () => {
      assert.equal(signupSchema.parse({ email: 'a@temple.edu', name: '  Ann  ' }).name, 'Ann');
      assert.equal(signupSchema.safeParse({ email: 'a@temple.edu', name: '   ' }).success, false);
      assert.equal(signupSchema.safeParse({ email: 'a@temple.edu', name: 'x'.repeat(151) }).success, false);
      assert.equal(signupSchema.safeParse({ email: 'a@temple.edu', name: 'x'.repeat(150) }).success, true);
    });
  });
});

describe('signup', () => {
  const body = { email: 'ann@temple.edu', name: 'Ann' };
  const run = () => invoke(signup, makeReq({ user: null }), makeRes({ body }));

  it('A: success -> 202 message and OTP requested with full_name', async () => {
    const otp = stubOtp({ error: null });
    const { res } = await run();
    assert.equal(res.statusCode, 202);
    assert.deepEqual(res.body, { data: { message: 'Check your Temple email for a sign-in code.' } });
    assert.deepEqual(otp.mock.calls[0].arguments, [{ email: 'ann@temple.edu', options: { data: { full_name: 'Ann' } } }]);
  });

  it('B: status 429 -> 429 AUTH_RATE_LIMITED', async () => {
    stubOtp({ error: { status: 429, code: 'x' } });
    await assert.rejects(run(), { status: 429, code: 'AUTH_RATE_LIMITED', message: 'Please wait a minute before requesting another sign-in code.' });
  });

  it('C: code over_email_send_rate_limit -> 429 AUTH_RATE_LIMITED', async () => {
    stubOtp({ error: { status: 400, code: 'over_email_send_rate_limit' } });
    await assert.rejects(run(), { status: 429, code: 'AUTH_RATE_LIMITED' });
  });

  it('D: any other error -> 502 AUTH_REQUEST_FAILED with a generic message', async () => {
    stubOtp({ error: { status: 500, code: 'unexpected_failure', message: 'smtp secret' } });
    await assert.rejects(run(), (error: { status: number; code: string; message: string }) => {
      assert.equal(error.status, 502);
      assert.equal(error.code, 'AUTH_REQUEST_FAILED');
      assert.doesNotMatch(error.message, /smtp secret/);
      return true;
    });
  });

  it('E: error without code or status -> 502 AUTH_REQUEST_FAILED', async () => {
    stubOtp({ error: {} });
    await assert.rejects(run(), { status: 502, code: 'AUTH_REQUEST_FAILED' });
  });
});

describe('signin', () => {
  const body = { email: 'ann@agency.jp' };
  const run = () => invoke(signin, makeReq({ user: null }), makeRes({ body }));
  const accepted = { data: { message: 'If you have an account, check your Temple email for a sign-in code.' } };

  it('A: success -> 202 and OTP requested with shouldCreateUser:false', async () => {
    const otp = stubOtp({ error: null });
    const { res } = await run();
    assert.equal(res.statusCode, 202);
    assert.deepEqual(res.body, accepted);
    assert.deepEqual(otp.mock.calls[0].arguments, [{ email: 'ann@agency.jp', options: { shouldCreateUser: false } }]);
  });

  for (const code of ['user_not_found', 'otp_disabled']) {
    it(`B: error code ${code} -> still 202 (account existence stays private)`, async () => {
      stubOtp({ error: { status: 400, code } });
      const { res } = await run();
      assert.equal(res.statusCode, 202);
      assert.deepEqual(res.body, accepted);
    });
  }

  it('C: rate limit -> 429 AUTH_RATE_LIMITED', async () => {
    stubOtp({ error: { status: 429, code: 'over_request_rate_limit' } });
    await assert.rejects(run(), { status: 429, code: 'AUTH_RATE_LIMITED' });
  });

  it('D: any other error -> 502 AUTH_REQUEST_FAILED', async () => {
    stubOtp({ error: { status: 500, code: 'boom' } });
    await assert.rejects(run(), { status: 502, code: 'AUTH_REQUEST_FAILED' });
  });
});
