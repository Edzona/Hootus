import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  moderationContentBody, moderationContentParams, moderationContentQuery, moderationReportBody,
  moderationReportParams, reportBody, reportListQuery,
} from '../../src/controllers/moderation.controller.js';
import { ModerationTarget, ReportStatus } from '../../src/types/domain.js';
import { uuid } from '../helpers/fakes.js';

describe('moderation validation', () => {
  describe('reportBody', () => {
    it('accepts every ModerationTarget with a uuid and trimmed reason', () => {
      for (const kind of Object.values(ModerationTarget)) {
        assert.deepEqual(reportBody.parse({ kind, id: uuid(1), reason: ' spam ' }), { kind, id: uuid(1), reason: 'spam' });
      }
    });

    it('rejects unknown kind, non-uuid id, blank/501-char reason and extra keys', () => {
      assert.equal(reportBody.safeParse({ kind: 'user', id: uuid(1), reason: 'x' }).success, false);
      assert.equal(reportBody.safeParse({ kind: 'listing', id: '1', reason: 'x' }).success, false);
      assert.equal(reportBody.safeParse({ kind: 'listing', id: uuid(1), reason: '  ' }).success, false);
      assert.equal(reportBody.safeParse({ kind: 'listing', id: uuid(1), reason: 'x'.repeat(501) }).success, false);
      assert.equal(reportBody.safeParse({ kind: 'listing', id: uuid(1), reason: 'x', extra: 1 }).success, false);
    });
  });

  describe('reportListQuery', () => {
    it('accepts optional status with page defaults; rejects unknown status', () => {
      assert.deepEqual(reportListQuery.parse({}), { limit: 20, offset: 0 });
      assert.equal(reportListQuery.parse({ status: 'dismissed' }).status, ReportStatus.Dismissed);
      assert.equal(reportListQuery.safeParse({ status: 'closed' }).success, false);
    });
  });

  describe('moderationContentQuery', () => {
    it('requires kind; hidden "true"/"false" become booleans, other strings rejected', () => {
      assert.equal(moderationContentQuery.safeParse({}).success, false);
      assert.equal(moderationContentQuery.parse({ kind: 'listing', hidden: 'true' }).hidden, true);
      assert.equal(moderationContentQuery.parse({ kind: 'listing', hidden: 'false' }).hidden, false);
      assert.equal(moderationContentQuery.parse({ kind: 'listing' }).hidden, undefined);
      assert.equal(moderationContentQuery.safeParse({ kind: 'listing', hidden: 'yes' }).success, false);
    });
  });

  describe('params and bodies', () => {
    it('moderationReportParams requires a uuid', () => {
      assert.equal(moderationReportParams.safeParse({ id: uuid(1) }).success, true);
      assert.equal(moderationReportParams.safeParse({ id: 'x' }).success, false);
    });

    it('moderationContentParams requires a kind and a uuid', () => {
      assert.equal(moderationContentParams.safeParse({ kind: 'feed_post', id: uuid(1) }).success, true);
      assert.equal(moderationContentParams.safeParse({ kind: 'nope', id: uuid(1) }).success, false);
    });

    it('moderationReportBody only allows resolved or dismissed', () => {
      assert.deepEqual(moderationReportBody.parse({ status: 'resolved' }), { status: 'resolved' });
      assert.deepEqual(moderationReportBody.parse({ status: 'dismissed' }), { status: 'dismissed' });
      assert.equal(moderationReportBody.safeParse({ status: 'open' }).success, false);
    });

    it('moderationContentBody requires a boolean', () => {
      assert.deepEqual(moderationContentBody.parse({ hidden: true }), { hidden: true });
      assert.equal(moderationContentBody.safeParse({ hidden: 'true' }).success, false);
    });
  });
});
