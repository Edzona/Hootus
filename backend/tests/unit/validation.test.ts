import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { IDatabaseConnection } from '@pgtyped/runtime';
import {
  assertOwnsPhotos, extractPhotoNames, imageUrlsSchema, orgDescriptionSchema, orgHandleSchema,
  orgNameSchema, orgTextSchema, pageSchema, photosNotUploaded,
} from '../../src/helpers/validation.js';

const bucket = 'http://localhost:54321/storage/v1/object/public/listing-photos/';
const photoA = '123e4567-e89b-12d3-a456-426614174000';
const photoB = '123e4567-e89b-12d3-a456-426614174001';

describe('pageSchema', () => {
  it('A: {} -> {limit:20, offset:0}', () => {
    assert.deepEqual(pageSchema.parse({}), { limit: 20, offset: 0 });
  });

  it('B: {limit:"5", offset:"10"} -> numbers 5 and 10', () => {
    assert.deepEqual(pageSchema.parse({ limit: '5', offset: '10' }), { limit: 5, offset: 10 });
  });

  it('C: boundaries 1/100 and 0/100000 are accepted', () => {
    assert.deepEqual(pageSchema.parse({ limit: 1, offset: 0 }), { limit: 1, offset: 0 });
    assert.deepEqual(pageSchema.parse({ limit: 100, offset: 100000 }), { limit: 100, offset: 100000 });
  });

  for (const bad of [{ limit: 0 }, { limit: 101 }, { limit: 1.5 }, { offset: -1 }, { offset: 100001 }, { limit: 'abc' }, { extra: 1 }]) {
    it(`D: ${JSON.stringify(bad)} -> rejected`, () => {
      assert.equal(pageSchema.safeParse(bad).success, false);
    });
  }
});

describe('orgHandleSchema', () => {
  it('A: " club_1 " -> "club_1"', () => {
    assert.equal(orgHandleSchema.parse(' club_1 '), 'club_1');
  });

  for (const bad of ['a', 'x'.repeat(41), 'bad handle', 'dash-ed', 'ünï']) {
    it(`B: ${JSON.stringify(bad)} -> rejected`, () => {
      assert.equal(orgHandleSchema.safeParse(bad).success, false);
    });
  }

  it('C: 2 and 40 characters are accepted', () => {
    assert.equal(orgHandleSchema.safeParse('ab').success, true);
    assert.equal(orgHandleSchema.safeParse('x'.repeat(40)).success, true);
  });
});

describe('orgDescriptionSchema', () => {
  it('A: trims and accepts 10..1000 characters', () => {
    assert.equal(orgDescriptionSchema.parse('  1234567890  '), '1234567890');
    assert.equal(orgDescriptionSchema.safeParse('x'.repeat(1000)).success, true);
  });

  it('B: 9 and 1001 characters are rejected', () => {
    assert.equal(orgDescriptionSchema.safeParse('x'.repeat(9)).success, false);
    assert.equal(orgDescriptionSchema.safeParse('x'.repeat(1001)).success, false);
  });
});

describe('orgNameSchema', () => {
  it('A: " Film " -> "Film"; 2..100 accepted', () => {
    assert.equal(orgNameSchema.parse(' Film '), 'Film');
    assert.equal(orgNameSchema.safeParse('x'.repeat(100)).success, true);
  });

  it('B: 1 and 101 characters rejected', () => {
    assert.equal(orgNameSchema.safeParse('x').success, false);
    assert.equal(orgNameSchema.safeParse('x'.repeat(101)).success, false);
  });
});

describe('orgTextSchema', () => {
  it('A: undefined -> "" default; " hi " -> "hi"', () => {
    assert.equal(orgTextSchema.parse(undefined), '');
    assert.equal(orgTextSchema.parse(' hi '), 'hi');
  });

  it('B: 121 characters rejected, 120 accepted', () => {
    assert.equal(orgTextSchema.safeParse('x'.repeat(121)).success, false);
    assert.equal(orgTextSchema.safeParse('x'.repeat(120)).success, true);
  });
});

describe('imageUrlsSchema', () => {
  it('A: undefined -> []', () => {
    assert.deepEqual(imageUrlsSchema.parse(undefined), []);
  });

  it('B: http and https URLs accepted', () => {
    const urls = ['http://a.test/x.png', 'https://b.test/y.png'];
    assert.deepEqual(imageUrlsSchema.parse(urls), urls);
  });

  it('C: ftp URL, non-URL and 11 URLs rejected', () => {
    assert.equal(imageUrlsSchema.safeParse(['ftp://a.test/x.png']).success, false);
    assert.equal(imageUrlsSchema.safeParse(['not a url']).success, false);
    assert.equal(imageUrlsSchema.safeParse(Array.from({ length: 11 }, () => 'https://a.test/x.png')).success, false);
  });

  it('D: exactly 10 URLs accepted', () => {
    assert.equal(imageUrlsSchema.safeParse(Array.from({ length: 10 }, () => 'https://a.test/x.png')).success, true);
  });
});

describe('photosNotUploaded', () => {
  it('returns 400 INVALID_DATA "Upload your photos before posting."', () => {
    const error = photosNotUploaded();
    assert.deepEqual([error.status, error.code, error.message], [400, 'INVALID_DATA', 'Upload your photos before posting.']);
  });
});

describe('extractPhotoNames', () => {
  const rejected = { status: 400, code: 'INVALID_DATA', message: 'Upload your photos before posting.' };

  it('A: [] -> []', () => {
    assert.deepEqual(extractPhotoNames([]), []);
  });

  it('B: two bucket URLs -> their file names in order', () => {
    assert.deepEqual(
      extractPhotoNames([`${bucket}${photoA}.jpg`, `${bucket}${photoB}.webp`]),
      [`${photoA}.jpg`, `${photoB}.webp`],
    );
  });

  it('C: png extension accepted', () => {
    assert.deepEqual(extractPhotoNames([`${bucket}${photoA}.png`]), [`${photoA}.png`]);
  });

  for (const [label, url] of [
    ['foreign host', `https://evil.test/storage/v1/object/public/listing-photos/${photoA}.jpg`],
    ['other bucket', `http://localhost:54321/storage/v1/object/public/avatars/${photoA}.jpg`],
    ['gif extension', `${bucket}${photoA}.gif`],
    ['short name', `${bucket}abc.jpg`],
    ['nested path', `${bucket}folder/${photoA}.jpg`],
    ['empty name', bucket],
  ] as const) {
    it(`D: ${label} -> throws 400 INVALID_DATA`, () => {
      assert.throws(() => extractPhotoNames([url]), rejected);
    });
  }

  it('E: one bad URL among good ones rejects the batch', () => {
    assert.throws(() => extractPhotoNames([`${bucket}${photoA}.jpg`, 'https://x.test/a.jpg']), rejected);
  });
});

describe('assertOwnsPhotos', () => {
  it('A: [] -> resolves without querying', async () => {
    const tx: IDatabaseConnection = {
      query: async () => {
        throw new Error('Unexpected database call in unit test');
      },
    };
    await assertOwnsPhotos([], tx);
  });
});
