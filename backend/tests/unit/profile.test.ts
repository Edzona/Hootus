import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { profileUpdateSchema } from '../../src/controllers/profile.controller.js';

describe('profile validation', () => {
  describe('profileUpdateSchema', () => {
    it('trims bio and normalizes blank bio to null', () => {
      assert.equal(profileUpdateSchema.parse({ bio: '  Hello  ' }).bio, 'Hello');
      assert.equal(profileUpdateSchema.parse({ bio: '   ' }).bio, null);
    });

    it('accepts clearing avatar_url', () => {
      assert.equal(profileUpdateSchema.parse({ avatar_url: null }).avatar_url, null);
    });

    it('rejects empty bodies and oversized bios', () => {
      assert.equal(profileUpdateSchema.safeParse({}).success, false);
      assert.equal(profileUpdateSchema.safeParse({ bio: 'x'.repeat(501) }).success, false);
    });
  });
});
