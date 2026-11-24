import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { assertAuthenticated } from '../../src/helpers/auth.js';
import { withAuthor } from '../../src/helpers/authors.js';
import { HttpError } from '../../src/helpers/errors.js';
import { makeReq, unusedDb } from '../helpers/fakes.js';

describe('assertAuthenticated', () => {
  const unauthorized = { status: 401, code: 'UNAUTHORIZED', message: 'Authentication is required.' };

  it('A: no user, with db -> throws 401 UNAUTHORIZED', () => {
    assert.throws(() => assertAuthenticated(makeReq({ user: null, db: unusedDb })), unauthorized);
  });

  it('B: user, no db -> throws 401 UNAUTHORIZED', () => {
    assert.throws(() => assertAuthenticated(makeReq({})), (error: unknown) => {
      assert.equal(error instanceof HttpError, true);
      assert.deepEqual({ status: (error as HttpError).status, code: (error as HttpError).code, message: (error as HttpError).message }, unauthorized);
      return true;
    });
  });

  it('C: user and db -> returns without throwing', () => {
    assert.doesNotThrow(() => assertAuthenticated(makeReq({ db: unusedDb })));
  });
});

describe('withAuthor', () => {
  it('A: {id, author_name:"Ann"} -> {id, author:{name:"Ann"}} without author_name', () => {
    const result = withAuthor({ id: '1', author_name: 'Ann' });
    assert.deepEqual(result, { id: '1', author: { name: 'Ann' } });
    assert.equal('author_name' in result, false);
  });

  it('B: author_name null -> author:{name:null}', () => {
    assert.deepEqual(withAuthor({ id: '2', author_name: null }), { id: '2', author: { name: null } });
  });

  it('C: does not mutate the input row', () => {
    const row = { id: '3', author_name: 'Bo' };
    withAuthor(row);
    assert.deepEqual(row, { id: '3', author_name: 'Bo' });
  });
});
