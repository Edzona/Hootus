import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { FeedPostKind, ListingCategory, ListingStatus, UserRole } from '../src/types/domain.js';
import { moderateFeedBody, moderateListingBody } from '../src/controllers/admin.controller.js';
import { createTestApi } from './helpers/api.js';
import { createIntegrationFixture, integrationOptions } from './helpers/fixtures.js';

const { call } = createTestApi();

test('admin moderation bodies need a known change', () => {
  assert.equal(moderateListingBody.safeParse({}).success, false);
  assert.equal(moderateListingBody.safeParse({ status: 'deleted' }).success, false);
  assert.equal(moderateListingBody.safeParse({ author_id: '1' }).success, false);
  assert.equal(moderateListingBody.safeParse({ status: ListingStatus.Closed }).success, true);
  assert.equal(moderateFeedBody.safeParse({}).success, false);
  assert.equal(moderateFeedBody.safeParse({ kind: FeedPostKind.Perk }).success, false);
  assert.equal(moderateFeedBody.safeParse({ title: 'Edited' }).success, true);
});

test('admin API access, moderation and privacy', integrationOptions, async t => {
  const fixture = await createIntegrationFixture();
  const { users, owner } = fixture;
  const admin = users[UserRole.Admin].token;
  const nonAdmins = [UserRole.Student, UserRole.ClubLeader].map(role => users[role].token);
  try {
    const listing = (await call('/api/listings', users[UserRole.Student].token, {
      category: ListingCategory.Sales, title: 'Desk to moderate',
    })).body.data;
    const post = (await call('/api/feed', users[UserRole.ClubLeader].token, {
      kind: FeedPostKind.ClubEvent, title: 'Event to moderate', room_number: '301', meeting_time: '2026-11-01T18:00:00+09:00',
    })).body.data;
    const routes: [string, string, unknown?][] = [
      ['GET', '/api/admin/users'],
      ['PATCH', `/api/admin/listings/${listing.id}`, { status: ListingStatus.Closed }],
      ['DELETE', `/api/admin/listings/${listing.id}`],
      ['PATCH', `/api/admin/feed/${post.id}`, { title: 'Hidden' }],
      ['DELETE', `/api/admin/feed/${post.id}`],
    ];

    await t.test('anonymous callers get 401 and non-admins get 403 without changes', async () => {
      for (const [method, path, body] of routes) {
        assert.equal((await call(path, undefined, body, {}, method)).status, 401, `${method} ${path}`);
        for (const token of nonAdmins) assert.equal((await call(path, token, body, {}, method)).status, 403, `${method} ${path}`);
      }
      const [stored] = await owner`select status from public.listings where public_id = ${listing.id}`;
      assert.equal(stored.status, ListingStatus.Active);
      const [storedPost] = await owner`select title from public.feed_posts where public_id = ${post.id}`;
      assert.equal(storedPost.title, 'Event to moderate');
    });

    await t.test('admin lists users with public fields only', async () => {
      const result = await call('/api/admin/users?limit=100', admin);
      assert.equal(result.status, 200);
      const student = result.body.data.find((row: { id: string }) => row.id === users[UserRole.Student].publicId);
      assert.equal(student.full_name, 'Test student');
      assert.equal(student.role, UserRole.Student);
      for (const key of Object.keys(student)) assert(['id', 'full_name', 'role', 'avatar_url', 'created_at'].includes(key), key);
      const text = JSON.stringify(result.body);
      assert(!text.includes(users[UserRole.Student].email));
      assert(!text.includes(users[UserRole.Student].id));
      assert.equal((await call('/api/admin/users?limit=101', admin)).status, 400);
    });

    await t.test('admin params must be UUIDs and missing records are 404', async () => {
      assert.equal((await call('/api/admin/listings/1', admin, { status: ListingStatus.Closed }, {}, 'PATCH')).status, 400);
      assert.equal((await call('/api/admin/feed/not-a-uuid', admin, undefined, {}, 'DELETE')).status, 400);
      assert.equal((await call(`/api/admin/listings/${randomUUID()}`, admin, { status: ListingStatus.Closed }, {}, 'PATCH')).status, 404);
      assert.equal((await call(`/api/admin/feed/${randomUUID()}`, admin, undefined, {}, 'DELETE')).status, 404);
      assert.equal((await call(`/api/admin/listings/${listing.id}`, admin, {}, {}, 'PATCH')).status, 400);
    });

    await t.test('admin moderates and deletes another member\'s listing', async () => {
      const result = await call(`/api/admin/listings/${listing.id}`, admin, { status: ListingStatus.Closed, title: 'Removed by admin' }, {}, 'PATCH');
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.data.status, ListingStatus.Closed);
      assert.equal(result.body.data.title, 'Removed by admin');
      assert.deepEqual(result.body.data.author, { name: 'Test student' });
      assert(!('author_id' in result.body.data) && !('author_name' in result.body.data));
      assert(!JSON.stringify(result.body).includes(users[UserRole.Student].publicId));
      const deleted = await call(`/api/admin/listings/${listing.id}`, admin, undefined, {}, 'DELETE');
      assert.equal(deleted.status, 200);
      assert.deepEqual(deleted.body, { data: { id: listing.id } });
      assert.equal((await owner`select 1 from public.listings where public_id = ${listing.id}`).length, 0);
    });

    await t.test('admin moderates and deletes another member\'s feed post', async () => {
      const result = await call(`/api/admin/feed/${post.id}`, admin, { title: 'Edited by admin', body: '' }, {}, 'PATCH');
      assert.equal(result.status, 200, JSON.stringify(result.body));
      assert.equal(result.body.data.title, 'Edited by admin');
      assert.deepEqual(result.body.data.author, { name: 'Test club_leader' });
      assert(!JSON.stringify(result.body).includes(users[UserRole.ClubLeader].publicId));
      const deleted = await call(`/api/admin/feed/${post.id}`, admin, undefined, {}, 'DELETE');
      assert.equal(deleted.status, 200);
      assert.deepEqual(deleted.body, { data: { id: post.id } });
      assert.equal((await owner`select 1 from public.feed_posts where public_id = ${post.id}`).length, 0);
    });
  } finally {
    await fixture.cleanup();
  }
});
