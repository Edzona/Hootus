import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { listingSchema } from '../../src/controllers/listings.controller.js';
import { ListingCategory } from '../../src/types/domain.js';

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
  });
});
