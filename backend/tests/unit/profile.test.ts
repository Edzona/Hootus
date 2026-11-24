import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getMyProfile, profileUpdateSchema, updateMyProfile } from '../../src/controllers/profile.controller.js';
import { getMyProfile, profileUpdateSchema, updateMyProfile } from '../../src/controllers/profile.controller.js';
import { invoke, makeReq, makeRes, testUser, unusedDb } from '../helpers/fakes.js';

const folder = `http://localhost:54321/storage/v1/object/public/avatars/${testUser.authUserId}/`;
const file = '123e4567-e89b-12d3-a456-426614174000.png';
const invalidAvatar = { status: 400, code: 'INVALID_DATA', message: 'Upload your profile photo before saving it.' };

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

    it('accepts a 500-character bio and email_digest alone', () => {
      assert.equal(profileUpdateSchema.safeParse({ bio: 'x'.repeat(500) }).success, true);
      assert.deepEqual(profileUpdateSchema.parse({ email_digest: false }), { email_digest: false });
    });

    it('accepts bio null on its own (clear) but rejects bio undefined on its own (no change)', () => {
      assert.deepEqual(profileUpdateSchema.parse({ bio: null }), { bio: null });
      assert.equal(profileUpdateSchema.safeParse({ bio: undefined }).success, false);
    });

    it('rejects non-URL and 501-character avatar_url, non-boolean digest and unknown keys', () => {
      assert.equal(profileUpdateSchema.safeParse({ avatar_url: 'not a url' }).success, false);
      assert.equal(profileUpdateSchema.safeParse({ avatar_url: `https://a.test/${'x'.repeat(500)}` }).success, false);
      assert.equal(profileUpdateSchema.safeParse({ email_digest: 'yes' }).success, false);
      assert.equal(profileUpdateSchema.safeParse({ bio: 'x', role: 'admin' }).success, false);
    });
  });
});

describe('getMyProfile', () => {
  it('unauthenticated -> 401', async () => {
    await assert.rejects(invoke(getMyProfile, makeReq({ user: null })), { status: 401 });
  });
});

describe('updateMyProfile', () => {
  for (const [label, url] of [
    ['another user\'s folder', `http://localhost:54321/storage/v1/object/public/avatars/33333333-3333-4333-8333-333333333333/${file}`],
    ['listing-photos bucket', `http://localhost:54321/storage/v1/object/public/listing-photos/${file}`],
    ['foreign host', `https://evil.test/storage/v1/object/public/avatars/${testUser.authUserId}/${file}`],
    ['gif extension', `${folder}123e4567-e89b-12d3-a456-426614174000.gif`],
    ['nested path', `${folder}sub/${file}`],
    ['short file name', `${folder}a.png`],
  ] as const) {
    it(`avatar from ${label} -> 400 INVALID_DATA and no query`, async () => {
      await assert.rejects(
        invoke(updateMyProfile, makeReq({ db: unusedDb }), makeRes({ body: { avatar_url: url } })),
        invalidAvatar,
      );
    });
  }
});
