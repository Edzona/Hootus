-- Replace browser push with a daily email digest, and expand in-app Activity
-- notifications to cover listings, club posts, club events, and club memberships.

-- 1. Remove browser push.
drop function if exists private.claim_listing_push(uuid);
drop function if exists private.finish_listing_push(uuid, boolean, text[], text[]);
drop function if exists private.save_push_subscription(text, text, text);
drop function if exists private.claim_message_push(uuid);
drop function if exists private.finish_notification_push(uuid, text, text[], text[]);
drop table if exists public.push_subscriptions;
drop index if exists public.notifications_one_unread_listing;
alter table public.notifications
  drop column if exists push_status,
  drop column if exists push_attempted_at,
  drop column if exists first_listing_id;

-- 2. Expand notifications schema for club posts, events, and membership requests.
alter table public.notifications
  drop constraint if exists notifications_kind_check,
  add constraint notifications_kind_check
    check (kind in ('listing', 'club_post', 'club_event', 'club_join_request', 'club_join_accepted')),
  add column club_id bigint references public.clubs(id) on delete cascade,
  add column club_post_id bigint references public.club_posts(id) on delete cascade,
  add column club_event_id bigint references public.club_events(id) on delete cascade,
  add constraint notifications_club_post_check
    check (kind <> 'club_post' or (club_id is not null and club_post_id is not null)),
  add constraint notifications_club_event_check
    check (kind <> 'club_event' or (club_id is not null and club_event_id is not null)),
  add constraint notifications_club_join_check
    check (kind not in ('club_join_request', 'club_join_accepted') or club_id is not null);

create index if not exists notifications_listing_idx on public.notifications (listing_id);
create index if not exists notifications_club_idx on public.notifications (club_id);
create index if not exists notifications_club_post_idx on public.notifications (club_post_id);
create index if not exists notifications_club_event_idx on public.notifications (club_event_id);
create index if not exists notifications_actor_idx on public.notifications (actor_id);

-- 3. In-app notification triggers (one row per activity item).
create or replace function private.notify_listing()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, kind, actor_id, listing_id)
  select p.id, 'listing', new.author_id, new.id
  from public.profiles p
  where p.id <> new.author_id and p.role <> 'partner';
  return new;
exception when foreign_key_violation then
  return new;
end;
$$;
revoke all on function private.notify_listing() from public, anon, authenticated, hootus_api;

create or replace function private.notify_club_post()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, kind, actor_id, club_id, club_post_id)
  select distinct r.profile_id, 'club_post', new.author_id, new.club_id, new.id
  from (
    select f.profile_id from public.club_follows f where f.club_id = new.club_id
    union
    select m.profile_id from public.club_members m where m.club_id = new.club_id and m.status = 'approved'
  ) r
  join public.profiles p on p.id = r.profile_id
  where r.profile_id <> new.author_id
    and p.role <> 'partner';
  return new;
exception when foreign_key_violation then
  return new;
end;
$$;
revoke all on function private.notify_club_post() from public, anon, authenticated, hootus_api;

create trigger club_posts_notify
after insert on public.club_posts
for each row
execute function private.notify_club_post();

create or replace function private.notify_club_event()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  actor bigint := private.current_profile_id();
begin
  insert into public.notifications (recipient_id, kind, actor_id, club_id, club_event_id)
  select distinct r.profile_id, 'club_event', actor, new.club_id, new.id
  from (
    select f.profile_id from public.club_follows f where f.club_id = new.club_id
    union
    select m.profile_id from public.club_members m where m.club_id = new.club_id and m.status = 'approved'
  ) r
  join public.profiles p on p.id = r.profile_id
  where r.profile_id is distinct from actor
    and p.role <> 'partner';
  return new;
exception when foreign_key_violation then
  return new;
end;
$$;
revoke all on function private.notify_club_event() from public, anon, authenticated, hootus_api;

create trigger club_events_notify
after insert on public.club_events
for each row
execute function private.notify_club_event();

create or replace function private.notify_club_join_request()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, kind, actor_id, club_id)
  select distinct mgr.profile_id, 'club_join_request', new.profile_id, new.club_id
  from (
    select c.leader_id as profile_id from public.clubs c where c.id = new.club_id and c.leader_id is not null
    union
    select m.profile_id from public.club_members m
    where m.club_id = new.club_id and m.status = 'approved' and m.role = 'manager'
  ) mgr
  where mgr.profile_id <> new.profile_id;
  return new;
exception when foreign_key_violation then
  return new;
end;
$$;
revoke all on function private.notify_club_join_request() from public, anon, authenticated, hootus_api;

create trigger club_members_request_notify
after insert on public.club_members
for each row when (new.status = 'pending')
execute function private.notify_club_join_request();

create or replace function private.notify_club_join_accepted()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  actor bigint := private.current_profile_id();
begin
  if new.profile_id is distinct from actor then
    insert into public.notifications (recipient_id, kind, actor_id, club_id)
    values (new.profile_id, 'club_join_accepted', actor, new.club_id);
  end if;
  return new;
exception when foreign_key_violation then
  return new;
end;
$$;
revoke all on function private.notify_club_join_accepted() from public, anon, authenticated, hootus_api;

create trigger club_members_accepted_notify
after update of status on public.club_members
for each row when (old.status is distinct from 'approved' and new.status = 'approved')
execute function private.notify_club_join_accepted();

