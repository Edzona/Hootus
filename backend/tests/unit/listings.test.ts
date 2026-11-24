import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createListing, listingSchema, listingsQuery, listingStatusBody, listingStatusParams, updateListing,
} from '../../src/controllers/listings.controller.js';
import { ListingCategory } from '../../src/types/domain.js';
import { invoke, makeReq, makeRes, unusedDb, uuid } from '../helpers/fakes.js';

describe('listings validation', () => {
  describe('listingSchema', () => {
    it('accepts every supported ListingCategory', () => {
      for (const category of Object.values(ListingCategory)) {
        assert.equal(listingSchema.parse({ category, title: 'Desk' }).category, category);
      }
    });

    it('rejects unknown categories', () => {
      assert.equal(listingSchema.safeParse({ category: 'unknown', title: 'Desk' }).success, false);
    });

    it('applies defaults: description "" and image_urls []', () => {
      assert.deepEqual(listingSchema.parse({ category: 'sales', title: ' Desk ' }), {
        category: 'sales', title: 'Desk', description: '', image_urls: [],
      });
    });

    it('price: 0, 5000 and null accepted; negative, fractional, huge and string rejected', () => {
      for (const price_jpy of [0, 5000, null, Number.MAX_SAFE_INTEGER]) {
        assert.equal(listingSchema.safeParse({ category: 'sales', title: 'T', price_jpy }).success, true);
      }
      for (const price_jpy of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1, '100']) {
        assert.equal(listingSchema.safeParse({ category: 'sales', title: 'T', price_jpy }).success, false);
      }
    });

    it('rejects blank title, 201-char title, 301-char location and extra keys', () => {
      assert.equal(listingSchema.safeParse({ category: 'sales', title: '  ' }).success, false);
      assert.equal(listingSchema.safeParse({ category: 'sales', title: 'x'.repeat(201) }).success, false);
      assert.equal(listingSchema.safeParse({ category: 'sales', title: 'T', location: 'x'.repeat(301) }).success, false);
      assert.equal(listingSchema.safeParse({ category: 'sales', title: 'T', status: 'sold' }).success, false);
    });
  });

  describe('listingsQuery', () => {
    it('A: category "sales,gigs" -> ["sales","gigs"] with page defaults', () => {
      assert.deepEqual(listingsQuery.parse({ category: 'sales,gigs' }), { limit: 20, offset: 0, category: ['sales', 'gigs'] });
    });

    it('B: no category -> undefined', () => {
      assert.equal(listingsQuery.parse({}).category, undefined);
    });

    it('C: "bogus", "sales,bogus" and "" rejected', () => {
      for (const category of ['bogus', 'sales,bogus', '']) {
        assert.equal(listingsQuery.safeParse({ category }).success, false, category);
      }
    });
  });

  describe('listingStatusParams / listingStatusBody', () => {
    it('requires a uuid id; allows only sold or closed', () => {
      assert.equal(listingStatusParams.safeParse({ id: uuid(1) }).success, true);
      assert.equal(listingStatusParams.safeParse({ id: 'x' }).success, false);
      assert.deepEqual(listingStatusBody.parse({ status: 'sold' }), { status: 'sold' });
      assert.deepEqual(listingStatusBody.parse({ status: 'closed' }), { status: 'closed' });
      assert.equal(listingStatusBody.safeParse({ status: 'active' }).success, false);
    });
  });
});

describe('listings handlers', () => {
  const body = { category: 'sales', title: 'Desk', description: '', image_urls: ['https://evil.test/x.jpg'], price_jpy: 2500, location: 'Lobby' };

  it('createListing rejects foreign image URL before any query', async () => {
    await assert.rejects(
      invoke(createListing, makeReq({ db: unusedDb }), makeRes({ body })),
      { status: 400, code: 'INVALID_DATA' },
    );
  });

  it('updateListing rejects foreign image URL before any query', async () => {
    await assert.rejects(
      invoke(updateListing, makeReq({ db: unusedDb }), makeRes({ params: { id: uuid(1) }, body })),
      { status: 400, code: 'INVALID_DATA' },
    );
  });
});
