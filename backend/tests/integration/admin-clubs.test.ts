import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { UserRole } from '../../src/types/domain.js';
import { createTestApi } from '../helpers/api.js';
import { createIntegrationFixture, integrationOptions } from '../helpers/fixtures.js';

const { call } = createTestApi();

test('admin club desk lists, creates, transfers, and deletes clubs safely', integrationOptions, async t => {
  const fixture = await createIntegrationFixture();
  const { users, owner, clubIds } = fixture;
  const admin = users[UserRole.Admin];
  const student = users[UserRole.Student];
  const clubLeader = users[UserRole.ClubLeader];
  const moderator = users[UserRole.Moderator];
  const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
  const handle = `desk_${suffix}`;
  const partnerId = randomUUID();
  const partnerHandle = `partner${suffix}`;
  clubIds.push(partnerId);

  try {
    await owner`insert into public.clubs (public_id, slug, name, handle, category, leader_id, org_type)
      select ${partnerId}, ${`partner-${suffix}`}, 'Partner fixture', ${partnerHandle}, 'Local business', p.id, 'partner'
      from public.profiles p where p.public_id = ${admin.publicId}`;

    await t.test('admin list includes partner pages, exposes only public fields, and is admin-only', async () => {
      const list = await call('/api/admin/clubs?limit=100', admin.token);
      assert.equal(list.status, 200, JSON.stringify(list.body));
      const partner = list.body.data.find((club: { id: string }) => club.id === partnerId);
      assert.equal(partner.org_type, 'partner');
      assert.deepEqual(partner.founder, { name: 'Test admin' });
      const serialized = JSON.stringify(list.body);
      for (const value of [admin.id, admin.email]) assert(!serialized.includes(value));
      for (const field of ['internal_id', 'leader_id', 'profile_id', 'auth_user_id', 'email']) assert(!serialized.includes(`"${field}"`));
      assert.equal((await call('/api/admin/clubs?limit=101', admin.token)).status, 400);
      for (const token of [student.token, moderator.token]) {
        assert.equal((await call('/api/admin/clubs', token)).status, 403);
        assert.equal((await call('/api/admin/clubs', token, {
          name: 'Denied Club', handle: `denied${suffix}`, category: 'Music',
          description: 'A description that is long enough.', founderId: student.publicId,
        })).status, 403);
      }
      const partnerDelete = await call(`/api/admin/clubs/${partnerId}`, admin.token, undefined, {}, 'DELETE');
      assert.equal(partnerDelete.status, 404);
      assert.equal((await owner`select 1 from public.clubs where public_id = ${partnerId}`).length, 1);
    });

    let clubId = '';
    let secondClubId = '';
    await t.test('admin creates clubs with approved founders and normalized slug collisions', async () => {
      const body = {
        name: 'Desk Club',
        handle,
        category: 'Arts & culture',
        description: 'A new club created from the admin desk.',
        meeting: '',
        location: '',
        founderId: student.publicId,
      };
      const created = await call('/api/admin/clubs', admin.token, body);
      assert.equal(created.status, 201, JSON.stringify(created.body));
      clubId = created.body.data.id;
      clubIds.push(clubId);
      assert.equal(created.body.data.handle, handle);
      assert.equal(created.body.data.slug, handle.replaceAll('_', '-'));
      assert.equal(created.body.data.name, 'Desk Club');
      assert.equal(created.body.data.mark, 'DE');
      assert.equal(created.body.data.color, 'plum');
      assert.equal(created.body.data.org_type, 'club');
      assert.deepEqual(created.body.data.founder, { name: 'Test student' });
      assert.equal(created.body.data.members, 1);
      assert.equal(created.body.data.pending, 0);
      assert(!JSON.stringify(created.body).includes(student.id));
      assert(!JSON.stringify(created.body).includes(student.email));
      const [founder] = await owner`select p.role, m.role as member_role, m.status
        from public.profiles p join public.club_members m on m.profile_id = p.id
        where p.public_id = ${student.publicId}
          and m.club_id = (select id from public.clubs where public_id = ${clubId})`;
      assert.deepEqual({ ...founder }, { role: UserRole.ClubLeader, member_role: 'manager', status: 'approved' });

      const duplicateHandle = await call('/api/admin/clubs', admin.token, { ...body, handle: handle.toUpperCase() });
      assert.equal(duplicateHandle.status, 409, JSON.stringify(duplicateHandle.body));
      const missingFounder = await call('/api/admin/clubs', admin.token, { ...body, handle: `missing${suffix}`, founderId: randomUUID() });
      assert.equal(missingFounder.status, 404, JSON.stringify(missingFounder.body));
      assert.equal((await call('/api/admin/clubs', admin.token, { ...body, handle: '' })).status, 400);

      const firstSlug = await call('/api/admin/clubs', admin.token, { ...body, handle: `slug_${suffix}`, name: 'Slug One' });
      assert.equal(firstSlug.status, 201, JSON.stringify(firstSlug.body));
      const secondSlug = await call('/api/admin/clubs', admin.token, { ...body, handle: `slug__${suffix}`, name: 'Slug Two' });
      assert.equal(secondSlug.status, 201, JSON.stringify(secondSlug.body));
      secondClubId = secondSlug.body.data.id;
      clubIds.push(firstSlug.body.data.id, secondClubId);
      assert.equal(firstSlug.body.data.slug, `slug-${suffix}`);
      assert.match(secondSlug.body.data.slug, new RegExp(`^slug-${suffix}-[a-z0-9]{4}$`));
    });

    await t.test('admin fetches one club by public id', async () => {
      const detail = await call(`/api/admin/clubs/${clubId}`, admin.token);
      assert.equal(detail.status, 200, JSON.stringify(detail.body));
      assert.equal(detail.body.data.id, clubId);
      assert.equal(detail.body.data.name, 'Desk Club');
      assert.equal((await call(`/api/admin/clubs/${clubId}`, student.token)).status, 403);
      assert.equal((await call(`/api/admin/clubs/${randomUUID()}`, admin.token)).status, 404);
    });

    await t.test('admin transfers founder and keeps the former founder as a demotable manager', async () => {
      await owner`update public.profiles set role = ${UserRole.Student} where public_id = ${clubLeader.publicId}`;
      const join = await call(`/api/campus/clubs/${clubId}/membership`, clubLeader.token, undefined, {}, 'POST');
      assert.equal(join.status, 201, JSON.stringify(join.body));
      assert.equal(join.body.data.status, 'pending');
      const approved = await call(`/api/campus/clubs/${clubId}/members/${join.body.data.id}`, student.token, { status: 'approved' }, {}, 'PATCH');
      assert.equal(approved.status, 200, JSON.stringify(approved.body));
      const transferred = await call(`/api/admin/clubs/${clubId}/founder`, admin.token, { memberId: join.body.data.id }, {}, 'PATCH');
      assert.equal(transferred.status, 200, JSON.stringify(transferred.body));
      assert.deepEqual(transferred.body.data.founder, { name: 'Test club_leader' });
      const [founders] = await owner`select c.leader_id = new_founder.id as transferred,
          new_founder.role as new_role, old_member.role as old_membership_role,
          old_member.status as old_membership_status, old_founder.role as old_role
        from public.clubs c
        join public.profiles new_founder on new_founder.public_id = ${clubLeader.publicId}
        join public.profiles old_founder on old_founder.public_id = ${student.publicId}
        join public.club_members new_member on new_member.public_id = ${join.body.data.id}
        join public.club_members old_member on old_member.club_id = c.id and old_member.profile_id = old_founder.id
        where c.public_id = ${clubId}`;
      assert.deepEqual({ ...founders }, {
        transferred: true,
        new_role: UserRole.ClubLeader,
        old_membership_role: 'manager',
        old_membership_status: 'approved',
        old_role: UserRole.ClubLeader,
      });
      const [oldMember] = await owner`select public_id from public.club_members
        where club_id = (select id from public.clubs where public_id = ${clubId})
          and profile_id = (select id from public.profiles where public_id = ${student.publicId})`;
      const demoted = await call(`/api/campus/clubs/${clubId}/members/${oldMember.public_id}`, clubLeader.token, { role: 'member' }, {}, 'PATCH');
      assert.equal(demoted.status, 200, JSON.stringify(demoted.body));
      assert.equal(demoted.body.data.role, 'member');
      assert.equal((await call(`/api/admin/clubs/${clubId}/founder`, admin.token, { memberId: randomUUID() }, {}, 'PATCH')).status, 404);
      assert.equal((await call(`/api/admin/clubs/${randomUUID()}/founder`, admin.token, { memberId: join.body.data.id }, {}, 'PATCH')).status, 404);
      assert.equal((await call(`/api/admin/clubs/${clubId}/founder`, student.token, { memberId: join.body.data.id }, {}, 'PATCH')).status, 403);
    });

    await t.test('club deletion cascades its community data and protects partner pages', async () => {
      await owner`update public.profiles set role = ${UserRole.Student} where public_id = ${clubLeader.publicId}`;
      const deletionClub = await call('/api/admin/clubs', admin.token, {
        name: 'Cascade Club',
        handle: `cascade_${suffix}`,
        category: 'Arts & culture',
        description: 'A separate club for cascade tests.',
        founderId: clubLeader.publicId,
      });
      assert.equal(deletionClub.status, 201, JSON.stringify(deletionClub.body));
      const deletionClubId = deletionClub.body.data.id;
      clubIds.push(deletionClubId);
      const leaderToken = clubLeader.token;
      const event = await call(`/api/campus/clubs/${deletionClubId}/events`, leaderToken, {
        title: 'Club event for cascade',
        starts_at: '2027-01-01T17:00:00+09:00',
        ends_at: '2027-01-01T18:00:00+09:00',
        location: 'Campus',
        event_type: 'Meetup',
      });
      assert.equal(event.status, 201, JSON.stringify(event.body));
      const followed = await call(`/api/campus/actions/follow/${deletionClubId}`, moderator.token, { active: true }, {}, 'PUT');
      assert.equal(followed.status, 200, JSON.stringify(followed.body));
      const post = await call(`/api/campus/clubs/${deletionClubId}/posts`, leaderToken, { text: 'Club post for cascade', eventId: event.body.data.id });
      assert.equal(post.status, 201, JSON.stringify(post.body));
      const memberRequest = await call(`/api/campus/clubs/${deletionClubId}/membership`, moderator.token, undefined, {}, 'POST');
      assert.equal(memberRequest.status, 201);
      const accepted = await call(`/api/campus/clubs/${deletionClubId}/members/${memberRequest.body.data.id}`, leaderToken, { status: 'approved' }, {}, 'PATCH');
      assert.equal(accepted.status, 200);
      for (const [action, id] of [['like', post.body.data.id], ['save', post.body.data.id], ['rsvp', event.body.data.id]]) {
        const changed = await call(`/api/campus/actions/${action}/${id}`, moderator.token, { active: true }, {}, 'PUT');
        assert.equal(changed.status, 200, JSON.stringify(changed.body));
      }
      const [internal] = await owner`select c.id::text as club_id, p.id::text as post_id, e.id::text as event_id
        from public.clubs c join public.club_posts p on p.club_id = c.id
        join public.club_events e on e.club_id = c.id
        where c.public_id = ${deletionClubId} and p.public_id = ${post.body.data.id} and e.public_id = ${event.body.data.id}`;
      const [beforeDelete] = await owner`select
        (select count(*)::int from public.club_events where club_id = ${internal.club_id}::bigint) as events,
        (select count(*)::int from public.club_posts where club_id = ${internal.club_id}::bigint) as posts,
        (select count(*)::int from public.club_members where club_id = ${internal.club_id}::bigint) as members,
        (select count(*)::int from public.club_follows where club_id = ${internal.club_id}::bigint) as follows,
        (select count(*)::int from public.club_post_likes where post_id = ${internal.post_id}::bigint) as likes,
        (select count(*)::int from public.club_post_saves where post_id = ${internal.post_id}::bigint) as saves,
        (select count(*)::int from public.club_event_rsvps where event_id = ${internal.event_id}::bigint) as rsvps,
        (select count(*)::int from public.notifications where club_post_id = ${internal.post_id}::bigint) as notifications`;
      assert.deepEqual({ ...beforeDelete }, { events: 1, posts: 1, members: 2, follows: 1, likes: 1, saves: 1, rsvps: 1, notifications: 1 });
      const deleted = await call(`/api/admin/clubs/${deletionClubId}`, admin.token, undefined, {}, 'DELETE');
      assert.equal(deleted.status, 200, JSON.stringify(deleted.body));
      assert.deepEqual(deleted.body, { data: { id: deletionClubId } });
      const [afterDelete] = await owner`select
        (select count(*)::int from public.club_events where club_id = ${internal.club_id}::bigint) as events,
        (select count(*)::int from public.club_posts where club_id = ${internal.club_id}::bigint) as posts,
        (select count(*)::int from public.club_members where club_id = ${internal.club_id}::bigint) as members,
        (select count(*)::int from public.club_follows where club_id = ${internal.club_id}::bigint) as follows,
        (select count(*)::int from public.club_post_likes where post_id = ${internal.post_id}::bigint) as likes,
        (select count(*)::int from public.club_post_saves where post_id = ${internal.post_id}::bigint) as saves,
        (select count(*)::int from public.club_event_rsvps where event_id = ${internal.event_id}::bigint) as rsvps,
        (select count(*)::int from public.notifications where club_post_id = ${internal.post_id}::bigint) as notifications`;
      assert.deepEqual({ ...afterDelete }, { events: 0, posts: 0, members: 0, follows: 0, likes: 0, saves: 0, rsvps: 0, notifications: 0 });
      assert.equal((await call(`/api/admin/clubs/${deletionClubId}`, admin.token, undefined, {}, 'DELETE')).status, 404);
      assert.equal((await call(`/api/admin/clubs/${partnerId}`, admin.token, undefined, {}, 'DELETE')).status, 404);
      assert.equal((await call(`/api/admin/clubs/${randomUUID()}`, admin.token, undefined, {}, 'DELETE')).status, 404);
      assert.equal((await call(`/api/admin/clubs/${deletionClubId}`, moderator.token, undefined, {}, 'DELETE')).status, 403);
    });
  } finally {
    await fixture.cleanup();
  }
});
