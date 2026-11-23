import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, it } from 'node:test';
import { campusActionParams } from '../../src/controllers/campus.controller.js';
import { CampusAction } from '../../src/types/domain.js';

describe('campus validation', () => {
  describe('campusActionParams', () => {
    it('accepts every supported CampusAction with a valid UUID', () => {
      const id = randomUUID();
      for (const action of Object.values(CampusAction)) {
        assert.equal(campusActionParams.parse({ action, id }).action, action);
      }
    });

    it('rejects unknown action values', () => {
      const id = randomUUID();
      assert.equal(campusActionParams.safeParse({ action: 'unknown', id }).success, false);
    });
  });
});
