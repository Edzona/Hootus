import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { signinSchema, signupSchema } from '../../src/controllers/auth.controller.js';

describe('auth validation', () => {
  it('normalizes email casing and whitespace across signin and signup', () => {
    assert.equal(signinSchema.parse({ email: ' Student@Temple.edu ' }).email, 'student@temple.edu');
    assert.equal(signupSchema.parse({ email: ' Student@Temple.edu ', name: 'Student' }).email, 'student@temple.edu');
  });

  describe('signinSchema', () => {
    it('accepts external partner emails', () => {
      assert.equal(signinSchema.safeParse({ email: 'partner@agency.jp' }).success, true);
    });
  });

  describe('signupSchema', () => {
    it('rejects non-Temple emails', () => {
      assert.equal(signupSchema.safeParse({ email: 'student@example.com', name: 'Outsider' }).success, false);
    });

    it('accepts valid Temple student signups', () => {
      assert.equal(signupSchema.safeParse({ email: 'student@temple.edu', name: 'Student' }).success, true);
    });
  });
});
