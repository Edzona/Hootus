import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { CampusAction, UserRole } from '../src/types/domain.js';
import { campusActionParams } from '../src/controllers/campus.controller.js';
import { createTestApi, withUser } from './helpers/api.js';
import { createIntegrationFixture, integrationOptions } from './helpers/fixtures.js';

const { call } = createTestApi();

test('campus action validation accepts each action and rejects unknown values', () => {
  const id = randomUUID();
  for (const action of Object.values(CampusAction)) {
    assert.equal(campusActionParams.parse({ action, id }).action, action);
  }
  assert.equal(campusActionParams.safeParse({ action: 'unknown', id }).success, false);
});

test('campus API permissions and student interactions', integrationOptions, async t => {
  const fixture = await createIntegrationFixture();
  const { users, owner, clubIds: campusClubIds } = fixture;
  try {
    await t.test('campus: ownership, persistence, privacy, idempotency, and RLS', async () => {
      const leader = users[UserRole.ClubLeader];
      const student = users[UserRole.Student];
      const admin = users[UserRole.Admin];
      const clubIds = [randomUUID(), randomUUID()];
      for (const [index, leaderUser] of [leader, admin].entries()) {
        await owner`insert into public.clubs (public_id, slug, name, handle, category, leader_id)
          select ${clubIds[index]}, ${`test-${clubIds[index]}`}, 'Fixture club', ${`test-${clubIds[index]}`}, 'Music', id
          from public.profiles where auth_user_id = ${leaderUser.id}`;
        campusClubIds.push(clubIds[index]);
      }
      const clubId = clubIds[0];
      const postPath = `/api/campus/clubs/${clubId}/posts`;
      const eventPath = `/api/campus/clubs/${clubId}/events`;
      const setAction = (action: CampusAction | string, id: string, active: boolean, token = student.token) =>
        call(`/api/campus/actions/${action}/${id}`, token, { active }, {}, 'PUT');
      assert.equal((await call(postPath, student.token, { text: 'Spoofed post' })).status, 403);
      assert.equal((await call(`/api/campus/clubs/${clubIds[1]}/posts`, leader.token, { text: 'Wrong club' })).status, 403);
      assert.equal((await call('/api/campus/clubs/not-a-uuid/posts', leader.token, { text: 'Invalid' })).status, 400);
      assert.equal((await call(postPath, leader.token, { text: ' ', author_id: admin.id })).status, 400);
      const details = {
        title: 'Fixture meetup', starts_at: '2026-11-04T17:00:00+09:00', ends_at: '2026-11-04T18:00:00+09:00',
        location: 'Fixture room', event_type: 'Meetup',
      };
      assert.equal((await call(eventPath, leader.token, { ...details, ends_at: details.starts_at })).status, 400);
      const createdEvent = await call(eventPath, leader.token, details);
      assert.equal(createdEvent.status, 201, JSON.stringify(createdEvent.body));
      const eventId = createdEvent.body.data.id;
      const createdPost = await call(postPath, leader.token, { text: 'A fixture club update', eventId });
      assert.equal(createdPost.status, 201, JSON.stringify(createdPost.body));
      const postId = createdPost.body.data.id;
      assert.equal((await call(postPath, leader.token, { text: 'Unknown event', eventId: randomUUID() })).status, 400);
      const otherEvent = await call(`/api/campus/clubs/${clubIds[1]}/events`, admin.token, details);
      assert.equal(otherEvent.status, 201);
      assert.equal((await call(postPath, leader.token, { text: 'Wrong club event', eventId: otherEvent.body.data.id })).status, 400);
      for (const [action, id] of [[CampusAction.Follow, clubId], [CampusAction.Like, postId], [CampusAction.Save, postId], [CampusAction.Rsvp, eventId]] as const) {
        assert.equal((await setAction(action, id, true)).status, 200);
        assert.equal((await setAction(action, id, true)).status, 200, 'Repeated PUT is idempotent');
        assert.equal((await setAction(action, randomUUID(), true)).status, 404);
      }
      assert.equal((await setAction('unknown', postId, true)).status, 400);
      assert.equal((await setAction(CampusAction.Like, '123', true)).status, 400);
      assert.equal((await call(`/api/campus/actions/like/${postId}`, student.token, { active: true, profile_id: admin.id }, {}, 'PUT')).status, 400);
      const snapshot = await call('/api/campus?limit=100', student.token);
      assert.equal(snapshot.status, 200, JSON.stringify(snapshot.body));
      assert.equal(snapshot.headers.get('cache-control'), 'private, no-store');
      const data = snapshot.body.data;
      const club = data.clubs.find((row: { id: string }) => row.id === clubId);
      assert.equal(club.following, true);
      assert.equal(club.canPost, false);
      assert.equal(club.followers, 1);
      const post = data.posts.find((row: { id: string }) => row.id === postId);
      assert.equal(post.liked, true);
      assert.equal(post.saved, true);
      assert.equal(post.likes, 1);
      assert.equal(post.event, eventId);
      assert(data.savedPosts.some((row: { id: string }) => row.id === postId));
      assert.equal(data.events.find((row: { id: string }) => row.id === eventId).attending, true);
      const serialized = JSON.stringify(data);
      for (const field of ['leader_id', 'author_id', 'profile_id', 'auth_user_id', 'internal_id', 'public_id', 'email', 'student_id']) assert(!serialized.includes(`"${field}"`));
      assert(!serialized.includes(student.id));
      const other = (await call('/api/campus?limit=100', admin.token)).body.data;
      assert.equal(other.posts.find((row: { id: string }) => row.id === postId).saved, false);
      assert(!other.savedPosts.some((row: { id: string }) => row.id === postId));
      assert.equal(other.events.find((row: { id: string }) => row.id === eventId).attending, false);
      assert.equal((await setAction(CampusAction.Save, postId, false, admin.token)).status, 200);
      assert((await call('/api/campus', student.token)).body.data.savedPosts.some((row: { id: string }) => row.id === postId));
      const [stored] = await owner`select c.id::text as club, p.id::text as post,
        (select id::text from public.profiles where auth_user_id = ${admin.id}) as other_profile
        from public.clubs c join public.club_posts p on p.club_id = c.id where p.public_id = ${postId}`;
      await assert.rejects(withUser(student.id, tx => tx`insert into public.club_post_likes(profile_id,post_id) values (${stored.other_profile},${stored.post})`),
        (err: unknown) => err instanceof Error && 'status' in err && err.status === 403);
      await assert.rejects(withUser(leader.id, tx => tx`insert into public.club_posts (club_id,body)
        select id,'Cross-club attempt' from public.clubs where public_id = ${clubIds[1]}`),
        (err: unknown) => err instanceof Error && 'status' in err && err.status === 403);
      const isolated = await Promise.all([student, admin, student, admin].map(user => withUser(user.id, tx => tx`
        select count(*)::int as count from public.club_post_saves where post_id = ${stored.post}`)));
      assert.deepEqual(isolated.map(rows => rows[0].count), [1, 0, 1, 0]);
      await assert.rejects(withUser(admin.id, async tx => {
        await tx`insert into public.club_post_saves(post_id) values (${stored.post})`;
        throw new Error('Rollback fixture');
      }));
      const [rolledBack] = await owner`select count(*)::int as count from public.club_post_saves where profile_id=${stored.other_profile} and post_id=${stored.post}`;
      assert.equal(rolledBack.count, 0);
      for (const table of ['clubs','club_events','club_posts','club_follows','club_post_likes','club_post_saves','club_event_rsvps']) {
        const [grants] = await owner`select has_table_privilege('anon',${`public.${table}`},'select') as anon,
          has_table_privilege('authenticated',${`public.${table}`},'select') as authenticated`;
        assert.equal(grants.anon, false);
        assert.equal(grants.authenticated, false);
      }
      for (const [action, id] of [[CampusAction.Follow, clubId], [CampusAction.Like, postId], [CampusAction.Save, postId], [CampusAction.Rsvp, eventId]] as const) {
        assert.equal((await setAction(action, id, false)).status, 200);
        assert.equal((await setAction(action, id, false)).status, 200);
      }
      const cleared = (await call('/api/campus?limit=100', student.token)).body.data;
      assert.equal(cleared.clubs.find((row: { id: string }) => row.id === clubId).following, false);
      assert.equal(cleared.posts.find((row: { id: string }) => row.id === postId).likes, 0);
      assert(!cleared.savedPosts.some((row: { id: string }) => row.id === postId));
    });
  } finally {
    await fixture.cleanup();
  }
});
