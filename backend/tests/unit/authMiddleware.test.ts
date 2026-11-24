import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { afterEach, describe, it, mock } from 'node:test';
import { supabase } from '../../src/config/supabase.js';
import { requireAuth, requireRole } from '../../src/middleware/auth.js';
import { UserRole } from '../../src/types/domain.js';
import { invoke, makeReq, unusedDb, uuid } from '../helpers/fakes.js';

const authUid = uuid(2);

function stubClaims(result: unknown) {
  return mock.method(supabase.auth, 'getClaims', (async () => result) as never);
}

afterEach(() => mock.restoreAll());

describe('requireAuth', () => {
  const rejects = (headers: Record<string, string>, expected: object) =>
    assert.rejects(invoke(requireAuth, makeReq({ user: null, headers })), expected);

  for (const [label, headers] of [
    ['no Authorization header', {}],
    ['Basic scheme', { authorization: 'Basic abc' }],
    ['Bearer without token', { authorization: 'Bearer' }],
    ['Bearer with two tokens', { authorization: 'Bearer a b' }],
  ] as [string, Record<string, string>][]) {
    it(`A: ${label} -> 401 UNAUTHORIZED "A Bearer token is required."`, async () => {
      const spy = stubClaims({ data: null, error: null });
      await rejects(headers, { status: 401, code: 'UNAUTHORIZED', message: 'A Bearer token is required.' });
      assert.equal(spy.mock.callCount(), 0);
    });
  }

  it('B: getClaims error with status 503 -> 503 AUTH_UNAVAILABLE', async () => {
    stubClaims({ data: null, error: { status: 503, name: 'AuthApiError' } });
    await rejects({ authorization: 'Bearer t' }, { status: 503, code: 'AUTH_UNAVAILABLE', message: 'Authentication is temporarily unavailable.' });
  });

  it('C: getClaims AuthRetryableFetchError without status -> 503 AUTH_UNAVAILABLE', async () => {
    stubClaims({ data: null, error: { name: 'AuthRetryableFetchError' } });
    await rejects({ authorization: 'Bearer t' }, { status: 503, code: 'AUTH_UNAVAILABLE' });
  });

  it('D: getClaims error with status 401 -> 401 "Your session is invalid or expired."', async () => {
    stubClaims({ data: null, error: { status: 401, name: 'AuthApiError' } });
    await rejects({ authorization: 'Bearer t' }, { status: 401, code: 'UNAUTHORIZED', message: 'Your session is invalid or expired.' });
  });

  it('E: no data and no error -> 401', async () => {
    stubClaims({ data: null, error: null });
    await rejects({ authorization: 'Bearer t' }, { status: 401, code: 'UNAUTHORIZED' });
  });

  it('F: claims with role "anon" -> 401', async () => {
    stubClaims({ data: { claims: { sub: authUid, role: 'anon' } }, error: null });
    await rejects({ authorization: 'Bearer t' }, { status: 401, code: 'UNAUTHORIZED', message: 'Your session is invalid or expired.' });
  });

  it('G: claims without sub -> 401', async () => {
    stubClaims({ data: { claims: { role: 'authenticated' } }, error: null });
    await rejects({ authorization: 'Bearer t' }, { status: 401, code: 'UNAUTHORIZED' });
  });

  it('K: lowercase "bearer" scheme is accepted', async () => {
    const claims = stubClaims({ data: null, error: { status: 401, name: 'AuthApiError' } });
    await rejects({ authorization: 'bearer tok' }, { status: 401, code: 'UNAUTHORIZED' });
    assert.deepEqual(claims.mock.calls[0].arguments, ['tok']);
  });
});

describe('requireRole', () => {
  it('A: allowed role -> next() once', async () => {
    const { nextCalls } = await invoke(requireRole([UserRole.Admin, UserRole.Moderator]), makeReq({ user: { role: UserRole.Moderator }, db: unusedDb }));
    assert.deepEqual(nextCalls, [[]]);
  });

  it('B: role not in the list -> throws 403 FORBIDDEN, next not called', async () => {
    await assert.rejects(
      invoke(requireRole([UserRole.Admin]), makeReq({ user: { role: UserRole.Student }, db: unusedDb })),
      { status: 403, code: 'FORBIDDEN', message: 'Your role cannot perform this action.' },
    );
  });

  it('C: empty role list denies everyone', async () => {
    await assert.rejects(
      invoke(requireRole([]), makeReq({ user: { role: UserRole.Admin }, db: unusedDb })),
      { status: 403, code: 'FORBIDDEN' },
    );
  });

  it('D: unauthenticated request -> 401 UNAUTHORIZED', async () => {
    await assert.rejects(invoke(requireRole([UserRole.Admin]), makeReq({ user: null })), { status: 401, code: 'UNAUTHORIZED' });
  });
});
