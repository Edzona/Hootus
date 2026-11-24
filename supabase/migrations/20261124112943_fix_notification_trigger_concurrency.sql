-- Lock recipient profile rows with FOR KEY SHARE SKIP LOCKED in consistent ID order
-- so a concurrent profile deletion (which holds FOR UPDATE) is skipped instead of
-- aborting the bulk notification insert with a foreign_key_violation for every user.
-- FOR KEY SHARE remains compatible with normal profile UPDATEs (FOR NO KEY UPDATE)
-- and other concurrent notification triggers.

create or replace function private.notify_listing()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, kind, actor_id, listing_id)
  select p.id, 'listing', new.author_id, new.id
  from public.profiles p
  where p.id <> new.author_id and p.role <> 'partner'
  order by p.id
  for key share of p skip locked;
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
  select p.id, 'club_post', new.author_id, new.club_id, new.id
  from public.profiles p
  where p.id <> new.author_id
    and p.role <> 'partner'
    and p.id in (
      select f.profile_id from public.club_follows f where f.club_id = new.club_id
      union
      select m.profile_id from public.club_members m where m.club_id = new.club_id and m.status = 'approved'
    )
  order by p.id
  for key share of p skip locked;
  return new;
exception when foreign_key_violation then
  return new;
end;
$$;
revoke all on function private.notify_club_post() from public, anon, authenticated, hootus_api;

create or replace function private.notify_club_event()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  actor bigint := private.current_profile_id();
begin
  insert into public.notifications (recipient_id, kind, actor_id, club_id, club_event_id)
  select p.id, 'club_event', actor, new.club_id, new.id
  from public.profiles p
  where p.id is distinct from actor
    and p.role <> 'partner'
    and p.id in (
      select f.profile_id from public.club_follows f where f.club_id = new.club_id
      union
      select m.profile_id from public.club_members m where m.club_id = new.club_id and m.status = 'approved'
    )
  order by p.id
  for key share of p skip locked;
  return new;
exception when foreign_key_violation then
  return new;
end;
$$;
revoke all on function private.notify_club_event() from public, anon, authenticated, hootus_api;

create or replace function private.notify_club_join_request()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.notifications (recipient_id, kind, actor_id, club_id)
  select p.id, 'club_join_request', new.profile_id, new.club_id
  from public.profiles p
  where p.id <> new.profile_id
    and p.id in (
      select c.leader_id from public.clubs c where c.id = new.club_id and c.leader_id is not null
      union
      select m.profile_id from public.club_members m
      where m.club_id = new.club_id and m.status = 'approved' and m.role = 'manager'
    )
  order by p.id
  for key share of p skip locked;
  return new;
exception when foreign_key_violation then
  return new;
end;
$$;
revoke all on function private.notify_club_join_request() from public, anon, authenticated, hootus_api;
