import assert from 'node:assert/strict';
import { test } from 'node:test';
import { ErrorCode } from '../src/types/errorCode.js';
import { createTestApi } from './helpers/api.js';

const api = createTestApi();
const { call } = api;

test('health, protected routes, CORS, JSON errors and 404s', async () => {
  assert.equal((await call('/health')).status, 200);
  assert.equal((await call('/api/health')).status, 200);
  for (const path of ['/api/profile/me', '/api/listings', '/api/feed', '/api/campus']) {
    assert.equal((await call(path)).status, 401);
  }
  assert.equal((await call('/api/profile/me', undefined, { bio: 'Hi' }, {}, 'PATCH')).status, 401);
  const preflight = await fetch(`${api.base}/api/profile/me`, { method: 'OPTIONS', headers: {
    Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'PATCH',
  } });
  assert.match(preflight.headers.get('access-control-allow-methods') ?? '', /PATCH/);
  const campusPreflight = await fetch(`${api.base}/api/campus/actions/follow/10000000-0000-4000-8000-000000000001`, {
    method: 'OPTIONS', headers: {
      Origin: 'http://localhost:5173', 'Access-Control-Request-Method': 'PUT',
      'Access-Control-Request-Headers': 'authorization,content-type',
    },
  });
  assert.equal(campusPreflight.status, 204);
  assert.equal(campusPreflight.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  assert.match(campusPreflight.headers.get('access-control-allow-methods') ?? '', /PUT/);
  assert.equal((await call('/missing')).status, 404);
  assert.equal((await call('/health', undefined, undefined, { Origin: 'https://untrusted.example' })).status, 403);
  const allowed = await call('/health', undefined, undefined, { Origin: 'http://localhost:5173' });
  assert.equal(allowed.headers.get('access-control-allow-origin'), 'http://localhost:5173');
  const invalidJson = await fetch(`${api.base}/api/listings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{',
  });
  assert.equal(invalidJson.status, 400);
  assert.equal((await invalidJson.json()).error.code, ErrorCode.InvalidJson);
  assert.equal((await call('/api/auth/signup', undefined, {
    email: 'outsider@example.com', name: 'Test', studentId: '123',
  })).status, 400);
});
