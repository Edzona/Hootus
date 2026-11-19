import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CampusAction, FeedPostKind, ListingCategory, UserRole } from '../src/types/domain.js';
import { userRoleSchema } from '../src/types/domainSchemas.js';

test('domain enums preserve wire values and reject unknown roles', () => {
  // Literal expectations intentionally pin the existing API/SQL contract.
  assert.deepEqual(Object.values(UserRole), ['student', 'club_leader', 'partner', 'admin', 'moderator']);
  assert.deepEqual(Object.values(ListingCategory), ['sales', 'housing', 'gigs']);
  assert.deepEqual(Object.values(FeedPostKind), ['club_event', 'perk']);
  assert.deepEqual(Object.values(CampusAction), ['follow', 'like', 'save', 'rsvp']);
  for (const role of Object.values(UserRole)) assert.equal(userRoleSchema.parse(role), role);
  assert.equal(userRoleSchema.safeParse('super_admin').success, false);
  assert.equal(userRoleSchema.safeParse(null).success, false);
});
