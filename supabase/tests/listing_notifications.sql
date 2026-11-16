-- Run as postgres in a disposable Supabase project's SQL Editor after migration,
-- like access_control.sql. All fixtures roll back. Any failure raises an exception.
begin;

grant hootus_api to postgres;

-- seller (01), two members with push on (02, 03), one member without push (04)
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  ('50000000-0000-0000-0000-000000000001', 'hootus-ln-seller@temple.edu', now(), '{"full_name":"Sam Seller"}'),
  ('50000000-0000-0000-0000-000000000002', 'hootus-ln-amy@temple.edu', now(), '{}'),
  ('50000000-0000-0000-0000-000000000003', 'hootus-ln-ben@temple.edu', now(), '{}'),
  ('50000000-0000-0000-0000-000000000004', 'hootus-ln-cal@temple.edu', now(), '{}');

set local role hootus_api;

-- Seller also has push on: they must not be notified about their own listing.
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
select private.save_push_subscription('https://fcm.googleapis.com/fcm/send/seller', repeat('S', 87), repeat('s', 22));
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
select private.save_push_subscription('https://fcm.googleapis.com/fcm/send/amy', repeat('A', 87), repeat('a', 22));
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000003', true);
select private.save_push_subscription('https://fcm.googleapis.com/fcm/send/ben-laptop', repeat('B', 87), repeat('b', 22));
select private.save_push_subscription('https://fcm.googleapis.com/fcm/send/ben-phone', repeat('C', 87), repeat('c', 22));

-- Seller posts two listings in a row.
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
create temporary table test_listings (n int, public_id uuid) on commit drop;
grant all on test_listings to hootus_api;
with posted as (
  insert into public.listings (category, title, price_jpy) values ('sales', 'Desk lamp', 800)
  returning public_id
) insert into test_listings select 1, public_id from posted;
with posted as (
  insert into public.listings (category, title, price_jpy) values ('sales', 'Rice cooker', 2500)
  returning public_id
) insert into test_listings select 2, public_id from posted;

-- While the push is still pending, another member cannot claim it (and so never sees devices).
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000004', true);
do $$
begin
  assert (select count(*) = 0 from private.claim_listing_push(
    (select public_id from test_listings where n = 1))), 'Only the author can claim listing push';
end;
$$;
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);

do $$
declare
  claimed int;
begin
  assert (select count(*) = 0 from public.notifications), 'Seller must not be notified about their own listings';

  -- The second listing was grouped into the first one's notifications: nothing to push.
  assert (select count(*) = 0 from private.claim_listing_push(
    (select public_id from test_listings where n = 2))), 'A grouped listing must not push again';

  create temporary table claimed_rows on commit drop as
    select * from private.claim_listing_push((select public_id from test_listings where n = 1));
  assert (select count(*) = 3 from claimed_rows), 'Push must reach Amy''s device and both of Ben''s';
  assert (select count(distinct notification_id) = 2 from claimed_rows), 'One notification each for Amy and Ben';
  assert (select bool_and(author_name = 'Sam Seller' and listing_title = 'Desk lamp'
    and category = 'sales' and price_jpy = 800) from claimed_rows), 'Claim must describe the listing';
  assert (select count(*) = 0 from private.claim_listing_push(
    (select public_id from test_listings where n = 1))), 'Push must only be claimed once';

  -- While delivery is in progress, another member cannot record outcomes or delete devices.
  perform set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000004', true);
  assert private.finish_listing_push((select public_id from test_listings where n = 1), true,
    '{}', array['https://fcm.googleapis.com/fcm/send/amy']) = 0, 'Only the author can finish listing push';
  perform set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);

  -- Amy's device accepted; Ben's laptop is gone (410), his phone failed temporarily.
  claimed := private.finish_listing_push((select public_id from test_listings where n = 1), true,
    array['https://fcm.googleapis.com/fcm/send/amy'],
    array['https://fcm.googleapis.com/fcm/send/ben-laptop']);
  assert claimed = 2, 'Both notifications must be finished';
  assert private.finish_listing_push((select public_id from test_listings where n = 1), true, '{}', '{}') = 0,
    'Outcomes are final';
end;
$$;

-- Another member cannot claim or finish the seller's listing push.
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000004', true);
do $$
begin
  assert (select count(*) = 0 from public.notifications), 'Members without push get no listing notifications';
end;
$$;

-- Amy: one grouped notification for both listings, pointing at the newest one, delivered.
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
do $$
begin
  assert (select count(*) = 1 and min(event_count) = 2 and min(push_status) = 'sent'
    from public.notifications where kind = 'listing'), 'Amy has one delivered notification counting both listings';
  assert (select l.title = 'Rice cooker' from public.notifications n
    join public.listings l on l.id = n.listing_id), 'Notification points at the newest listing';
  assert (select last_success_at is not null from public.push_subscriptions), 'Working device marked';
end;
$$;
-- Amy opens the listings page (same statement as MarkListingNotificationsRead).
update public.notifications set read_at = now() where kind = 'listing' and read_at is null;

-- Ben: notification failed (no device accepted), dead laptop removed, phone kept.
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000003', true);
do $$
begin
  assert (select min(push_status) = 'failed' from public.notifications where kind = 'listing'),
    'Ben''s notification is failed when no device accepted it';
  assert (select count(*) = 1 and bool_and(endpoint like '%/ben-phone') from public.push_subscriptions),
    'Dead device removed, other device kept';
end;
$$;

-- A third listing: Amy (read) gets a fresh notification; Ben (still unread) is only bumped.
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000001', true);
with posted as (
  insert into public.listings (category, title) values ('gigs', 'Moving help')
  returning public_id
) insert into test_listings select 3, public_id from posted;
do $$
begin
  assert (select count(*) = 1 from private.claim_listing_push(
    (select public_id from test_listings where n = 3))), 'Only Amy is re-armed and due a push';
end;
$$;

-- A closed listing being inserted (not active) notifies nobody.
insert into public.listings (category, title, status) values ('sales', 'Old chair', 'closed');
select set_config('request.jwt.claim.sub', '50000000-0000-0000-0000-000000000002', true);
do $$
begin
  assert (select count(*) = 2 from public.notifications where kind = 'listing'),
    'Amy has her read notification and one new one, nothing for the closed listing';
end;
$$;

reset role;
select 'listing notification tests passed' as result;
rollback;
