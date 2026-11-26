import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  adminClubBody, adminIdParams, adminUsersQuery, assignReport, assignReportBody, createPartnerBody, getUsers,
  moderateFeedBody, moderateListingBody, reviewClubRequestBody, setUserRole, setUserRoleBody, transferClubFounderBody,
} from '../../src/controllers/admin.controller.js';
import { ClubCategory, FeedPostKind, ListingStatus, PartnerCategory, UserRole } from '../../src/types/domain.js';
import { invoke, makeReq, makeRes, testUser, unusedDb, uuid } from '../helpers/fakes.js';

describe('admin validation', () => {
  describe('adminIdParams', () => {
    it('accepts a uuid, rejects other ids and extra keys', () => {
      assert.deepEqual(adminIdParams.parse({ id: uuid(1) }), { id: uuid(1) });
      assert.equal(adminIdParams.safeParse({ id: '12' }).success, false);
      assert.equal(adminIdParams.safeParse({ id: uuid(1), extra: 1 }).success, false);
    });
  });

  describe('adminUsersQuery', () => {
    it('accepts optional search and role filters with page defaults', () => {
      assert.deepEqual(adminUsersQuery.parse({}), { limit: 20, offset: 0 });
      assert.deepEqual(adminUsersQuery.parse({ search: ' sam ', role: 'moderator' }),
        { limit: 20, offset: 0, search: 'sam', role: UserRole.Moderator });
      for (const role of Object.values(UserRole)) assert.equal(adminUsersQuery.safeParse({ role }).success, true);
    });

    it('rejects unknown roles, blank or 101-char search, and extra keys', () => {
      assert.equal(adminUsersQuery.safeParse({ role: 'root' }).success, false);
      assert.equal(adminUsersQuery.safeParse({ search: '' }).success, false);
      assert.equal(adminUsersQuery.safeParse({ search: '   ' }).success, false);
      assert.equal(adminUsersQuery.safeParse({ search: 'x'.repeat(101) }).success, false);
      assert.equal(adminUsersQuery.safeParse({ email: 'a@b.jp' }).success, false);
    });
  });

  describe('assignReportBody', () => {
    it('accepts a uuid assignee or null; rejects missing, invalid and extra keys', () => {
      assert.deepEqual(assignReportBody.parse({ assigneeId: uuid(2) }), { assigneeId: uuid(2) });
      assert.deepEqual(assignReportBody.parse({ assigneeId: null }), { assigneeId: null });
      assert.equal(assignReportBody.safeParse({}).success, false);
      assert.equal(assignReportBody.safeParse({ assigneeId: 'x' }).success, false);
      assert.equal(assignReportBody.safeParse({ assigneeId: uuid(2), extra: 1 }).success, false);
    });
  });

  describe('setUserRoleBody', () => {
    it('accepts every UserRole and rejects unknown roles or extra keys', () => {
      for (const role of Object.values(UserRole)) assert.deepEqual(setUserRoleBody.parse({ role }), { role });
      assert.equal(setUserRoleBody.safeParse({ role: 'root' }).success, false);
      assert.equal(setUserRoleBody.safeParse({ role: 'admin', x: 1 }).success, false);
    });
  });

  describe('moderateListingBody', () => {
    it('rejects empty bodies and unknown statuses', () => {
      assert.equal(moderateListingBody.safeParse({}).success, false);
      assert.equal(moderateListingBody.safeParse({ status: 'deleted' }).success, false);
    });

    it('accepts valid status changes, trims text and enforces limits', () => {
      assert.equal(moderateListingBody.safeParse({ status: ListingStatus.Closed }).success, true);
      assert.deepEqual(moderateListingBody.parse({ title: ' New ', description: ' d ' }), { title: 'New', description: 'd' });
      assert.equal(moderateListingBody.safeParse({ title: '' }).success, false);
      assert.equal(moderateListingBody.safeParse({ title: 'x'.repeat(201) }).success, false);
      assert.equal(moderateListingBody.safeParse({ description: 'x'.repeat(10001) }).success, false);
    });
  });

  describe('moderateFeedBody', () => {
    it('rejects empty bodies and kind changes', () => {
      assert.equal(moderateFeedBody.safeParse({}).success, false);
      assert.equal(moderateFeedBody.safeParse({ kind: FeedPostKind.Perk }).success, false);
    });

    it('accepts valid title updates and allows a blank body', () => {
      assert.equal(moderateFeedBody.safeParse({ title: 'Edited' }).success, true);
      assert.deepEqual(moderateFeedBody.parse({ body: '   ' }), { body: '' });
    });
  });

  describe('reviewClubRequestBody', () => {
    it('accepts approved/rejected only', () => {
      assert.deepEqual(reviewClubRequestBody.parse({ decision: 'approved' }), { decision: 'approved' });
      assert.deepEqual(reviewClubRequestBody.parse({ decision: 'rejected', note: ' no ' }), { decision: 'rejected', note: 'no' });
      assert.equal(reviewClubRequestBody.safeParse({ decision: 'pending' }).success, false);
      assert.equal(reviewClubRequestBody.safeParse({ decision: 'approved', note: 'x'.repeat(501) }).success, false);
    });
  });

  describe('createPartnerBody', () => {
    const valid = {
      email: ' Owner@Shop.JP ', contactName: ' Mia ', orgName: 'Shop', handle: 'shop_1',
      category: PartnerCategory.LocalBusiness, description: 'A nice local shop.',
    };

    it('lowercases and trims the email and applies text defaults', () => {
      assert.deepEqual(createPartnerBody.parse(valid), {
        email: 'owner@shop.jp', contactName: 'Mia', orgName: 'Shop', handle: 'shop_1',
        category: 'Local business', description: 'A nice local shop.', hours: '', location: '',
      });
    });

    it('rejects a bad email, unknown category, empty contact and extra keys', () => {
      assert.equal(createPartnerBody.safeParse({ ...valid, email: 'nope' }).success, false);
      assert.equal(createPartnerBody.safeParse({ ...valid, category: 'Casino' }).success, false);
      assert.equal(createPartnerBody.safeParse({ ...valid, contactName: '' }).success, false);
      assert.equal(createPartnerBody.safeParse({ ...valid, extra: 1 }).success, false);
    });
  });

  describe('adminClubBody', () => {
    const valid = {
      name: 'Film Club', handle: 'film', category: ClubCategory.Music, description: 'We watch films.', founderId: uuid(9),
    };

    it('accepts a valid club with defaults, rejects non-uuid founder and partner-only categories', () => {
      assert.deepEqual(adminClubBody.parse(valid), { ...valid, meeting: '', location: '' });
      assert.equal(adminClubBody.safeParse({ ...valid, founderId: 'x' }).success, false);
      assert.equal(adminClubBody.safeParse({ ...valid, category: 'Real estate' }).success, false);
    });
  });

  describe('transferClubFounderBody', () => {
    it('requires a uuid memberId', () => {
      assert.deepEqual(transferClubFounderBody.parse({ memberId: uuid(3) }), { memberId: uuid(3) });
      assert.equal(transferClubFounderBody.safeParse({ memberId: '3' }).success, false);
    });
  });
});

