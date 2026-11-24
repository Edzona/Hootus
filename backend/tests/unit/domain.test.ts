import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  allCategories, ClubCategory, clubCategories, ClubColor, EventPoster, MemberRole, PartnerCategory,
  partnerCategories, ReviewStatus,
} from '../../src/types/clubOptions.js';
import {
  CampusAction, FeedPostKind, ListingCategory, ListingStatus, ModerationTarget, ReportStatus, UserRole,
} from '../../src/types/domain.js';
import { listingCategorySchema, userRoleSchema } from '../../src/types/domainSchemas.js';
import { ErrorCode } from '../../src/types/errorCode.js';

describe('domain types', () => {
  describe('enums', () => {
    it('preserve expected wire values', () => {
      // Literal expectations intentionally pin the existing API/SQL contract.
      assert.deepEqual(Object.values(UserRole), ['student', 'club_leader', 'partner', 'admin', 'moderator']);
      assert.deepEqual(Object.values(ListingCategory), ['sales', 'housing', 'gigs']);
      assert.deepEqual(Object.values(ListingStatus), ['active', 'sold', 'closed']);
      assert.deepEqual(Object.values(FeedPostKind), ['club_event', 'perk']);
      assert.deepEqual(Object.values(CampusAction), ['follow', 'like', 'save', 'rsvp']);
      assert.deepEqual(Object.values(ModerationTarget), ['listing', 'feed_post', 'club_post']);
      assert.deepEqual(Object.values(ReportStatus), ['open', 'resolved', 'dismissed']);
    });

    it('club option enums preserve wire values', () => {
      assert.deepEqual(Object.values(ClubCategory), ['Arts & culture', 'Outdoors', 'Careers', 'Music', 'Academic', 'Sports', 'Other']);
      assert.deepEqual(Object.values(PartnerCategory), ['Real estate', 'Local business', 'Campus partner', 'Other']);
      assert.deepEqual(Object.values(ClubColor), ['plum', 'forest', 'blue', 'gold', 'rose']);
      assert.deepEqual(Object.values(EventPoster), ['film', 'photo', 'outdoor']);
      assert.deepEqual(Object.values(MemberRole), ['member', 'manager']);
      assert.deepEqual(Object.values(ReviewStatus), ['pending', 'approved', 'rejected']);
    });

    it('ErrorCode wire values stay stable', () => {
      assert.deepEqual(Object.values(ErrorCode).sort(), [
        'AUTH_RATE_LIMITED', 'AUTH_REQUEST_FAILED', 'AUTH_UNAVAILABLE', 'BODY_TOO_LARGE', 'CONFLICT', 'DATABASE_ERROR',
        'FEATURE_DISABLED', 'FORBIDDEN', 'INTERNAL_ERROR', 'INVALID_DATA', 'INVALID_JSON', 'INVALID_REDIRECT',
        'NOT_FOUND', 'ORIGIN_NOT_ALLOWED', 'PROFILE_REQUIRED', 'UNAUTHORIZED', 'VALIDATION_ERROR',
      ]);
    });
  });

  describe('category lists', () => {
    it('clubCategories and partnerCategories list every enum value', () => {
      assert.deepEqual(clubCategories, Object.values(ClubCategory));
      assert.deepEqual(partnerCategories, Object.values(PartnerCategory));
    });

    it('allCategories is the de-duplicated union (Other appears once)', () => {
      assert.deepEqual(allCategories, [
        'Arts & culture', 'Outdoors', 'Careers', 'Music', 'Academic', 'Sports', 'Other',
        'Real estate', 'Local business', 'Campus partner',
      ]);
    });
  });

  describe('userRoleSchema', () => {
    it('accepts every UserRole member', () => {
      for (const role of Object.values(UserRole)) {
        assert.equal(userRoleSchema.parse(role), role);
      }
    });

    it('rejects unknown, null and wrongly cased roles', () => {
      assert.equal(userRoleSchema.safeParse('super_admin').success, false);
      assert.equal(userRoleSchema.safeParse(null).success, false);
      assert.equal(userRoleSchema.safeParse('Admin').success, false);
    });
  });

  describe('listingCategorySchema', () => {
    it('accepts every ListingCategory and rejects others', () => {
      for (const category of Object.values(ListingCategory)) {
        assert.equal(listingCategorySchema.parse(category), category);
      }
      assert.equal(listingCategorySchema.safeParse('cars').success, false);
    });
  });
});