-- 4. Digest preferences. digest_sent_at is the start of the next digest's window.
alter table public.profiles
  add column email_digest boolean not null default true,
  add column digest_sent_at timestamptz not null default now();
grant update (email_digest) on public.profiles to hootus_api;

-- 5. Digest delivery runs from a scheduled job, not as a member, so these functions
-- are executable only by the server login (hootus_server), never by hootus_api.
grant usage on schema private to hootus_server;

-- Claims the next batch of members who have new listings, followed-club posts,
-- or promotional offers, moving their window forward so a second run cannot send twice.
create or replace function private.claim_digests(batch integer)
returns table (
  profile_id uuid,
  email text,
  full_name text,
  since timestamptz,
  total integer,
  listings jsonb,
  club_posts jsonb,
  offers jsonb
)
language sql volatile security definer set search_path = ''
as $$
  with due as (
    select p.id, p.public_id, p.email, p.full_name, p.digest_sent_at as since
    from public.profiles p
    join auth.users u on u.id = p.auth_user_id and u.email_confirmed_at is not null
    where p.email_digest and p.role <> 'partner'
      and (
        exists (
          select 1 from public.listings l
          where l.status = 'active' and l.author_id <> p.id and l.created_at > p.digest_sent_at
        )
        or exists (
          select 1 from public.club_posts cp
          where cp.author_id <> p.id and cp.created_at > p.digest_sent_at
            and (
              exists (select 1 from public.club_follows f where f.club_id = cp.club_id and f.profile_id = p.id)
              or exists (select 1 from public.club_members m where m.club_id = cp.club_id and m.profile_id = p.id and m.status = 'approved')
            )
        )
        or exists (
          select 1 from public.feed_posts fp
          where fp.kind = 'perk' and fp.author_id <> p.id and fp.created_at > p.digest_sent_at
        )
      )
    order by p.id
    limit batch
    for update of p skip locked
  ), claimed as (
    update public.profiles p set digest_sent_at = now()
    from due d where p.id = d.id
    returning p.id
  ), summary as (
    select
      d.public_id, d.email, d.full_name, d.since,
      (select count(*)::int from public.listings l
        where l.status = 'active' and l.author_id <> d.id and l.created_at > d.since) as listing_count,
      (select count(*)::int from public.club_posts cp
        where cp.author_id <> d.id and cp.created_at > d.since
          and (
            exists (select 1 from public.club_follows f where f.club_id = cp.club_id and f.profile_id = d.id)
            or exists (select 1 from public.club_members m where m.club_id = cp.club_id and m.profile_id = d.id and m.status = 'approved')
          )) as post_count,
      (select count(*)::int from public.feed_posts fp
        where fp.kind = 'perk' and fp.author_id <> d.id and fp.created_at > d.since) as offer_count,
      (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select l.public_id as id, l.category, l.title, l.price_jpy::double precision as price_jpy, l.location
        from public.listings l
        where l.status = 'active' and l.author_id <> d.id and l.created_at > d.since
        order by l.created_at desc, l.id desc limit 5
      ) x) as listings,
      (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select cp.public_id as id, c.name as club_name, left(cp.body, 100) as body
        from public.club_posts cp
        join public.clubs c on c.id = cp.club_id
        where cp.author_id <> d.id and cp.created_at > d.since
          and (
            exists (select 1 from public.club_follows f where f.club_id = cp.club_id and f.profile_id = d.id)
            or exists (select 1 from public.club_members m where m.club_id = cp.club_id and m.profile_id = d.id and m.status = 'approved')
          )
        order by cp.created_at desc, cp.id desc limit 5
      ) x) as club_posts,
      (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select fp.public_id as id, fp.title, fp.business_name
        from public.feed_posts fp
        where fp.kind = 'perk' and fp.author_id <> d.id and fp.created_at > d.since
        order by fp.created_at desc, fp.id desc limit 5
      ) x) as offers
    from due d join claimed c on c.id = d.id
  )
  select s.public_id, s.email, s.full_name, s.since,
    (s.listing_count + s.post_count + s.offer_count) as total,
    s.listings, s.club_posts, s.offers
  from summary s
$$;

-- Puts a member's window back when their email could not be sent.
create function private.revert_digest(profile_public_id uuid, previous timestamptz)
returns boolean
language sql volatile security definer set search_path = ''
as $$
  with reverted as (
    update public.profiles set digest_sent_at = previous
    where public_id = profile_public_id and digest_sent_at > previous
    returning 1
  )
  select exists (select 1 from reverted)
$$;

-- One-click unsubscribe from the email link (the server verifies a signed token first).
create function private.set_email_digest(profile_public_id uuid, enabled boolean)
returns boolean
language sql volatile security definer set search_path = ''
as $$
  with changed as (
    update public.profiles set email_digest = enabled
    where public_id = profile_public_id
    returning 1
  )
  select exists (select 1 from changed)
$$;

revoke all on function private.claim_digests(integer) from public, anon, authenticated, hootus_api;
revoke all on function private.revert_digest(uuid, timestamptz) from public, anon, authenticated, hootus_api;
revoke all on function private.set_email_digest(uuid, boolean) from public, anon, authenticated, hootus_api;
grant execute on function private.claim_digests(integer) to hootus_server;
grant execute on function private.revert_digest(uuid, timestamptz) to hootus_server;
grant execute on function private.set_email_digest(uuid, boolean) to hootus_server;
