-- Browser push: one row per browser/device that turned notifications on.
-- The endpoint is a URL on the browser vendor's push service (Google, Mozilla,
-- Microsoft, Apple). p256dh and auth are the browser's keys for encrypting payloads.
create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  public_id uuid not null unique default gen_random_uuid(),
  profile_id bigint not null default private.current_profile_id()
    references public.profiles(id) on delete cascade,
  -- Unique: one browser has one endpoint. If another account signs in on the same
  -- browser and subscribes, the row moves to that account (see save function).
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 2048),
  p256dh text not null check (p256dh ~ '^[A-Za-z0-9_-]{80,100}$'),
  auth text not null check (auth ~ '^[A-Za-z0-9_-]{16,32}$'),
  created_at timestamptz not null default now(),
  last_success_at timestamptz
);

create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

alter table public.notifications
  add column push_status text not null default 'pending'
    check (push_status in ('pending', 'sending', 'sent', 'failed', 'skipped')),
  add column push_attempted_at timestamptz;
-- Notifications from before push existed are never pushed.
update public.notifications set push_status = 'skipped';

-- Save (or take over) this browser's subscription for the current member.
-- Security definer because the same endpoint may currently belong to another
-- account that signed in on this browser earlier; members cannot see that row.
create function private.save_push_subscription(sub_endpoint text, sub_p256dh text, sub_auth text)
returns uuid
language sql volatile security definer set search_path = ''
as $$
  insert into public.push_subscriptions (profile_id, endpoint, p256dh, auth)
  select (select private.current_profile_id()), sub_endpoint, sub_p256dh, sub_auth
  where (select private.current_role()) is not null
  on conflict (endpoint) do update set
    profile_id = excluded.profile_id,
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    created_at = now(),
    last_success_at = null
  returning public_id
$$;
revoke all on function private.save_push_subscription(text, text, text) from public, anon, authenticated, hootus_api;
grant execute on function private.save_push_subscription(text, text, text) to hootus_api;

-- Like claim_message_email: the sender's request claims push delivery for the
-- notification its message created, once. Returns one row per recipient device,
-- or a single row with null endpoint when the recipient has no devices.
create function private.claim_message_push(message_public_id uuid)
returns table (
  notification_id uuid,
  conversation_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  sender_name text,
  listing_title text
)
language sql volatile security definer set search_path = ''
as $$
  with claimed as (
    update public.notifications n
    set push_status = 'sending', push_attempted_at = now()
    from public.messages m
    join public.conversations c on c.id = m.conversation_id
    join public.listings l on l.id = c.listing_id
    where m.public_id = message_public_id
      and m.sender_id = (select private.current_profile_id())
      and (select private.current_role()) is not null
      and n.first_message_id = m.id
      and n.push_status = 'pending'
    returning n.public_id, n.recipient_id, c.public_id as conversation, m.sender_id, l.title
  )
  select k.public_id, k.conversation, s.endpoint, s.p256dh, s.auth,
    (select p.full_name from public.profiles p where p.id = k.sender_id), k.title
  from claimed k
  left join public.push_subscriptions s on s.profile_id = k.recipient_id
$$;
revoke all on function private.claim_message_push(uuid) from public, anon, authenticated, hootus_api;
grant execute on function private.claim_message_push(uuid) to hootus_api;

-- Record the push outcome and clean up devices that worked or are gone.
-- dead_endpoints: the push service answered 404/410 (permission revoked, browser
-- data cleared). Only the recipient's own subscriptions can be removed this way.
create function private.finish_notification_push(
  notification_public_id uuid,
  outcome text,
  ok_endpoints text[],
  dead_endpoints text[]
)
returns boolean
language plpgsql volatile security definer set search_path = ''
as $$
declare
  recipient bigint;
begin
  update public.notifications n
  set push_status = outcome
  from public.messages m
  where n.public_id = notification_public_id
    and outcome in ('sent', 'failed', 'skipped')
    and n.push_status = 'sending'
    and m.id = n.first_message_id
    and m.sender_id = (select private.current_profile_id())
    and (select private.current_role()) is not null
  returning n.recipient_id into recipient;
  if recipient is null then
    return false;
  end if;
  update public.push_subscriptions set last_success_at = now()
  where profile_id = recipient and endpoint = any(coalesce(ok_endpoints, '{}'));
  delete from public.push_subscriptions
  where profile_id = recipient and endpoint = any(coalesce(dead_endpoints, '{}'));
  return true;
end;
$$;
revoke all on function private.finish_notification_push(uuid, text, text[], text[])
  from public, anon, authenticated, hootus_api;
grant execute on function private.finish_notification_push(uuid, text, text[], text[]) to hootus_api;

alter table public.push_subscriptions enable row level security;

revoke all on sequence public.push_subscriptions_id_seq from public, anon, authenticated, hootus_api;
revoke all on public.push_subscriptions from public, anon, authenticated, hootus_api;
-- Saving goes through save_push_subscription. Members may list and remove their own.
grant select, delete on public.push_subscriptions to hootus_api;

create policy push_subscriptions_read on public.push_subscriptions for select to hootus_api
using ((select private.current_role()) is not null
  and profile_id = (select private.current_profile_id()));

create policy push_subscriptions_delete on public.push_subscriptions for delete to hootus_api
using ((select private.current_role()) is not null
  and profile_id = (select private.current_profile_id()));
