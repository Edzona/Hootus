import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';
import { FeedPostKind, ListingCategory, ListingStatus, PartnerCategory, UserRole } from '../../src/types/domain.js';
import { createTestApi } from '../helpers/api.js';
import { createIntegrationFixture, integrationOptions } from '../helpers/fixtures.js';

const { call } = createTestApi();

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
      ['GET', '/api/admin/listings'],
      ['PATCH', `/api/admin/users/${users[UserRole.Student].publicId}`, { role: UserRole.Admin }],
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
      const [storedUser] = await owner`select role from public.profiles where public_id = ${users[UserRole.Student].publicId}`;
      assert.equal(storedUser.role, UserRole.Student);
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
    });

    await t.test('admin member search filters by name and role without exposing private data', async () => {
      const all = (await call('/api/admin/users?limit=100', admin)).body.data;

      const named = await call('/api/admin/users?search=STUDENT&limit=100', admin);
      assert.equal(named.status, 200);
      assert(named.body.data.some((row: { id: string }) => row.id === users[UserRole.Student].publicId));
      for (const row of named.body.data) assert((row.full_name ?? '').toLowerCase().includes('student'), row.full_name);

      const literal = await call('/api/admin/users?search=%25&limit=100', admin);
      assert.equal(literal.status, 200);
      assert.equal(literal.body.data.length, 0);
      assert(literal.body.data.length < all.length);

      const moderators = await call('/api/admin/users?role=moderator&limit=100', admin);
      assert.equal(moderators.status, 200);
      assert(moderators.body.data.length > 0);
      for (const row of moderators.body.data) assert.equal(row.role, UserRole.Moderator);
      assert(moderators.body.data.some((row: { id: string }) => row.id === users[UserRole.Moderator].publicId));

      const combined = await call('/api/admin/users?search=moderator&role=moderator&limit=100', admin);
      assert.equal(combined.status, 200);
      for (const row of combined.body.data) {
        assert.equal(row.role, UserRole.Moderator);
        assert((row.full_name ?? '').toLowerCase().includes('moderator'));
      }
      assert(combined.body.data.some((row: { id: string }) => row.id === users[UserRole.Moderator].publicId));
      const combinedText = JSON.stringify(combined.body);
      assert(!combinedText.includes(users[UserRole.Moderator].email));
      assert(!combinedText.includes(users[UserRole.Moderator].id));

      assert.equal((await call('/api/admin/users?role=emperor', admin)).status, 400);
      assert.equal((await call('/api/admin/users?search=%20%20', admin)).status, 400);
      for (const token of nonAdmins) {
        assert.equal((await call('/api/admin/users?search=x&role=student', token)).status, 403);
      }
    });

    await t.test('admin changes another member\'s role but not their own', async () => {
      const student = users[UserRole.Student];
      const path = `/api/admin/users/${student.publicId}`;
      assert.equal((await call(`/api/admin/users/${randomUUID()}`, admin, { role: UserRole.Student }, {}, 'PATCH')).status, 404);
      const self = await call(`/api/admin/users/${users[UserRole.Admin].publicId}`, admin, { role: UserRole.Student }, {}, 'PATCH');
      assert.equal(self.status, 409);
      const uppercaseSelfId = users[UserRole.Admin].publicId.replace(/[a-f]/g, char => char.toUpperCase());
      assert.notEqual(uppercaseSelfId, users[UserRole.Admin].publicId);
      const uppercaseSelf = await call(`/api/admin/users/${uppercaseSelfId}`, admin, { role: UserRole.Student }, {}, 'PATCH');
      assert.equal(uppercaseSelf.status, 409);
      try {
        const result = await call(path, admin, { role: UserRole.ClubLeader }, {}, 'PATCH');
        assert.equal(result.status, 200, JSON.stringify(result.body));
        assert.deepEqual(Object.keys(result.body.data).sort(), ['avatar_url', 'created_at', 'full_name', 'id', 'role']);
        assert.equal(result.body.data.id, student.publicId);
        assert.equal(result.body.data.role, UserRole.ClubLeader);
        const [stored] = await owner`select role from public.profiles where public_id = ${student.publicId}`;
        assert.equal(stored.role, UserRole.ClubLeader);
      } finally {
        await owner`update public.profiles set role = ${UserRole.Student} where public_id = ${student.publicId}`;
      }
      const [admins] = await owner`select role from public.profiles where public_id = ${users[UserRole.Admin].publicId}`;
      assert.equal(admins.role, UserRole.Admin);
    });

    await t.test('two admins demoting each other leaves one admin, without a database error', async () => {
      const [first, second] = [users[UserRole.Admin], users[UserRole.ClubLeader]];
      await owner`update public.profiles set role = ${UserRole.Admin} where public_id = ${second.publicId}`;
      try {
        const results = await Promise.all([
          call(`/api/admin/users/${second.publicId}`, first.token, { role: UserRole.Student }, {}, 'PATCH'),
          call(`/api/admin/users/${first.publicId}`, second.token, { role: UserRole.Student }, {}, 'PATCH'),
        ]);
        assert.deepEqual(results.map(result => result.status).sort(), [200, 403], JSON.stringify(results.map(result => result.body)));
        const admins = await owner`select 1 from public.profiles where public_id in (${first.publicId}, ${second.publicId}) and role = ${UserRole.Admin}`;
        assert.equal(admins.length, 1);
      } finally {
        await owner`update public.profiles set role = ${UserRole.Admin} where public_id = ${first.publicId}`;
        await owner`update public.profiles set role = ${UserRole.ClubLeader} where public_id = ${second.publicId}`;
      }
    });

    await t.test('role changes are enforced in Postgres, not only by middleware', async () => {
      const asUser = (authUserId: string, work: (tx: typeof owner) => Promise<unknown>) => owner.begin(async tx => {
        await tx`set local role hootus_api`;
        await tx`select set_config('request.jwt.claim.sub', ${authUserId}, true)`;
        return work(tx as unknown as typeof owner);
      });
      const target = users[UserRole.Student].publicId;
      await assert.rejects(asUser(users[UserRole.ClubLeader].id, tx => tx`select * from private.set_profile_role(${target}, 'admin')`),
        { code: '42501' });
      await assert.rejects(asUser(users[UserRole.Student].id, tx => tx`update public.profiles set role = 'admin' where public_id = ${target}`),
        { code: '42501' });
      await assert.rejects(asUser(users[UserRole.Admin].id, tx => tx`select * from private.set_profile_role(${users[UserRole.Admin].publicId}, 'student')`),
        { code: '42501' });
      const [stored] = await owner`select role from public.profiles where public_id = ${target}`;
      assert.equal(stored.role, UserRole.Student);
    });

    await t.test('admin validation rejects bad params and missing records are 404', async () => {
      assert.equal((await call('/api/admin/listings/1', admin, { status: ListingStatus.Closed }, {}, 'PATCH')).status, 400);
      assert.equal((await call(`/api/admin/listings/${randomUUID()}`, admin, { status: ListingStatus.Closed }, {}, 'PATCH')).status, 404);
      assert.equal((await call(`/api/admin/feed/${randomUUID()}`, admin, undefined, {}, 'DELETE')).status, 404);
    });

    await t.test('admin lists active and closed listings with public author data only', async () => {
      const closedListing = (await call('/api/listings', users[UserRole.Student].token, {
        category: ListingCategory.Sales, title: 'Desk already sold',
      })).body.data;
      const closed = await call(`/api/listings/${closedListing.id}/status`, users[UserRole.Student].token, { status: ListingStatus.Closed }, {}, 'PATCH');
      assert.equal(closed.status, 200, JSON.stringify(closed.body));

      const result = await call('/api/admin/listings?limit=100', admin);
      assert.equal(result.status, 200, JSON.stringify(result.body));
      const activeRow = result.body.data.find((row: { id: string }) => row.id === listing.id);
      const closedRow = result.body.data.find((row: { id: string }) => row.id === closedListing.id);
      assert.equal(activeRow.status, ListingStatus.Active);
      assert.equal(closedRow.status, ListingStatus.Closed);
      assert.deepEqual(closedRow.author, { name: 'Test student' });
      assert(!('author_id' in closedRow) && !('email' in closedRow));
      assert(!JSON.stringify(result.body).includes(users[UserRole.Student].email));
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

    await t.test('approving a club request with an underscore handle creates a valid slug', async () => {
      const student = users[UserRole.Student];
      const clubLeader = users[UserRole.ClubLeader];
      const request = await call('/api/campus/club-requests', student.token, {
        name: 'Film Club', handle: 'film_club', category: 'Arts & culture',
        description: 'A place to watch and discuss films.', verificationNote: 'Weekly screenings and discussion.',
      });
      assert.equal(request.status, 201, JSON.stringify(request.body));
      try {
        const approved = await call(`/api/admin/club-requests/${request.body.data.id}`, admin, { decision: 'approved' }, {}, 'PATCH');
        assert.equal(approved.status, 200, JSON.stringify(approved.body));
        const [club] = await owner`select slug, handle from public.clubs where leader_id =
          (select id from public.profiles where public_id = ${student.publicId}) and handle like 'film_club%'`;
        assert.equal(club.slug, 'film-club');

        const secondRequest = await call('/api/campus/club-requests', clubLeader.token, {
          name: 'Second Film Club', handle: 'film_club', category: 'Arts & culture',
          description: 'A second place to watch and discuss films.', verificationNote: 'A second weekly screening group.',
        });
        assert.equal(secondRequest.status, 201, JSON.stringify(secondRequest.body));
        const secondApproved = await call(`/api/admin/club-requests/${secondRequest.body.data.id}`, admin, { decision: 'approved' }, {}, 'PATCH');
        assert.equal(secondApproved.status, 200, JSON.stringify(secondApproved.body));
        const [secondClub] = await owner`select slug from public.clubs where leader_id =
          (select id from public.profiles where public_id = ${clubLeader.publicId}) and handle like 'film_club%'`;
        assert.match(secondClub.slug, /^film-club-[a-z0-9]{4}$/);
      } finally {
        await owner`delete from public.clubs where handle like 'film_club%'
          and leader_id in (
            select id from public.profiles where public_id in (${student.publicId}, ${clubLeader.publicId})
          )`;
        await owner`update public.profiles set role = ${UserRole.Student} where public_id = ${student.publicId}`;
      }
    });

    await t.test('admin lists and rejects club requests and prevents re-review', async () => {
      const student = users[UserRole.Student];
      const suffix = randomUUID().replaceAll('-', '').slice(0, 8);
      const request = await call('/api/campus/club-requests', student.token, {
        name: 'Reject Club', handle: `rej_${suffix}`, category: 'Arts & culture',
        description: 'A club request to be rejected.', verificationNote: 'Pending review note.',
      });
      assert.equal(request.status, 201, JSON.stringify(request.body));
      const requestId = request.body.data.id;
      try {
        const list = await call('/api/admin/club-requests?limit=100', admin);
        assert.equal(list.status, 200, JSON.stringify(list.body));
        assert((list.body.data as { id: string }[]).some(row => row.id === requestId));

        const rejected = await call(`/api/admin/club-requests/${requestId}`, admin, {
          decision: 'rejected', note: 'Duplicate club',
        }, {}, 'PATCH');
        assert.equal(rejected.status, 200, JSON.stringify(rejected.body));
        assert.equal(rejected.body.data.status, 'rejected');
        assert.equal(rejected.body.data.review_note, 'Duplicate club');

        const secondReview = await call(`/api/admin/club-requests/${requestId}`, admin, {
          decision: 'approved',
        }, {}, 'PATCH');
        assert.equal(secondReview.status, 404);
      } finally {
        await owner`delete from public.club_requests where public_id = ${requestId}`;
      }
    });

    await t.test('creating a partner with an underscore handle creates a valid slug and rejects duplicates', async () => {
      const email = `hootus-partner-${randomUUID()}@example.com`;
      try {
        const created = await call('/api/admin/partners', admin, {
          email, contactName: 'Test Partner', orgName: 'Film Partner',
          handle: 'film_partner', category: PartnerCategory.LocalBusiness,
          description: 'A local partner fixture account.', hours: '', location: '',
        });
        assert.equal(created.status, 201, JSON.stringify(created.body));
        const [club] = await owner`select slug, handle from public.clubs where public_id = ${created.body.data.club_id}`;
        assert.equal(club.slug, 'film-partner');
        const [partner] = await owner`select id from auth.users where email = ${email}`;
        fixture.ids.push(partner.id);
        fixture.clubIds.push(created.body.data.club_id);

        const duplicate = await call('/api/admin/partners', admin, {
          email: email.toUpperCase(), contactName: 'Dup Partner', orgName: 'Dup Partner',
          handle: `dup_${randomUUID().replaceAll('-', '').slice(0, 8)}`, category: PartnerCategory.LocalBusiness,
          description: 'Duplicate partner email test.', hours: '', location: '',
        });
        assert.equal(duplicate.status, 409, JSON.stringify(duplicate.body));
      } finally {
        await owner`delete from public.clubs where leader_id =
          (select id from public.profiles where email = ${email})`;
        await owner`delete from auth.users where lower(email) = lower(${email})`;
      }
    });
  } finally {
    await fixture.cleanup();
  }
});
