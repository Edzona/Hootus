-- Run as postgres in a disposable Supabase project's SQL Editor after migration,
-- like access_control.sql. All fixtures roll back. Any failure raises an exception.
begin;

grant hootus_api to postgres;

-- seller (01), members (02, 03), partner (04, external email, admin-created only)
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data, raw_app_meta_data)
values
  ('50000000-0000-0000-0000-000000000001', 'hootus-ln-seller@temple.edu', now(), '{"full_name":"Sam Seller"}', '{}'),
  ('50000000-0000-0000-0000-000000000002', 'hootus-ln-amy@temple.edu', now(), '{"full_name":"Amy"}', '{}'),
  ('50000000-0000-0000-0000-000000000003', 'hootus-ln-ben@temple.edu', now(), '{"full_name":"Ben"}', '{}'),
  ('50000000-0000-0000-0000-000000000004', 'hootus-ln-shop@example.com', now(), '{"full_name":"Shop"}', '{"hootus_partner":true}');

-- Pretend everyone's last digest was yesterday, so today's listings are due.
-- Keep any existing (seeded) profiles out of this test's digest window.
update public.profiles set digest_sent_at = now() + interval '1 hour'
where auth_user_id::text not like '50000000-%';
update public.profiles set digest_sent_at = now() - interval '1 second'
where auth_user_id::text like '50000000-%';

set local role hootus_api;

-- Seller posts two listings in a row.
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
insert into public.listings (category, title, price_jpy) values ('sales', 'Desk lamp', 800);
insert into public.listings (category, title, price_jpy) values ('sales', 'Rice cooker', 2500);
do $$
begin
  assert (select count(*) = 0 from public.notifications), 'Seller must not be notified about their own listings';
end;
$$;

-- Amy: two separate notifications, newest one for Rice cooker.
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
do $$
begin
  assert (select count(*) = 2 from public.notifications where kind = 'listing'),
    'Amy has two separate listing notifications';
  assert (select exists (select 1 from public.notifications n join public.listings l on l.id = n.listing_id where l.title = 'Rice cooker')),
    'Amy has a notification for Rice cooker';
end;
$$;
-- Amy opens the listings page (same statement as MarkListingNotificationsRead).
update public.notifications set read_at = now() where kind = 'listing' and read_at is null;

-- The partner is not notified about listings it cannot see.
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000004', true);
do $$
begin
  assert (select count(*) = 0 from public.notifications), 'Partners get no listing notifications';
end;
$$;

-- A third listing: Amy has 2 read + 1 unread; Ben has 3 unread notifications.
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
insert into public.listings (category, title) values ('gigs', 'Moving help');
-- A closed listing being inserted (not active) notifies nobody.
insert into public.listings (category, title, status) values ('sales', 'Old chair', 'closed');
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
do $$
begin
  assert (select count(*) = 3 and count(*) filter (where read_at is null) = 1 from public.notifications where kind = 'listing'),
    'Amy has two read notifications and one new unread one, nothing for the closed listing';
end;
$$;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000003', true);
do $$
begin
  assert (select count(*) = 3 from public.notifications where kind = 'listing'),
    'Ben has three separate unread notifications for the three active listings';
end;
$$;

-- Members cannot run the digest job; only the server login can.
do $$
begin
  begin
    perform * from private.claim_digests(10);
    raise exception 'Members must not claim digests';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- The digest job (run here as the owner) claims Amy and Ben, not the seller or the partner.
reset role;
do $$
declare
  amy_id uuid;
begin
  create temporary table claimed on commit drop as select * from private.claim_digests(100);
  assert (select count(*) = 2 and bool_and(email in ('hootus-ln-amy@temple.edu', 'hootus-ln-ben@temple.edu'))
    from claimed), 'Digest goes to the members with new listings';
  assert (select bool_and(total = 3 and jsonb_array_length(listings) = 3
    and listings -> 0 ->> 'title' = 'Moving help') from claimed), 'Digest lists the three active listings, newest first';
  assert (select count(*) = 0 from private.claim_digests(100)), 'A digest is claimed only once';

  -- A failed email puts the window back so the next run retries.
  select profile_id into amy_id from claimed where email = 'hootus-ln-amy@temple.edu';
  assert private.revert_digest(amy_id, (select since from claimed where profile_id = amy_id)), 'Digest can be reverted';
  assert (select count(*) = 1 and min(email) = 'hootus-ln-amy@temple.edu' from private.claim_digests(100)),
    'A reverted digest is sent again';

  -- Unsubscribed members are skipped.
  update public.profiles set digest_sent_at = now() - interval '1 second' where public_id = amy_id;
  assert private.set_email_digest(amy_id, false), 'Unsubscribe finds the member';
  assert (select count(*) = 0 from private.claim_digests(100)), 'Unsubscribed members get no digest';
end;
$$;

-- Followed clubs notify followers on new posts and events, grouped per club & kind.
do $$
declare
  seller_id bigint := (select id from public.profiles where auth_user_id = '50000000-0000-0000-0000-000000000001');
  amy_pid bigint := (select id from public.profiles where auth_user_id = '50000000-0000-0000-0000-000000000002');
  v_club_id bigint;
begin
  insert into public.clubs (slug, name, handle, mark, color, category, description, meeting, location, leader_id, is_sample)
  values ('test-notif-club', 'Notif Club', 'notifclub', 'NC', 'plum', 'Arts & culture', 'A test club for notifications.', 'Fri', 'Room 1', seller_id, false)
  returning id into v_club_id;

  -- Amy follows the club; Ben does not.
  insert into public.club_follows (club_id, profile_id) values (v_club_id, amy_pid);
  insert into public.club_posts (club_id, author_id, body) values (v_club_id, seller_id, 'First update');
  insert into public.club_posts (club_id, author_id, body) values (v_club_id, seller_id, 'Second update');
  insert into public.club_events (club_id, title, starts_at, ends_at, location, event_type)
  values (v_club_id, 'Club Meetup', now() + interval '1 day', now() + interval '1 day 2 hours', 'Lobby', 'Meetup');

  assert (select count(*) = 2 from public.notifications where recipient_id = amy_pid and kind = 'club_post'),
    'Follower gets two separate club_post notifications';
  assert (select count(*) = 1 from public.notifications where recipient_id = amy_pid and kind = 'club_event'),
    'Follower gets a club_event notification';
  assert (select count(*) = 0 from public.notifications where recipient_id = seller_id and kind in ('club_post', 'club_event')),
    'Club author does not get notified for own posts/events';

  -- Ben requests to join the club -> manager (seller_id) gets club_join_request;
  -- manager approves -> Ben gets club_join_accepted.
  insert into public.club_members (club_id, profile_id, role, status)
  values (v_club_id, (select id from public.profiles where auth_user_id = '50000000-0000-0000-0000-000000000003'), 'member', 'pending');
  assert (select count(*) = 1 from public.notifications where recipient_id = seller_id and kind = 'club_join_request'),
    'Club manager gets notified of join request';

  perform set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
  update public.club_members m set status = 'approved'
  where m.club_id = v_club_id and m.profile_id = (select id from public.profiles where auth_user_id = '50000000-0000-0000-0000-000000000003');
  assert (select count(*) = 1 from public.notifications
    where recipient_id = (select id from public.profiles where auth_user_id = '50000000-0000-0000-0000-000000000003')
      and kind = 'club_join_accepted'),
    'Requester gets notified when accepted';
end;
$$;

select 'listing notification and digest tests passed' as result;
rollback;