describe('admin handlers', () => {
  describe('getUsers', () => {
    it('unauthenticated -> 401', async () => {
      await assert.rejects(invoke(getUsers, makeReq({ user: null }), makeRes({ query: { limit: 1, offset: 0 } })), { status: 401 });
    });
  });

  describe('assignReport', () => {
    it('unauthenticated -> 401', async () => {
      await assert.rejects(
        invoke(assignReport, makeReq({ user: null, db: unusedDb }),
          makeRes({ params: { id: uuid(5) }, body: { assigneeId: uuid(2) } })),
        { status: 401 },
      );
    });
  });

  describe('setUserRole', () => {
    const locals = (id: string) => ({ params: { id }, body: { role: 'moderator' } });

    it('own id -> 409 CONFLICT and no query', async () => {
      await assert.rejects(
        invoke(setUserRole, makeReq({ db: unusedDb }), makeRes(locals(testUser.id))),
        { status: 409, code: 'CONFLICT', message: 'Admins cannot change their own role.' },
      );
    });

    it('own id in upper case -> 409 CONFLICT', async () => {
      await assert.rejects(
        invoke(setUserRole, makeReq({ db: unusedDb }), makeRes(locals(testUser.id.toUpperCase()))),
        { status: 409, code: 'CONFLICT' },
      );
    });
  });
});
