import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createFeedPost, feedSchema } from '../../src/controllers/feed.controller.js';
import { FeedPostKind, UserRole } from '../../src/types/domain.js';
import { invoke, makeReq, makeRes, unusedDb } from '../helpers/fakes.js';

const clubEvent = { kind: FeedPostKind.ClubEvent, title: 'Meetup', room_number: 'R1', meeting_time: '2026-05-01T10:00:00+09:00' };
const perk = { kind: FeedPostKind.Perk, title: 'Coffee', business_name: 'Cafe' };

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

    it('A: club_event input -> defaults body "" and image_urls []', () => {
      assert.deepEqual(feedSchema.parse(clubEvent), { ...clubEvent, body: '', image_urls: [] });
    });

    it('B: perk with optional coupon and expiry -> parsed and trimmed', () => {
      const parsed = feedSchema.parse({ ...perk, coupon_code: ' SAVE10 ', expires_at: '2026-06-01T00:00:00Z' });
      assert.deepEqual(parsed, { ...perk, body: '', image_urls: [], coupon_code: 'SAVE10', expires_at: '2026-06-01T00:00:00Z' });
    });

    it('C: meeting_time without an offset is rejected', () => {
      assert.equal(feedSchema.safeParse({ ...clubEvent, meeting_time: '2026-05-01T10:00:00' }).success, false);
    });

    it('D: fields of the other kind are rejected (strict)', () => {
      assert.equal(feedSchema.safeParse({ ...clubEvent, business_name: 'Cafe' }).success, false);
      assert.equal(feedSchema.safeParse({ ...perk, room_number: 'R1' }).success, false);
    });

    it('E: title and length limits', () => {
      assert.equal(feedSchema.safeParse({ ...perk, title: '   ' }).success, false);
      assert.equal(feedSchema.safeParse({ ...perk, title: 'x'.repeat(201) }).success, false);
      assert.equal(feedSchema.safeParse({ ...perk, body: 'x'.repeat(10001) }).success, false);
      assert.equal(feedSchema.safeParse({ ...perk, coupon_code: 'x'.repeat(101) }).success, false);
    });
  });
});

describe('createFeedPost', () => {
  for (const role of [UserRole.Partner, UserRole.Student, UserRole.Moderator]) {
    it(`${role} posting club_event -> 403 FORBIDDEN without querying`, async () => {
      const body = feedSchema.parse(clubEvent);
      await assert.rejects(
        invoke(createFeedPost, makeReq({ db: unusedDb, user: { role } }), makeRes({ body })),
        { status: 403, code: 'FORBIDDEN', message: 'Your role cannot publish this type of feed post.' },
      );
    });
  }

  it('foreign image URL -> 400 before any query', async () => {
    const body = feedSchema.parse({ ...perk, image_urls: ['https://evil.test/a.png'] });
    await assert.rejects(
      invoke(createFeedPost, makeReq({ db: unusedDb, user: { role: UserRole.Admin } }), makeRes({ body })),
      { status: 400, code: 'INVALID_DATA' },
    );
  });

  it('unauthenticated -> 401', async () => {
    await assert.rejects(
      invoke(createFeedPost, makeReq({ user: null }), makeRes({ body: feedSchema.parse(perk) })),
      { status: 401 },
    );
  });
});
