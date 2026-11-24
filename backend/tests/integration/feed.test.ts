import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { FeedPostKind, UserRole } from '../../src/types/domain.js';
import { createTestApi } from '../helpers/api.js';
import { createIntegrationFixture, integrationOptions } from '../helpers/fixtures.js';

const { call } = createTestApi();

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
      assert.equal((await call('/api/feed', users[UserRole.ClubLeader].token, perk)).status, 201);
      assert.equal((await call('/api/feed', users[UserRole.Admin].token, perk)).status, 201);
      assert.equal((await call('/api/feed', users[UserRole.Admin].token, event)).status, 201);
    });
    await t.test('partners and promoted club managers can publish perks while ordinary students cannot', async () => {
      const partner = users[UserRole.Partner];
      const student = users[UserRole.Student];
      const leader = users[UserRole.ClubLeader];
      const admin = users[UserRole.Admin];

      assert.equal((await call('/api/feed', partner.token, event)).status, 403);
      assert.equal((await call('/api/feed', partner.token, perk)).status, 201);

      const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
      const club = await call('/api/admin/clubs', admin.token, {
        name: 'Perk Manager Club', handle: `perk_${suffix}`, category: 'Arts & culture',
        description: 'Club used to test promoted manager perk publishing.', founderId: leader.publicId,
      });
      assert.equal(club.status, 201, JSON.stringify(club.body));
      const clubId = club.body.data.id;
      fixture.clubIds.push(clubId);

      const join = await call(`/api/campus/clubs/${clubId}/membership`, student.token, undefined, {}, 'POST');
      assert.equal(join.status, 201, JSON.stringify(join.body));
      const promoted = await call(`/api/campus/clubs/${clubId}/members/${join.body.data.id}`, leader.token, {
        status: 'approved', role: 'manager',
      }, {}, 'PATCH');
      assert.equal(promoted.status, 200, JSON.stringify(promoted.body));

      assert.equal((await call('/api/feed', student.token, perk)).status, 201);
      assert.equal((await call('/api/feed', student.token, event)).status, 403);

      const demoted = await call(`/api/campus/clubs/${clubId}/members/${join.body.data.id}`, leader.token, {
        role: 'member',
      }, {}, 'PATCH');
      assert.equal(demoted.status, 200, JSON.stringify(demoted.body));
      assert.equal((await call('/api/feed', student.token, perk)).status, 403);
    });
    await t.test('role changes take effect with the existing token', async () => {
      await owner`update public.profiles set role = ${UserRole.Student} where auth_user_id = ${users[UserRole.ClubLeader].id}`;
      assert.equal((await call('/api/feed', users[UserRole.ClubLeader].token, event)).status, 403);
    });
  } finally {
    await fixture.cleanup();
  }
});
