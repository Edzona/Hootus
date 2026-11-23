import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CampusAction, FeedPostKind, ListingCategory, UserRole } from '../../src/types/domain.js';
import { userRoleSchema } from '../../src/types/domainSchemas.js';

describe('domain types', () => {
  describe('enums', () => {
    it('preserve expected wire values', () => {
      // Literal expectations intentionally pin the existing API/SQL contract.
      assert.deepEqual(Object.values(UserRole), ['student', 'club_leader', 'partner', 'admin', 'moderator']);
      assert.deepEqual(Object.values(ListingCategory), ['sales', 'housing', 'gigs']);
      assert.deepEqual(Object.values(FeedPostKind), ['club_event', 'perk']);
      assert.deepEqual(Object.values(CampusAction), ['follow', 'like', 'save', 'rsvp']);
    });
  });

  describe('userRoleSchema', () => {
    it('accepts every UserRole member', () => {
      for (const role of Object.values(UserRole)) {
        assert.equal(userRoleSchema.parse(role), role);
      }
    });

    it('rejects unknown and null roles', () => {
      assert.equal(userRoleSchema.safeParse('super_admin').success, false);
      assert.equal(userRoleSchema.safeParse(null).success, false);
    });
  });
});
