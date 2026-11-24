import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { databaseError, forbidden, HttpError, notFound } from '../../src/helpers/errors.js';
import { ErrorCode } from '../../src/types/errorCode.js';

function thrownBy(work: () => unknown): unknown {
  try {
    work();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('errors helpers', () => {
  describe('HttpError', () => {
    it('keeps status, code and message and is an Error', () => {
      const error = new HttpError(418, ErrorCode.Conflict, 'teapot');
      assert.equal(error instanceof Error, true);
      assert.equal(error.status, 418);
      assert.equal(error.code, ErrorCode.Conflict);
      assert.equal(error.message, 'teapot');
    });
  });

  describe('notFound', () => {
    it('A: "Gone" -> 404 NOT_FOUND "Gone"', () => {
      const error = notFound('Gone');
      assert.deepEqual([error.status, error.code, error.message], [404, 'NOT_FOUND', 'Gone']);
    });
  });

  describe('forbidden', () => {
    it('A: "Nope" -> 403 FORBIDDEN "Nope"', () => {
      const error = forbidden('Nope');
      assert.deepEqual([error.status, error.code, error.message], [403, 'FORBIDDEN', 'Nope']);
    });
  });

  describe('databaseError', () => {
    const cases: [string, number, string, string][] = [
      ['42501', 403, 'FORBIDDEN', 'This operation is not allowed.'],
      ['23505', 409, 'CONFLICT', 'This record already exists.'],
      ['23514', 400, 'INVALID_DATA', 'The supplied data is invalid.'],
      ['23503', 400, 'INVALID_DATA', 'The supplied data is invalid.'],
      ['23502', 400, 'INVALID_DATA', 'The supplied data is invalid.'],
      ['22P02', 400, 'INVALID_DATA', 'The supplied data is invalid.'],
      ['XX000', 502, 'DATABASE_ERROR', 'The database request failed.'],
      ['', 502, 'DATABASE_ERROR', 'The database request failed.'],
    ];
    for (const [code, status, errorCode, message] of cases) {
      it(`Postgres code "${code}" -> ${status} ${errorCode}`, () => {
        const error = thrownBy(() => databaseError({ code })) as HttpError;
        assert.equal(error instanceof HttpError, true);
        assert.deepEqual([error.status, error.code, error.message], [status, errorCode, message]);
      });
    }
  });
});
