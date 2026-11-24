import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { CampusAction, ListingCategory, UserRole } from '../../src/types/domain.js';
import { createTestApi } from '../helpers/api.js';
import { createIntegrationFixture, integrationOptions } from '../helpers/fixtures.js';

const { call } = createTestApi();

test('notifications integrate listings, campus, privacy, and read state', integrationOptions, async t => {
  const fixture = await createIntegrationFixture();
  const { users, clubIds } = fixture;
  const student = users[UserRole.Student];
  const clubLeader = users[UserRole.ClubLeader];
  const moderator = users[UserRole.Moderator];
  const partner = users[UserRole.Partner];
  const admin = users[UserRole.Admin];

  try {
    await t.test('listing notifications are created for other students, isolated from partners, and cleared only on page 1', async () => {
      const created = await call('/api/listings', student.token, {
        category: ListingCategory.Sales, title: 'Notified Desk', price_jpy: 1500,
      });
      assert.equal(created.status, 201, JSON.stringify(created.body));
      const listingId = created.body.data.id;

      const leaderNotifs = await call('/api/notifications?limit=100', clubLeader.token);
      assert.equal(leaderNotifs.status, 200, JSON.stringify(leaderNotifs.body));
      assert.equal(leaderNotifs.headers.get('cache-control'), 'private, no-store');
      const notif = (leaderNotifs.body.data as {
        id: string; kind: string; listing: string | null; listingTitle: string | null; actorName: string; read: boolean;
      }[]).find(n => n.kind === 'listing' && n.listing === listingId);
      assert(notif, 'Other student receives listing notification');
      assert.equal(notif.listingTitle, 'Notified Desk');
      assert.equal(notif.actorName, 'Test student');
      assert.equal(notif.read, false);
      assert(leaderNotifs.body.meta.unread >= 1);

      const serialized = JSON.stringify(leaderNotifs.body);
      for (const secret of [student.email, student.id, '"internal_id"', '"auth_user_id"']) {
        assert(!serialized.includes(secret), `Notification payload must not expose ${secret}`);
      }

      const unreadCount = await call('/api/notifications/unread-count', clubLeader.token);
      assert.equal(unreadCount.status, 200);
      assert.equal(unreadCount.headers.get('cache-control'), 'private, no-store');
      assert(unreadCount.body.data.unread >= 1);

      const sellerNotifs = await call('/api/notifications?limit=100', student.token);
      assert(!(sellerNotifs.body.data as { listing: string | null }[]).some(n => n.listing === listingId));
      const partnerNotifs = await call('/api/notifications?limit=100', partner.token);
      assert(!(partnerNotifs.body.data as { listing: string | null }[]).some(n => n.listing === listingId));

      await call('/api/listings?limit=10&offset=1', clubLeader.token);
      const afterOffset1 = await call('/api/notifications?limit=100', clubLeader.token);
      assert.equal((afterOffset1.body.data as { id: string; read: boolean }[]).find(n => n.id === notif.id)?.read, false);

      await call('/api/listings?limit=10&offset=0', clubLeader.token);
      const afterOffset0 = await call('/api/notifications?limit=100', clubLeader.token);
      assert.equal((afterOffset0.body.data as { id: string; read: boolean }[]).find(n => n.id === notif.id)?.read, true);
    });

    await t.test('club notifications support mark-read isolation and read-all', async () => {
      const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
      const club = await call('/api/admin/clubs', admin.token, {
        name: 'Notification Club', handle: `notif_${suffix}`, category: 'Music',
        description: 'A club for notification integration testing.', founderId: clubLeader.publicId,
      });
      assert.equal(club.status, 201, JSON.stringify(club.body));
      const clubId = club.body.data.id;
      clubIds.push(clubId);

      assert.equal((await call(`/api/campus/actions/${CampusAction.Follow}/${clubId}`, student.token, { active: true }, {}, 'PUT')).status, 200);
      const event = await call(`/api/campus/clubs/${clubId}/events`, clubLeader.token, {
        title: 'Notified Event', starts_at: '2027-02-01T17:00:00+09:00', ends_at: '2027-02-01T18:00:00+09:00',
        location: 'Lobby', event_type: 'Meetup',
      });
      assert.equal(event.status, 201, JSON.stringify(event.body));
      const post = await call(`/api/campus/clubs/${clubId}/posts`, clubLeader.token, {
        text: 'Notified Post', eventId: event.body.data.id,
      });
      assert.equal(post.status, 201, JSON.stringify(post.body));

      const notifs = await call('/api/notifications?limit=100', student.token);
      assert.equal(notifs.status, 200);
      const list = notifs.body.data as { id: string; kind: string; club: string | null; read: boolean }[];
      const eventNotif = list.find(n => n.kind === 'club_event' && n.club === clubId);
      const postNotif = list.find(n => n.kind === 'club_post' && n.club === clubId);
      assert(eventNotif && !eventNotif.read);
      assert(postNotif && !postNotif.read);

      assert.equal((await call(`/api/notifications/${postNotif.id}/read`, moderator.token, undefined, {}, 'POST')).status, 404);
      const markedOne = await call(`/api/notifications/${postNotif.id}/read`, student.token, undefined, {}, 'POST');
      assert.equal(markedOne.status, 204);
      assert.equal(markedOne.body, undefined);

      const afterOne = (await call('/api/notifications?limit=100', student.token)).body.data as { id: string; read: boolean }[];
      assert.equal(afterOne.find(n => n.id === postNotif.id)?.read, true);
      assert.equal(afterOne.find(n => n.id === eventNotif.id)?.read, false);

      const markedAll = await call('/api/notifications/read-all', student.token, undefined, {}, 'POST');
      assert.equal(markedAll.status, 200, JSON.stringify(markedAll.body));
      assert(markedAll.body.data.marked >= 1);

      const afterAll = (await call('/api/notifications?limit=100', student.token)).body.data as { id: string; read: boolean }[];
      assert.equal(afterAll.find(n => n.id === eventNotif.id)?.read, true);
    });
  } finally {
    await fixture.cleanup();
  }
});
