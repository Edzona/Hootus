import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  campusActionBody, campusActionParams, campusClubParams, campusEventBody, campusMemberParams, campusPostBody,
  clubRequestBody, publishCampusEvent, publishCampusPost, updateClubBody, updateMemberBody,
} from '../../src/controllers/campus.controller.js';
import { CampusAction } from '../../src/types/domain.js';
import { invoke, makeReq, makeRes, unusedDb, uuid } from '../helpers/fakes.js';

describe('campus validation', () => {
  describe('campusActionParams', () => {
    it('accepts every supported CampusAction with a valid UUID', () => {
      for (const action of Object.values(CampusAction)) {
        assert.equal(campusActionParams.parse({ action, id: uuid(1) }).action, action);
      }
    });

    it('rejects unknown action values and non-uuid ids', () => {
      assert.equal(campusActionParams.safeParse({ action: 'unknown', id: uuid(1) }).success, false);
      assert.equal(campusActionParams.safeParse({ action: 'like', id: '1' }).success, false);
    });
  });

  describe('campusActionBody / campusClubParams', () => {
    it('requires a boolean active; requires a uuid clubId', () => {
      assert.deepEqual(campusActionBody.parse({ active: false }), { active: false });
      assert.equal(campusActionBody.safeParse({ active: 'true' }).success, false);
      assert.equal(campusClubParams.safeParse({ clubId: 'x' }).success, false);
    });
  });

  describe('campusPostBody', () => {
    it('trims text, defaults image_urls, accepts eventId', () => {
      assert.deepEqual(campusPostBody.parse({ text: ' hi ' }), { text: 'hi', image_urls: [] });
      assert.equal(campusPostBody.parse({ text: 'x', eventId: uuid(2) }).eventId, uuid(2));
    });

    it('rejects blank text, 10001 chars, non-uuid eventId and extra keys', () => {
      assert.equal(campusPostBody.safeParse({ text: '  ' }).success, false);
      assert.equal(campusPostBody.safeParse({ text: 'x'.repeat(10001) }).success, false);
      assert.equal(campusPostBody.safeParse({ text: 'x', eventId: 'e' }).success, false);
      assert.equal(campusPostBody.safeParse({ text: 'x', extra: 1 }).success, false);
    });
  });

  describe('campusEventBody', () => {
    const valid = {
      title: 'Movie night', starts_at: '2026-05-01T10:00:00+09:00', ends_at: '2026-05-01T12:00:00+09:00',
      location: 'Room 1', event_type: 'Screening',
    };

    it('applies defaults', () => {
      assert.deepEqual(campusEventBody.parse(valid), {
        ...valid, price: 'Free entry', poster: 'film', description: '', note: '', image_urls: [],
      });
    });

    it('rejects end equal to or before start with path ends_at', () => {
      for (const ends_at of ['2026-05-01T10:00:00+09:00', '2026-05-01T09:00:00+09:00']) {
        const result = campusEventBody.safeParse({ ...valid, ends_at });
        assert.equal(result.success, false);
        assert.deepEqual(result.error!.issues.map(issue => [issue.path, issue.message]), [[['ends_at'], 'End time must be after start time.']]);
      }
    });

    it('compares instants across offsets (10:00+09:00 == 01:00Z)', () => {
      assert.equal(campusEventBody.safeParse({ ...valid, ends_at: '2026-05-01T01:00:01Z' }).success, true);
      assert.equal(campusEventBody.safeParse({ ...valid, ends_at: '2026-05-01T01:00:00Z' }).success, false);
    });

    it('rejects datetimes without offset, unknown posters and empty location', () => {
      assert.equal(campusEventBody.safeParse({ ...valid, starts_at: '2026-05-01T10:00:00' }).success, false);
      assert.equal(campusEventBody.safeParse({ ...valid, poster: 'imax' }).success, false);
      assert.equal(campusEventBody.safeParse({ ...valid, location: '' }).success, false);
    });
  });

  describe('campusMemberParams / updateMemberBody', () => {
    it('requires two uuids', () => {
      assert.equal(campusMemberParams.safeParse({ clubId: uuid(1), memberId: uuid(2) }).success, true);
      assert.equal(campusMemberParams.safeParse({ clubId: uuid(1), memberId: 'm' }).success, false);
    });

    it('needs status or role; rejects pending status', () => {
      assert.equal(updateMemberBody.safeParse({}).success, false);
      assert.equal(updateMemberBody.safeParse({ status: 'pending' }).success, false);
      assert.deepEqual(updateMemberBody.parse({ status: 'approved' }), { status: 'approved' });
      assert.deepEqual(updateMemberBody.parse({ role: 'manager' }), { role: 'manager' });
      assert.equal(updateMemberBody.safeParse({ role: 'owner' }).success, false);
    });
  });

  describe('clubRequestBody', () => {
    const valid = {
      name: 'Film Club', description: 'We watch films.', handle: 'film', category: 'Music', verificationNote: 'Advisor: Dr Lee',
    };

    it('accepts a valid request with defaults', () => {
      assert.deepEqual(clubRequestBody.parse(valid), { ...valid, meeting: '', location: '' });
    });

    it('rejects a 4-character verification note and partner-only categories', () => {
      assert.equal(clubRequestBody.safeParse({ ...valid, verificationNote: 'abcd' }).success, false);
      assert.equal(clubRequestBody.safeParse({ ...valid, verificationNote: 'x'.repeat(501) }).success, false);
      assert.equal(clubRequestBody.safeParse({ ...valid, category: 'Real estate' }).success, false);
    });
  });

  describe('updateClubBody', () => {
    const valid = {
      name: 'Film Club', description: 'We watch films.', category: 'Music', mark: 'FC', color: 'plum',
    };

    it('accepts club and partner categories', () => {
      assert.equal(updateClubBody.safeParse(valid).success, true);
      assert.equal(updateClubBody.safeParse({ ...valid, category: 'Real estate' }).success, true);
      assert.equal(updateClubBody.safeParse({ ...valid, category: 'Casino' }).success, false);
    });

    it('limits mark to 1..4 characters and color to the palette', () => {
      assert.equal(updateClubBody.safeParse({ ...valid, mark: '' }).success, false);
      assert.equal(updateClubBody.safeParse({ ...valid, mark: 'ABCDE' }).success, false);
      assert.equal(updateClubBody.safeParse({ ...valid, color: 'pink' }).success, false);
    });
  });
});

describe('campus handlers', () => {
  describe('publishCampusPost', () => {
    it('foreign image URL -> 400 before any query', async () => {
      await assert.rejects(
        invoke(
          publishCampusPost,
          makeReq({ db: unusedDb }),
          makeRes({ params: { clubId: uuid(1) }, body: { text: 'x', image_urls: ['https://evil.test/a.jpg'] } }),
        ),
        { status: 400, code: 'INVALID_DATA' },
      );
    });
  });

  describe('publishCampusEvent', () => {
    const body = {
      title: 'Movie', starts_at: '2026-05-01T10:00:00+09:00', ends_at: '2026-05-01T12:00:00+09:00', location: 'Room 1',
      price: 'Free entry', event_type: 'Screening', poster: 'film', description: '', note: '',
      image_urls: ['https://evil.test/a.jpg'],
    };

    it('foreign image URL -> 400 before any query', async () => {
      await assert.rejects(
        invoke(publishCampusEvent, makeReq({ db: unusedDb }), makeRes({ params: { clubId: uuid(1) }, body })),
        { status: 400, code: 'INVALID_DATA' },
      );
    });
  });
});
