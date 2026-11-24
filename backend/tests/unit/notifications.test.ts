import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { notificationParams } from '../../src/controllers/notifications.controller.js';
import { uuid } from '../helpers/fakes.js';

describe('notificationParams', () => {
  it('requires a uuid notificationId and rejects extra keys', () => {
    assert.equal(notificationParams.safeParse({ notificationId: uuid(1) }).success, true);
    assert.equal(notificationParams.safeParse({ notificationId: '1' }).success, false);
    assert.equal(notificationParams.safeParse({ notificationId: uuid(1), x: 1 }).success, false);
  });
});
