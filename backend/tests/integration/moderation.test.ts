import assert from 'node:assert/strict';
import { test } from 'node:test';
import { FeedPostKind, ListingCategory, UserRole } from '../../src/types/domain.js';
import { createTestApi, withUser } from '../helpers/api.js';
import { createIntegrationFixture, integrationOptions } from '../helpers/fixtures.js';

const { call } = createTestApi();

test('reports and moderation enforce privacy, permissions, and hidden-content behavior', integrationOptions, async t => {
  const fixture = await createIntegrationFixture();
  const { users, owner, clubIds } = fixture;
  const admin = users[UserRole.Admin];
  const moderator = users[UserRole.Moderator];
  const student = users[UserRole.Student];
  const clubLeader = users[UserRole.ClubLeader];
  let listingReportId = '';

  try {
    const listing = await call('/api/listings', moderator.token, {
      category: ListingCategory.Sales, title: 'Moderator listing', description: 'Moderator listings remain ordinary student content.',
    });
    assert.equal(listing.status, 201, JSON.stringify(listing.body));
    assert.deepEqual(listing.body.data.author, { name: 'Test moderator' });

    const club = await call('/api/admin/clubs', admin.token, {
      name: 'Moderator Managed Club', handle: `moderator_${student.publicId.slice(0, 8)}`,
      category: 'Arts & culture', description: 'A club managed by a moderator.',
      founderId: moderator.publicId,
    });
    assert.equal(club.status, 201, JSON.stringify(club.body));
    const clubId = club.body.data.id;
    clubIds.push(clubId);
    const perk = await call('/api/feed', moderator.token, {
      kind: FeedPostKind.Perk, title: 'Moderator perk', business_name: 'Campus Cafe',
    });
    assert.equal(perk.status, 201, JSON.stringify(perk.body));
    assert.deepEqual(perk.body.data.author, { name: 'Test moderator' });
    const feed = await call('/api/feed', student.token);
    assert(feed.body.data.some((item: { id: string }) => item.id === perk.body.data.id));

    const clubPost = await call(`/api/campus/clubs/${clubId}/posts`, moderator.token, { text: 'Moderator club post' });
    assert.equal(clubPost.status, 201, JSON.stringify(clubPost.body));
    await t.test('reports validate targets, reject duplicates, and hide reporter identity', async () => {
      const reported = await call('/api/reports', student.token, {
        kind: 'listing', id: listing.body.data.id, reason: '   Spam listing   ',
      });
      assert.equal(reported.status, 201, JSON.stringify(reported.body));
      listingReportId = reported.body.data.id;
      assert.equal(reported.body.data.status, 'open');
      assert.equal((await call('/api/reports', student.token, {
        kind: 'listing', id: listing.body.data.id, reason: 'Another report',
      })).status, 409);
      assert.equal((await call('/api/reports', student.token, {
        kind: 'unknown', id: listing.body.data.id, reason: 'Invalid target',
      })).status, 400);
      assert.equal((await call('/api/reports', student.token, {
        kind: 'listing', id: '00000000-0000-4000-8000-000000000001', reason: 'Missing target',
      })).status, 404);
      assert.equal((await call('/api/reports', student.token, {
        kind: 'listing', id: listing.body.data.id, reason: '  ',
      })).status, 400);

      for (const path of ['/api/moderation/reports', '/api/moderation/content?kind=listing']) {
        assert.equal((await call(path, student.token)).status, 403);
      }
      const reports = await call('/api/moderation/reports', moderator.token);
      assert.equal(reports.status, 200);
      const report = reports.body.data.find((item: { id: string }) => item.id === reported.body.data.id);
      assert.equal(report.reason, 'Spam listing');
      assert.equal(report.target_title, 'Moderator listing');
      assert.deepEqual(report.target_author, { name: 'Test moderator' });
      assert.equal(report.target_hidden, false);
      for (const key of ['reporter_id', 'reporter', 'email', 'auth_user_id']) assert(!(key in report));
      assert(!JSON.stringify(report).includes(student.publicId));
      assert(!JSON.stringify(report).includes(student.id));
      assert(!JSON.stringify(report).includes(student.email));
      assert.equal((await call('/api/moderation/reports?status=invalid', moderator.token)).status, 400);
      assert.equal((await call(`/api/moderation/reports/${reported.body.data.id}`, moderator.token, { status: 'open' }, {}, 'PATCH')).status, 400);
      assert.equal((await call(`/api/moderation/reports/${reported.body.data.id}`, student.token, { status: 'resolved' }, {}, 'PATCH')).status, 403);

      const [stored] = await owner`select reporter_id, target_kind, reason from public.content_reports where public_id = ${reported.body.data.id}`;
      const [reporter] = await owner`select id from public.profiles where public_id = ${student.publicId}`;
      assert.equal(stored.reporter_id, reporter.id);
      assert.equal(stored.target_kind, 'listing');
      assert.equal(stored.reason, 'Spam listing');
      const ownReports = await withUser(student.id, tx => tx`select public_id, status from public.content_reports`);
      assert.deepEqual(ownReports.map(report => ({ ...report })), [{ public_id: reported.body.data.id, status: 'open' }]);
      await assert.rejects(withUser(student.id, tx => tx`insert into public.content_reports
        (reporter_id, target_kind, target_public_id, reason)
        values (${reporter.id}, 'listing', ${listing.body.data.id}, 'Spoofed reporter')`));
    });

    await t.test('moderators can hide and restore content; ordinary readers and RLS cannot see hidden rows', async () => {
      const moderation = await call('/api/moderation/content?kind=listing', moderator.token);
      assert.equal(moderation.status, 200);
      const row = moderation.body.data.find((item: { id: string }) => item.id === listing.body.data.id);
      assert.equal(row.hidden, false);
      assert.equal(row.open_reports, 1);
      assert.deepEqual(row.author, { name: 'Test moderator' });
      assert.equal(row.body.length <= 300, true);

      const hidden = await call(`/api/moderation/content/listing/${listing.body.data.id}`, moderator.token, { hidden: true }, {}, 'PATCH');
      assert.equal(hidden.status, 200, JSON.stringify(hidden.body));
      assert.deepEqual(hidden.body.data, { id: listing.body.data.id, kind: 'listing', hidden: true });
      assert(!((await call('/api/listings?limit=100', student.token)).body.data as { id: string }[]).some(item => item.id === listing.body.data.id));
      assert(!((await call('/api/listings?limit=100', moderator.token)).body.data as { id: string }[]).some(item => item.id === listing.body.data.id));
      assert.equal((await call('/api/reports', student.token, {
        kind: 'listing', id: listing.body.data.id, reason: 'Hidden content is not reportable',
      })).status, 404);
      assert.equal((await call('/api/moderation/reports', moderator.token)).body.data.some((item: { id: string }) => item.id === listingReportId), false);
      const resolved = await call('/api/moderation/reports?status=resolved', moderator.token);
      const resolvedReport = resolved.body.data.find((item: { id: string }) => item.id === listingReportId);
      assert.equal(resolvedReport.status, 'resolved');
      assert.equal(resolvedReport.target_hidden, true);
      const [privileges] = await owner`select
        has_column_privilege('hootus_api', 'public.listings', 'hidden_at', 'UPDATE') as listings,
        has_column_privilege('hootus_api', 'public.feed_posts', 'hidden_at', 'UPDATE') as feed_posts,
        has_column_privilege('hootus_api', 'public.club_posts', 'hidden_at', 'UPDATE') as club_posts`;
      assert.deepEqual({ ...privileges }, { listings: false, feed_posts: false, club_posts: false });
      assert.equal((await withUser(student.id, tx => tx`select public_id from public.listings where public_id = ${listing.body.data.id}`)).length, 0);
      assert.equal((await withUser(moderator.id, tx => tx`select public_id from public.listings where public_id = ${listing.body.data.id}`)).length, 1);

      const restored = await call(`/api/moderation/content/listing/${listing.body.data.id}`, moderator.token, { hidden: false }, {}, 'PATCH');
      assert.equal(restored.status, 200);
      assert((await call('/api/listings?limit=100', student.token)).body.data.some((item: { id: string }) => item.id === listing.body.data.id));
      const manuallyResolved = await call('/api/reports', student.token, {
        kind: 'listing', id: listing.body.data.id, reason: 'Manual resolution test',
      });
      assert.equal(manuallyResolved.status, 201);
      const resolvedByModerator = await call(`/api/moderation/reports/${manuallyResolved.body.data.id}`, moderator.token, { status: 'resolved' }, {}, 'PATCH');
      assert.equal(resolvedByModerator.status, 200);
      assert.equal(resolvedByModerator.body.data.status, 'resolved');
    });

    await t.test('dismissal, feed and club-post filters, and deletion resolve open reports', async () => {
      const feedReport = await call('/api/reports', student.token, {
        kind: 'feed_post', id: perk.body.data.id, reason: 'Please review this perk',
      });
      assert.equal(feedReport.status, 201);
      const dismissed = await call(`/api/moderation/reports/${feedReport.body.data.id}`, moderator.token, { status: 'dismissed' }, {}, 'PATCH');
      assert.equal(dismissed.status, 200, JSON.stringify(dismissed.body));
      assert.equal(dismissed.body.data.status, 'dismissed');
      const feedVisibilityReport = await call('/api/reports', student.token, {
        kind: 'feed_post', id: perk.body.data.id, reason: 'Check feed visibility',
      });
      assert.equal(feedVisibilityReport.status, 201);
      const hiddenPerk = await call(`/api/moderation/content/feed_post/${perk.body.data.id}`, moderator.token, { hidden: true }, {}, 'PATCH');
      assert.equal(hiddenPerk.status, 200);
      assert(!((await call('/api/feed', student.token)).body.data as { id: string }[]).some(item => item.id === perk.body.data.id));
      assert((await call('/api/moderation/reports?status=resolved', moderator.token)).body.data.some((item: { id: string }) => item.id === feedVisibilityReport.body.data.id));
      assert.equal((await call(`/api/moderation/content/feed_post/${perk.body.data.id}`, moderator.token, { hidden: false }, {}, 'PATCH')).status, 200);
      assert((await call('/api/feed', student.token)).body.data.some((item: { id: string }) => item.id === perk.body.data.id));

      const clubReport = await call('/api/reports', student.token, {
        kind: 'club_post', id: clubPost.body.data.id, reason: 'Please review this club post',
      });
      assert.equal(clubReport.status, 201);
      assert.equal((await call(`/api/campus/actions/save/${clubPost.body.data.id}`, student.token, { active: true }, {}, 'PUT')).status, 200);
      const hiddenPost = await call(`/api/moderation/content/club_post/${clubPost.body.data.id}`, moderator.token, { hidden: true }, {}, 'PATCH');
      assert.equal(hiddenPost.status, 200);
      assert(!((await call('/api/campus', student.token)).body.data.posts as { id: string }[]).some(item => item.id === clubPost.body.data.id));
      assert(!((await call('/api/campus', student.token)).body.data.savedPosts as { id: string }[]).some(item => item.id === clubPost.body.data.id));
      assert.equal((await call(`/api/campus/actions/like/${clubPost.body.data.id}`, student.token, { active: true }, {}, 'PUT')).status, 404);
      const restoredPost = await call(`/api/moderation/content/club_post/${clubPost.body.data.id}`, moderator.token, { hidden: false }, {}, 'PATCH');
      assert.equal(restoredPost.status, 200);
      assert((await call('/api/campus', student.token)).body.data.posts.some((item: { id: string }) => item.id === clubPost.body.data.id));
      assert((await call('/api/campus', student.token)).body.data.savedPosts.some((item: { id: string }) => item.id === clubPost.body.data.id));

      const deletionReport = await call('/api/reports', student.token, {
        kind: 'club_post', id: clubPost.body.data.id, reason: 'Delete this reported post',
      });
      assert.equal(deletionReport.status, 201);
      const deleted = await call(`/api/moderation/content/club_post/${clubPost.body.data.id}`, moderator.token, undefined, {}, 'DELETE');
      assert.equal(deleted.status, 200, JSON.stringify(deleted.body));
      assert.deepEqual(deleted.body.data, { id: clubPost.body.data.id });
      assert(!((await call('/api/campus', student.token)).body.data.posts as { id: string }[]).some(item => item.id === clubPost.body.data.id));
      const resolved = await call('/api/moderation/reports?status=resolved', moderator.token);
      const deletedReport = resolved.body.data.find((item: { id: string }) => item.id === deletionReport.body.data.id);
      assert.equal(deletedReport.target_hidden, null);
      assert.equal(deletedReport.target_title, null);
      const dismissAgain = await call(`/api/moderation/reports/${feedReport.body.data.id}`, moderator.token, { status: 'resolved' }, {}, 'PATCH');
      assert.equal(dismissAgain.status, 404);
      assert.equal((await call(`/api/moderation/content/listing/${listing.body.data.id}`, moderator.token, { hidden: 'yes' }, {}, 'PATCH')).status, 400);
      assert.equal((await call(`/api/moderation/content/unknown/${listing.body.data.id}`, moderator.token, undefined, {}, 'DELETE')).status, 400);
      assert.equal((await call(`/api/moderation/content/listing/${listing.body.data.id}`, student.token, { hidden: true }, {}, 'PATCH')).status, 403);
      assert.equal((await call(`/api/moderation/content/feed_post/${perk.body.data.id}`, moderator.token, undefined, {}, 'DELETE')).status, 200);
      assert(!((await call('/api/feed', student.token)).body.data as { id: string }[]).some(item => item.id === perk.body.data.id));
    });
  } finally {
    await fixture.cleanup();
  }
});
