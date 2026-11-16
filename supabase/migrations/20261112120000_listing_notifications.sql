-- New-listing notifications go to every member with notifications turned on
-- (at least one push device), except the seller.
--
-- Grouped like messages: each member has at most one unread "new listings"
-- notification. Further listings raise its count instead of adding rows, and
-- push is sent only when the row is created, so a burst of listings buzzes once.
-- Viewing the listings page marks it read and re-arms it.

alter table public.notifications drop constraint notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check check (kind in ('message', 'listing')),
  -- The newest listing the notification refers to (shown and linked).
  add column listing_id bigint references public.listings(id) on delete cascade,
  -- The listing that created the row; push delivery is tied to it.
  add column first_listing_id bigint references public.listings(id) on delete set null,
  add constraint notifications_listing_check check (kind <> 'listing' or listing_id is not null);

create unique index notifications_one_unread_listing
  on public.notifications (recipient_id)
  where read_at is null and kind = 'listing';

create function private.notify_listing()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, kind, actor_id, listing_id, first_listing_id)
  select distinct s.profile_id, 'listing', new.author_id, new.id, new.id
  from public.push_subscriptions s
  where s.profile_id <> new.author_id
  on conflict (recipient_id) where read_at is null and kind = 'listing'
  do update set
    event_count = public.notifications.event_count + 1,
    actor_id = excluded.actor_id,
    listing_id = excluded.listing_id,
    updated_at = excluded.updated_at;
  return new;
end;
$$;
revoke all on function private.notify_listing() from public, anon, authenticated, hootus_api;

create trigger listings_notify
after insert on public.listings
for each row when (new.status = 'active')
execute function private.notify_listing();

-- The seller's request claims push for the notifications its listing created,
-- once. Returns one row per recipient device. Devices are private, so only this
-- function reads them, and only for the listing's own author.
create function private.claim_listing_push(listing_public_id uuid)
returns table (
  notification_id uuid,
  endpoint text,
  p256dh text,
  auth text,
  author_name text,
  listing_title text,
  category text,
  price_jpy double precision
)
language sql volatile security definer set search_path = ''
as $$
  with claimed as (
    update public.notifications n
    set push_status = 'sending', push_attempted_at = now()
    from public.listings l
    where l.public_id = listing_public_id
      and l.author_id = (select private.current_profile_id())
      and (select private.current_role()) is not null
      and n.kind = 'listing'
      and n.first_listing_id = l.id
      and n.push_status = 'pending'
    returning n.public_id, n.recipient_id, l.author_id, l.title, l.category, l.price_jpy
  )
  select k.public_id, s.endpoint, s.p256dh, s.auth,
    (select p.full_name from public.profiles p where p.id = k.author_id),
    k.title, k.category, k.price_jpy::double precision
  from claimed k
  join public.push_subscriptions s on s.profile_id = k.recipient_id
$$;
revoke all on function private.claim_listing_push(uuid) from public, anon, authenticated, hootus_api;
grant execute on function private.claim_listing_push(uuid) to hootus_api;

-- Record outcomes for every notification the listing created: 'sent' where at
-- least one of the recipient's devices accepted it, otherwise 'failed', or
-- 'skipped' when push is off on the server. Dead devices (404/410) of those
-- recipients are removed. Returns how many notifications were finished.
create function private.finish_listing_push(
  listing_public_id uuid,
  push_enabled boolean,
  ok_endpoints text[],
  dead_endpoints text[]
)
returns integer
language plpgsql volatile security definer set search_path = ''
as $$
declare
  listing bigint;
  recipients bigint[];
begin
  select l.id into listing
  from public.listings l
  where l.public_id = listing_public_id
    and l.author_id = (select private.current_profile_id())
    and (select private.current_role()) is not null;
  if listing is null then
    return 0;
  end if;

  with done as (
    update public.notifications n
    set push_status = case
      when not push_enabled then 'skipped'
      when exists (
        select 1 from public.push_subscriptions s
        where s.profile_id = n.recipient_id
          and s.endpoint = any(coalesce(ok_endpoints, '{}'))
      ) then 'sent'
      else 'failed'
    end
    where n.kind = 'listing'
      and n.first_listing_id = listing
      and n.push_status = 'sending'
    returning n.recipient_id
  )
  select coalesce(array_agg(recipient_id), '{}') into recipients from done;

  update public.push_subscriptions set last_success_at = now()
  where profile_id = any(recipients) and endpoint = any(coalesce(ok_endpoints, '{}'));
  delete from public.push_subscriptions
  where profile_id = any(recipients) and endpoint = any(coalesce(dead_endpoints, '{}'));
  return coalesce(array_length(recipients, 1), 0);
end;
$$;
revoke all on function private.finish_listing_push(uuid, boolean, text[], text[])
  from public, anon, authenticated, hootus_api;
grant execute on function private.finish_listing_push(uuid, boolean, text[], text[]) to hootus_api;
