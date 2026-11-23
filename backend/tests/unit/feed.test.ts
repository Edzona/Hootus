import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { feedSchema } from '../../src/controllers/feed.controller.js';
import { FeedPostKind } from '../../src/types/domain.js';

describe('feed validation', () => {
  describe('feedSchema', () => {
    it('rejects unknown feed kinds', () => {
      assert.equal(feedSchema.safeParse({ kind: 'unknown', title: 'Post' }).success, false);
    });

    it('rejects club events missing event details', () => {
      assert.equal(feedSchema.safeParse({ kind: FeedPostKind.ClubEvent, title: 'Missing event details' }).success, false);
    });

    it('rejects perks missing business details', () => {
      assert.equal(feedSchema.safeParse({ kind: FeedPostKind.Perk, title: 'Missing business' }).success, false);
    });
  });
});
