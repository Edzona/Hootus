-- Notifications: things a member should hear about, delivered by one or more
-- channels (email now; browser push and an in-app bell later).
--
-- Messages are grouped: while a conversation's notification is unread, new
-- messages bump it instead of creating another row. Email is only sent when a
-- row is created, so a back-and-forth chat sends one email, not one per message.
create table public.notifications (
  id bigint generated always as identity primary key,
  public_id uuid not null unique default gen_random_uuid(),
  recipient_id bigint not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('message')),
  -- Who caused it. Kept nullable so later kinds (club posts) can omit it.
  actor_id bigint references public.profiles(id) on delete set null,
  conversation_id bigint references public.conversations(id) on delete cascade,
  -- The message that created this row; email delivery is tied to it.
  first_message_id bigint references public.messages(id) on delete set null,
  event_count integer not null default 1 check (event_count > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  read_at timestamptz,
  -- Delivery bookkeeping, so email reliability can be measured for the pilot.
  email_status text not null default 'pending'
    check (email_status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  email_attempted_at timestamptz,
  check (kind <> 'message' or conversation_id is not null)
);

create index notifications_recipient_idx on public.notifications (recipient_id, updated_at desc);
-- At most one unread message notification per conversation and recipient.
create unique index notifications_one_unread_conversation
  on public.notifications (recipient_id, conversation_id)
  where read_at is null and kind = 'message';

create function private.notify_message()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, kind, actor_id, conversation_id, first_message_id)
  values (new.recipient_id, 'message', new.sender_id, new.conversation_id, new.id)
  on conflict (recipient_id, conversation_id) where read_at is null and kind = 'message'
  do update set
    event_count = public.notifications.event_count + 1,
    actor_id = excluded.actor_id,
    updated_at = excluded.updated_at;
  return new;
end;
$$;
revoke all on function private.notify_message() from public, anon, authenticated, hootus_api;

create trigger messages_notify
after insert on public.messages
for each row when (new.conversation_id is not null)
execute function private.notify_message();

-- The sender's API request claims the email for the notification its message
-- created. The recipient's address is private (profiles RLS), so only this
-- function reads it, only for the message's own sender, and only once.
create function private.claim_message_email(message_public_id uuid)
returns table (
  notification_id uuid,
  recipient_email text,
  recipient_name text,
  sender_name text,
  listing_title text
)
language sql volatile security definer set search_path = ''
as $$
  update public.notifications n
  set email_status = 'sending', email_attempted_at = now()
  from public.messages m
  join public.conversations c on c.id = m.conversation_id
  join public.listings l on l.id = c.listing_id
  join public.profiles r on r.id = m.recipient_id
  where m.public_id = message_public_id
    and m.sender_id = (select private.current_profile_id())
    and (select private.current_role()) is not null
    and n.first_message_id = m.id
    and n.email_status = 'pending'
  returning n.public_id, r.email, r.full_name,
    (select p.full_name from public.profiles p where p.id = m.sender_id), l.title
$$;
revoke all on function private.claim_message_email(uuid) from public, anon, authenticated, hootus_api;
grant execute on function private.claim_message_email(uuid) to hootus_api;

-- Record the outcome of a claimed email. Only the claiming sender can finish it,
-- and only a row that is still 'sending'.
create function private.finish_notification_email(notification_public_id uuid, outcome text)
returns boolean
language sql volatile security definer set search_path = ''
as $$
  with done as (
    update public.notifications n
    set email_status = outcome
    from public.messages m
    where n.public_id = notification_public_id
      and outcome in ('sent', 'failed', 'skipped')
      and n.email_status = 'sending'
      and m.id = n.first_message_id
      and m.sender_id = (select private.current_profile_id())
      and (select private.current_role()) is not null
    returning 1
  )
  select exists (select 1 from done)
$$;
revoke all on function private.finish_notification_email(uuid, text) from public, anon, authenticated, hootus_api;
grant execute on function private.finish_notification_email(uuid, text) to hootus_api;

alter table public.notifications enable row level security;

revoke all on sequence public.notifications_id_seq from public, anon, authenticated, hootus_api;
revoke all on public.notifications from public, anon, authenticated, hootus_api;
-- Rows are created by the trigger only. Members may read theirs and mark them read.
grant select on public.notifications to hootus_api;
grant update (read_at) on public.notifications to hootus_api;

create policy notifications_read on public.notifications for select to hootus_api
using ((select private.current_role()) is not null
  and recipient_id = (select private.current_profile_id()));

create policy notifications_mark_read on public.notifications for update to hootus_api
using ((select private.current_role()) is not null
  and recipient_id = (select private.current_profile_id()))
with check ((select private.current_role()) is not null
  and recipient_id = (select private.current_profile_id()));
