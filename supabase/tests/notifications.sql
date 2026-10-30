-- Run as postgres in a disposable Supabase project's SQL Editor after migration,
-- like access_control.sql. All fixtures roll back. Any failure raises an exception.
begin;

grant hootus_api to postgres;

-- seller (01), buyer (02), outsider (03)
insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data)
values
  ('20000000-0000-0000-0000-000000000001', 'hootus-notify-seller@temple.edu', now(), '{"full_name":"Sam Seller"}'),
  ('20000000-0000-0000-0000-000000000002', 'hootus-notify-buyer@temple.edu', now(), '{"full_name":"Bea Buyer"}'),
  ('20000000-0000-0000-0000-000000000003', 'hootus-notify-outsider@temple.edu', now(), '{}');

set local role hootus_api;

-- Seller lists a desk.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
insert into public.listings (category, title, price_jpy) values ('sales', 'Notify desk', 1500);

-- Buyer starts a conversation and sends two messages.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
insert into public.conversations (listing_id, seller_id)
select id, author_id from public.listings where title = 'Notify desk';

create temporary table test_messages (n int, public_id uuid) on commit drop;
grant all on test_messages to hootus_api;

with sent as (
  insert into public.messages (conversation_id, recipient_id, body)
  select c.id, c.seller_id, 'Is it available?' from public.conversations c
  returning public_id
) insert into test_messages select 1, public_id from sent;
with sent as (
  insert into public.messages (conversation_id, recipient_id, body)
  select c.id, c.seller_id, 'Can I pick it up today?' from public.conversations c
  returning public_id
) insert into test_messages select 2, public_id from sent;

do $$
declare
  claimed record;
begin
  assert (select count(*) = 0 from public.notifications), 'Buyer must not see the seller''s notification';

  -- Only the first message's email is due, and only once.
  assert (select count(*) = 0 from private.claim_message_email(
    (select public_id from test_messages where n = 2))), 'Second unread message must not email again';
  select * into claimed from private.claim_message_email((select public_id from test_messages where n = 1));
  assert claimed.recipient_email = 'hootus-notify-seller@temple.edu', 'Claim must return the recipient address';
  assert claimed.sender_name = 'Bea Buyer' and claimed.listing_title = 'Notify desk', 'Claim must describe the message';
  assert (select count(*) = 0 from private.claim_message_email(
    (select public_id from test_messages where n = 1))), 'An email must only be claimed once';

  assert not private.finish_notification_email(claimed.notification_id, 'delivered'), 'Unknown outcomes are rejected';
  assert private.finish_notification_email(claimed.notification_id, 'sent'), 'Sender records the outcome';
  assert not private.finish_notification_email(claimed.notification_id, 'failed'), 'An outcome is final';

  begin
    insert into public.notifications (recipient_id, kind, conversation_id)
    select seller_id, 'message', id from public.conversations;
    raise exception 'Members must not create notifications directly';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Outsider sees and changes nothing, and cannot claim or finish.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
do $$
begin
  assert (select count(*) = 0 from public.notifications), 'Outsider must see no notifications';
  assert (select count(*) = 0 from private.claim_message_email(
    (select public_id from test_messages where n = 1))), 'Outsider must not claim another sender''s email';
end;
$$;
update public.notifications set read_at = now();

-- Seller sees one grouped notification, and the email address never leaks to them via claims either.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
do $$
begin
  assert (select count(*) = 1 and min(event_count) = 2 and bool_and(read_at is null)
    from public.notifications), 'Seller must see one unread notification grouping both messages';
  assert (select min(email_status) = 'sent' from public.notifications), 'Email outcome must be recorded';
  assert (select count(*) = 0 from private.claim_message_email(
    (select public_id from test_messages where n = 2))), 'Recipient must not claim the sender''s email';
  begin
    update public.notifications set email_status = 'pending';
    raise exception 'Members must not change delivery status';
  exception when insufficient_privilege then null;
  end;
end;
$$;

-- Seller opens the conversation (same statement as MarkConversationNotificationsRead) and replies.
update public.notifications n set read_at = now()
from public.conversations c where c.id = n.conversation_id and n.read_at is null;
insert into public.messages (conversation_id, recipient_id, body)
select c.id, c.buyer_id, 'Yes, any time after 3.' from public.conversations c;

-- Buyer messages again: the read notification is not reused, a new one is armed.
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
do $$
begin
  assert (select count(*) = 1 and min(email_status) = 'pending' from public.notifications),
    'Buyer must get a notification for the seller''s reply';
end;
$$;
with sent as (
  insert into public.messages (conversation_id, recipient_id, body)
  select c.id, c.seller_id, 'Great, see you then.' from public.conversations c
  returning public_id
) insert into test_messages select 3, public_id from sent;
do $$
begin
  assert (select count(*) = 1 from private.claim_message_email(
    (select public_id from test_messages where n = 3))), 'A new message after reading must email again';
end;
$$;

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);
do $$
begin
  assert (select count(*) = 2 and count(*) filter (where read_at is null) = 1
    from public.notifications), 'Seller keeps the read notification and gets one new unread one';
end;
$$;

reset role;
select 'notifications tests passed' as result;
rollback;
