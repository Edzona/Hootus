import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { moderateFeedBody, moderateListingBody } from '../../src/controllers/admin.controller.js';
import { FeedPostKind, ListingStatus } from '../../src/types/domain.js';

describe('admin validation', () => {
  describe('moderateListingBody', () => {
    it('rejects empty bodies and unknown statuses', () => {
      assert.equal(moderateListingBody.safeParse({}).success, false);
      assert.equal(moderateListingBody.safeParse({ status: 'deleted' }).success, false);
    });

    it('accepts valid status changes', () => {
      assert.equal(moderateListingBody.safeParse({ status: ListingStatus.Closed }).success, true);
    });
  });

  describe('moderateFeedBody', () => {
    it('rejects empty bodies and kind changes', () => {
      assert.equal(moderateFeedBody.safeParse({}).success, false);
      assert.equal(moderateFeedBody.safeParse({ kind: FeedPostKind.Perk }).success, false);
    });

    it('accepts valid title updates', () => {
      assert.equal(moderateFeedBody.safeParse({ title: 'Edited' }).success, true);
    });
  });
});
