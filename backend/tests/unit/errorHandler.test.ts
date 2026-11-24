import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { Request, NextFunction } from 'express';
import { HttpError } from '../../src/helpers/errors.js';
import { errorHandler } from '../../src/middleware/errorHandler.js';
import { ErrorCode } from '../../src/types/errorCode.js';
import { makeRes } from '../helpers/fakes.js';

function handle(error: unknown) {
  const res = makeRes();
  errorHandler(error, {} as Request, res, (() => { throw new Error('next must not be called'); }) as NextFunction);
  return res;
}

describe('errorHandler', () => {
  it('A: HttpError(404, NOT_FOUND, "Missing") -> 404 {error:{code,message}}', () => {
    const res = handle(new HttpError(404, ErrorCode.NotFound, 'Missing'));
    assert.equal(res.statusCode, 404);
    assert.deepEqual(res.body, { error: { code: 'NOT_FOUND', message: 'Missing' } });
    assert.equal(res.locals.errorCode, 'NOT_FOUND');
  });

  it('B: HttpError(409, CONFLICT) keeps its own status', () => {
    const res = handle(new HttpError(409, ErrorCode.Conflict, 'Dup'));
    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.body, { error: { code: 'CONFLICT', message: 'Dup' } });
  });

  it('C: body-parser entity.parse.failed -> 400 INVALID_JSON', () => {
    const res = handle(Object.assign(new SyntaxError('Unexpected token'), { type: 'entity.parse.failed' }));
    assert.equal(res.statusCode, 400);
    assert.deepEqual(res.body, { error: { code: 'INVALID_JSON', message: 'Request body must be valid JSON.' } });
    assert.equal(res.locals.errorCode, 'INVALID_JSON');
  });

  it('D: body-parser entity.too.large -> 413 BODY_TOO_LARGE', () => {
    const res = handle(Object.assign(new Error('too big'), { type: 'entity.too.large' }));
    assert.equal(res.statusCode, 413);
    assert.deepEqual(res.body, { error: { code: 'BODY_TOO_LARGE', message: 'Request body is too large.' } });
    assert.equal(res.locals.errorCode, 'BODY_TOO_LARGE');
  });

  it('E: unknown Error("db password leaked") -> 500 INTERNAL_ERROR without the message', () => {
    const res = handle(new Error('db password leaked'));
    assert.equal(res.statusCode, 500);
    assert.deepEqual(res.body, { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' } });
    assert.equal(res.locals.errorCode, 'INTERNAL_ERROR');
  });

  it('F: non-Error values (undefined, string) -> 500 INTERNAL_ERROR', () => {
    for (const value of [undefined, null, 'boom']) {
      const res = handle(value);
      assert.equal(res.statusCode, 500);
      assert.equal(res.locals.errorCode, 'INTERNAL_ERROR');
    }
  });
});
