-- Run as postgres in a disposable Supabase project's SQL Editor after migration,
-- like access_control.sql. All fixtures roll back. Any failure raises an exception.
begin;

grant hootus_api to postgres;

-- seller (01), buyer (02), outsider (03)
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  ('40000000-0000-0000-0000-000000000001', 'hootus-push-seller@temple.edu', now(), '{"full_name":"Sam Seller"}'),
  ('40000000-0000-0000-0000-000000000002', 'hootus-push-buyer@temple.edu', now(), '{"full_name":"Bea Buyer"}'),
  ('40000000-0000-0000-0000-000000000003', 'hootus-push-outsider@temple.edu', now(), '{}');

set local role hootus_api;

-- Seller turns on notifications on a laptop and a phone, then lists a desk.
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
select private.save_push_subscription('https://fcm.googleapis.com/fcm/send/laptop', repeat('A', 87), repeat('a', 22));
select private.save_push_subscription('https://fcm.googleapis.com/fcm/send/phone', repeat('B', 87), repeat('b', 22));
insert into public.listings (category, title, price_jpy) values ('sales', 'Push desk', 1500);

-- Outsider has a device of their own.
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000003', true);
select private.save_push_subscription('https://updates.push.services.mozilla.com/wpush/v2/outsider', repeat('C', 87), repeat('c', 22));
do $$
begin
  assert (select count(*) = 1 from public.push_subscriptions), 'Outsider must see only their own device';
  begin
    insert into public.push_subscriptions (endpoint, p256dh, auth)
    values ('https://fcm.googleapis.com/fcm/send/direct', repeat('D', 87), repeat('d', 22));
    raise exception 'Members must save subscriptions through the API function';
  exception when insufficient_privilege then null;
  end;
  begin
    perform private.save_push_subscription('http://fcm.googleapis.com/insecure', repeat('D', 87), repeat('d', 22));
    raise exception 'Non-HTTPS endpoints must be rejected';
  exception when check_violation then null;
  end;
end;
$$;
delete from public.push_subscriptions where endpoint like '%/laptop';

-- Buyer starts a conversation and messages twice.
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true);
insert into public.conversations (listing_id, seller_id)
select id, author_id from public.listings where title = 'Push desk';

create temporary table test_messages (n int, public_id uuid) on commit drop;
grant all on test_messages to hootus_api;
with sent as (
  insert into public.messages (conversation_id, recipient_id, body)
  select c.id, c.seller_id, 'Is it available?' from public.conversations c
  returning public_id
) insert into test_messages select 1, public_id from sent;
with sent as (
  insert into public.messages (conversation_id, recipient_id, body)
  select c.id, c.seller_id, 'Still there?' from public.conversations c
  returning public_id
) insert into test_messages select 2, public_id from sent;

do $$
declare
  notification uuid;
begin
  assert (select count(*) = 0 from public.push_subscriptions), 'Buyer must not see the seller''s devices';
  assert (select count(*) = 0 from private.claim_message_push(
    (select public_id from test_messages where n = 2))), 'A grouped message must not push again';

  create temporary table claimed on commit drop as
    select * from private.claim_message_push((select public_id from test_messages where n = 1));
  assert (select count(*) = 2 from claimed), 'Push must reach both of the seller''s devices (outsider delete had no effect)';
  assert (select bool_and(sender_name = 'Bea Buyer' and listing_title = 'Push desk' and conversation_id is not null)
    from claimed), 'Push claim must describe the message';
  assert (select count(*) = 0 from private.claim_message_push(
    (select public_id from test_messages where n = 1))), 'Push must only be claimed once';

  -- The phone is gone (410). Also try to delete the outsider's device: must not work.
  notification := (select notification_id from claimed limit 1);
  assert private.finish_notification_push(notification, 'sent',
    array['https://fcm.googleapis.com/fcm/send/laptop'],
    array['https://fcm.googleapis.com/fcm/send/phone',
          'https://updates.push.services.mozilla.com/wpush/v2/outsider']), 'Sender records the push outcome';
  assert not private.finish_notification_push(notification, 'failed', '{}', '{}'), 'A push outcome is final';
end;
$$;

-- Seller: the dead phone was removed, the laptop marked working, status recorded.
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
do $$
begin
  assert (select count(*) = 1 and bool_and(endpoint like '%/laptop' and last_success_at is not null)
    from public.push_subscriptions), 'Dead device removed, working device kept';
  assert (select min(push_status) = 'sent' from public.notifications), 'Push outcome must be recorded';
  assert (select count(*) = 0 from private.claim_message_push(
    (select public_id from test_messages where n = 1))), 'Recipient must not claim the sender''s push';
end;
$$;

-- Outsider's device survived the attempted delete. Then the outsider signs in on the
-- seller's laptop browser and subscribes: the endpoint moves to the outsider.
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000003', true);
select private.save_push_subscription('https://fcm.googleapis.com/fcm/send/laptop', repeat('E', 87), repeat('e', 22));
do $$
begin
  assert (select count(*) = 2 from public.push_subscriptions), 'Outsider keeps their device and takes over the laptop';
end;
$$;

-- Seller now has no devices; a new message still claims, with a single null-endpoint row.
update public.notifications set read_at = now();  -- no effect for outsider (RLS), kept for symmetry
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
update public.notifications set read_at = now() where read_at is null;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true);
with sent as (
  insert into public.messages (conversation_id, recipient_id, body)
  select c.id, c.seller_id, 'Hello again' from public.conversations c
  returning public_id
) insert into test_messages select 3, public_id from sent;
do $$
begin
  assert (select count(*) = 1 and bool_and(endpoint is null and notification_id is not null)
    from private.claim_message_push((select public_id from test_messages where n = 3))),
    'Recipient without devices yields one row with a null endpoint';
end;
$$;

reset role;
select 'push tests passed' as result;
rollback;
