import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FeedPostKind, UserRole } from '../src/types/domain.js';
import { feedSchema } from '../src/controllers/feed.controller.js';
import { createTestApi } from './helpers/api.js';
import { createIntegrationFixture, integrationOptions } from './helpers/fixtures.js';

const { call } = createTestApi();

test('feed validation rejects unknown kinds and missing variant-specific details', () => {
  assert.equal(feedSchema.safeParse({ kind: 'unknown', title: 'Post' }).success, false);
  assert.equal(feedSchema.safeParse({ kind: FeedPostKind.ClubEvent, title: 'Missing event details' }).success, false);
  assert.equal(feedSchema.safeParse({ kind: FeedPostKind.Perk, title: 'Missing business' }).success, false);
});

test('feed publishing permissions and privacy', integrationOptions, async t => {
  const fixture = await createIntegrationFixture();
  const { users, owner } = fixture;
  try {
    const event = { kind: FeedPostKind.ClubEvent, title: 'Test event', room_number: '301', meeting_time: '2026-11-01T18:00:00+09:00' };
    const perk = { kind: FeedPostKind.Perk, title: 'Test perk', business_name: 'Test shop' };
    await t.test('feed role checks enforce events versus admin perks', async () => {
      assert.equal((await call('/api/feed', users[UserRole.Student].token, event)).status, 403);
      assert.equal((await call('/api/feed', users[UserRole.Student].token, perk)).status, 403);
      const created = await call('/api/feed', users[UserRole.ClubLeader].token, event);
      assert.equal(created.status, 201);
      assert.deepEqual(created.body.data.author, { name: 'Test club_leader' });
      assert(!('author_id' in created.body.data));
      const feed = await call('/api/feed', users[UserRole.Student].token);
      assert.equal(feed.status, 200);
      const post = feed.body.data.find((row: { id: string }) => row.id === created.body.data.id);
      assert.deepEqual(post.author, { name: 'Test club_leader' });
      assert(!('author_id' in post));
      assert(!JSON.stringify(post).includes(users[UserRole.ClubLeader].publicId));
      assert.equal((await call('/api/feed', users[UserRole.ClubLeader].token, perk)).status, 403);
      assert.equal((await call('/api/feed', users[UserRole.Admin].token, perk)).status, 201);
      assert.equal((await call('/api/feed', users[UserRole.Admin].token, event)).status, 201);
      assert.equal((await call('/api/feed', users[UserRole.Admin].token, { ...event, meeting_time: 'tomorrow' })).status, 400);
    });
    await t.test('role changes take effect with the existing token', async () => {
      await owner`update public.profiles set role = ${UserRole.Student} where auth_user_id = ${users[UserRole.ClubLeader].id}`;
      assert.equal((await call('/api/feed', users[UserRole.ClubLeader].token, event)).status, 403);
    });
  } finally {
    await fixture.cleanup();
  }
});
