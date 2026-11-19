alter table public.profiles
  drop constraint profiles_role_check;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'club_leader', 'partner', 'admin', 'moderator'));

drop policy if exists feed_posts_create on public.feed_posts;
create policy feed_posts_create on public.feed_posts for insert to hootus_api
with check (author_id = (select private.current_profile_id()) and (
  (select private.current_role()) = 'admin'
  or ((select private.current_role()) = 'club_leader' and kind in ('club_event', 'perk'))
  or ((select private.current_role()) = 'partner' and kind = 'perk')
  or (kind = 'perk' and exists (
    select 1 from public.club_members m
    where m.profile_id = (select private.current_profile_id())
      and m.status = 'approved' and m.role = 'manager'
  ))
));

alter table public.listings
  add column hidden_at timestamptz,
  add column hidden_by bigint references public.profiles(id) on delete set null;

alter table public.feed_posts
  add column hidden_at timestamptz,
  add column hidden_by bigint references public.profiles(id) on delete set null;

alter table public.club_posts
  add column hidden_at timestamptz,
  add column hidden_by bigint references public.profiles(id) on delete set null;

create index listings_hidden_by_idx on public.listings(hidden_by) where hidden_by is not null;
create index feed_posts_hidden_by_idx on public.feed_posts(hidden_by) where hidden_by is not null;
create index club_posts_hidden_by_idx on public.club_posts(hidden_by) where hidden_by is not null;

create policy listings_moderation_visibility on public.listings
as restrictive for select to hootus_api
using (hidden_at is null or (select private.current_role()) in ('admin', 'moderator'));

create policy feed_posts_moderation_visibility on public.feed_posts
as restrictive for select to hootus_api
using (hidden_at is null or (select private.current_role()) in ('admin', 'moderator'));

create policy club_posts_moderation_visibility on public.club_posts
as restrictive for select to hootus_api
using (hidden_at is null or (select private.current_role()) in ('admin', 'moderator'));

create table public.content_reports (
  id bigint generated always as identity primary key,
  public_id uuid not null unique default gen_random_uuid(),
  reporter_id bigint not null default private.current_profile_id()
    references public.profiles(id) on delete cascade,
  target_kind text not null check (target_kind in ('listing', 'feed_post', 'club_post')),
  target_public_id uuid not null,
  reason text not null check (reason = btrim(reason) and char_length(reason) between 1 and 500),
  status text not null default 'open' check (status in ('open', 'resolved', 'dismissed')),
  resolved_by bigint references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.content_reports enable row level security;
revoke all on public.content_reports from public, anon, authenticated, hootus_api;
revoke all on sequence public.content_reports_id_seq from public, anon, authenticated, hootus_api;
grant select on public.content_reports to hootus_api;
grant insert (target_kind, target_public_id, reason) on public.content_reports to hootus_api;
grant update (status, resolved_by, resolved_at) on public.content_reports to hootus_api;
grant usage on sequence public.content_reports_id_seq to hootus_api;

create unique index content_reports_one_open_per_reporter_target
  on public.content_reports(reporter_id, target_kind, target_public_id)
  where status = 'open';
create index content_reports_status_created_idx
  on public.content_reports(status, created_at desc);
create index content_reports_open_target_idx
  on public.content_reports(target_kind, target_public_id)
  where status = 'open';
create index content_reports_reporter_id_idx on public.content_reports(reporter_id);
create index content_reports_resolved_by_idx on public.content_reports(resolved_by)
  where resolved_by is not null;

create policy content_reports_insert on public.content_reports
for insert to hootus_api
with check (
  reporter_id = (select private.current_profile_id())
  and status = 'open'
  and (select private.current_role()) is not null
);

create policy content_reports_moderator_read on public.content_reports
for select to hootus_api
using ((select private.current_role()) in ('admin', 'moderator'));

create policy content_reports_reporter_read on public.content_reports
for select to hootus_api
using (reporter_id = (select private.current_profile_id()));

create policy content_reports_moderator_update on public.content_reports
for update to hootus_api
using ((select private.current_role()) in ('admin', 'moderator'))
with check (
  (select private.current_role()) in ('admin', 'moderator')
  and status in ('resolved', 'dismissed')
);

create function private.set_content_hidden(target_kind text, target_id uuid, hide boolean)
returns table (id uuid, kind text, hidden boolean)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  caller_id bigint;
  affected_id uuid;
begin
  if (select private.current_role()) is null
    or (select private.current_role()) not in ('admin', 'moderator') then
    raise exception 'moderator role required' using errcode = '42501';
  end if;
  if target_kind is null or target_kind not in ('listing', 'feed_post', 'club_post') then
    raise exception 'invalid moderation target' using errcode = '22023';
  end if;

  caller_id := (select private.current_profile_id());
  if target_kind = 'listing' then
    update public.listings
    set hidden_at = case when hide then now() else null end,
        hidden_by = case when hide then caller_id else null end
    where public_id = target_id
    returning public_id into affected_id;
  elsif target_kind = 'feed_post' then
    update public.feed_posts
    set hidden_at = case when hide then now() else null end,
        hidden_by = case when hide then caller_id else null end
    where public_id = target_id
    returning public_id into affected_id;
  else
    update public.club_posts
    set hidden_at = case when hide then now() else null end,
        hidden_by = case when hide then caller_id else null end
    where public_id = target_id
    returning public_id into affected_id;
  end if;

  if affected_id is null then
    return;
  end if;

  if hide then
    update public.content_reports
    set status = 'resolved', resolved_by = caller_id, resolved_at = now()
    where content_reports.target_kind = set_content_hidden.target_kind
      and content_reports.target_public_id = target_id
      and status = 'open';
  end if;

  return query select affected_id, target_kind, hide;
end;
$$;
revoke all on function private.set_content_hidden(text, uuid, boolean)
  from public, anon, authenticated, hootus_api;
grant execute on function private.set_content_hidden(text, uuid, boolean) to hootus_api;

create function private.delete_content(target_kind text, target_id uuid)
returns table (id uuid)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  caller_id bigint;
  deleted_id uuid;
begin
  if (select private.current_role()) is null
    or (select private.current_role()) not in ('admin', 'moderator') then
    raise exception 'moderator role required' using errcode = '42501';
  end if;
  if target_kind is null or target_kind not in ('listing', 'feed_post', 'club_post') then
    raise exception 'invalid moderation target' using errcode = '22023';
  end if;

  if target_kind = 'listing' then
    delete from public.listings where public_id = target_id returning public_id into deleted_id;
  elsif target_kind = 'feed_post' then
    delete from public.feed_posts where public_id = target_id returning public_id into deleted_id;
  else
    delete from public.club_posts where public_id = target_id returning public_id into deleted_id;
  end if;

  if deleted_id is null then
    return;
  end if;

  caller_id := (select private.current_profile_id());
  update public.content_reports
  set status = 'resolved', resolved_by = caller_id, resolved_at = now()
  where content_reports.target_kind = delete_content.target_kind
    and content_reports.target_public_id = target_id
    and status = 'open';

  return query select deleted_id;
end;
$$;
revoke all on function private.delete_content(text, uuid)
  from public, anon, authenticated, hootus_api;
grant execute on function private.delete_content(text, uuid) to hootus_api;

create function private.admin_create_club(
  club_name text,
  club_handle text,
  club_category text,
  club_description text,
  club_meeting text,
  club_location text,
  founder_public_id uuid
)
returns table (id uuid)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  founder_id bigint;
  new_club_id bigint;
  new_club_public_id uuid := gen_random_uuid();
  clean_handle text := lower(regexp_replace(btrim(club_handle), '[^a-zA-Z0-9_]', '', 'g'));
  clean_slug text;
begin
  if (select private.current_role()) is distinct from 'admin' then
    raise exception 'admin role required' using errcode = '42501';
  end if;
  if clean_handle is null or clean_handle = '' then
    raise exception 'invalid club handle' using errcode = '22023';
  end if;
  select p.id into founder_id
  from public.profiles p
  where p.public_id = founder_public_id
  for update;
  if founder_id is null then
    return;
  end if;
  if exists (select 1 from public.clubs c where lower(c.handle) = clean_handle) then
    raise exception 'club handle already exists' using errcode = '23505';
  end if;

  clean_slug := btrim(regexp_replace(clean_handle, '_+', '-', 'g'), '-');
  if clean_slug = '' then
    clean_slug := 'club';
  end if;
  if exists (select 1 from public.clubs c where lower(c.slug) = clean_slug) then
    clean_slug := clean_slug || '-' || substr(new_club_public_id::text, 1, 4);
  end if;

  insert into public.clubs (
    public_id, slug, name, handle, mark, color, category, description, meeting, location, leader_id, is_sample, org_type
  )
  values (
    new_club_public_id, clean_slug, btrim(club_name), clean_handle,
    upper(substr(btrim(club_name), 1, 2)), 'plum', club_category, btrim(club_description),
    coalesce(nullif(btrim(club_meeting), ''), 'TBA'),
    coalesce(nullif(btrim(club_location), ''), 'TUJ Campus'),
    founder_id, false, 'club'
  )
  returning clubs.id into new_club_id;

  insert into public.club_members (club_id, profile_id, role, status)
  values (new_club_id, founder_id, 'manager', 'approved')
  on conflict (club_id, profile_id) do update set role = 'manager', status = 'approved';

  update public.profiles
  set role = 'club_leader'
  where profiles.id = founder_id and profiles.role = 'student';

  return query select new_club_public_id;
end;
$$;
revoke all on function private.admin_create_club(text, text, text, text, text, text, uuid)
  from public, anon, authenticated, hootus_api;
grant execute on function private.admin_create_club(text, text, text, text, text, text, uuid)
  to hootus_api;

create function private.transfer_club_founder(club uuid, member uuid)
returns table (id uuid)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  target_club_id bigint;
  new_founder_id bigint;
begin
  if (select private.current_role()) is distinct from 'admin' then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  select c.id into target_club_id
  from public.clubs c
  where c.public_id = club and c.org_type = 'club'
  for update;
  if target_club_id is null then
    return;
  end if;

  select m.profile_id into new_founder_id
  from public.club_members m
  where m.public_id = member
    and m.club_id = target_club_id
    and m.status = 'approved'
  for update;
  if new_founder_id is null then
    return;
  end if;

  update public.clubs c set leader_id = new_founder_id where c.id = target_club_id;
  update public.club_members m
  set role = 'manager', status = 'approved'
  where m.club_id = target_club_id and m.profile_id = new_founder_id;
  update public.profiles p
  set role = 'club_leader'
  where p.id = new_founder_id and p.role = 'student';

  return query select club;
end;
$$;
revoke all on function private.transfer_club_founder(uuid, uuid)
  from public, anon, authenticated, hootus_api;
grant execute on function private.transfer_club_founder(uuid, uuid) to hootus_api;

grant delete on public.clubs to hootus_api;
create policy clubs_admin_delete on public.clubs for delete to hootus_api
using ((select private.current_role()) = 'admin' and org_type = 'club');

create or replace function private.listing_contact_email(listing_public_id uuid)
returns table (email text, seller_name text)
language sql stable security definer set search_path = ''
as $$
  select p.email, coalesce(nullif(btrim(p.full_name), ''), 'TUJ Student')
  from public.listings l
  join public.profiles p on p.id = l.author_id
  where l.public_id = listing_public_id
    and l.status = 'active'
    and l.hidden_at is null
    and (select private.current_role()) is not null
    and ((select private.current_role()) <> 'partner' or l.author_id = (select private.current_profile_id()));
$$;
revoke all on function private.listing_contact_email(uuid) from public, anon, authenticated, hootus_api;
grant execute on function private.listing_contact_email(uuid) to hootus_api;

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
          where l.status = 'active' and l.hidden_at is null
            and l.author_id <> p.id and l.created_at > p.digest_sent_at
        )
        or exists (
          select 1 from public.club_posts cp
          where cp.hidden_at is null and cp.author_id <> p.id and cp.created_at > p.digest_sent_at
            and (
              exists (select 1 from public.club_follows f where f.club_id = cp.club_id and f.profile_id = p.id)
              or exists (select 1 from public.club_members m where m.club_id = cp.club_id and m.profile_id = p.id and m.status = 'approved')
            )
        )
        or exists (
          select 1 from public.feed_posts fp
          where fp.kind = 'perk' and fp.hidden_at is null
            and fp.author_id <> p.id and fp.created_at > p.digest_sent_at
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
        where l.status = 'active' and l.hidden_at is null
          and l.author_id <> d.id and l.created_at > d.since) as listing_count,
      (select count(*)::int from public.club_posts cp
        where cp.hidden_at is null and cp.author_id <> d.id and cp.created_at > d.since
          and (
            exists (select 1 from public.club_follows f where f.club_id = cp.club_id and f.profile_id = d.id)
            or exists (select 1 from public.club_members m where m.club_id = cp.club_id and m.profile_id = d.id and m.status = 'approved')
          )) as post_count,
      (select count(*)::int from public.feed_posts fp
        where fp.kind = 'perk' and fp.hidden_at is null
          and fp.author_id <> d.id and fp.created_at > d.since) as offer_count,
      (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select l.public_id as id, l.category, l.title, l.price_jpy::double precision as price_jpy, l.location
        from public.listings l
        where l.status = 'active' and l.hidden_at is null
          and l.author_id <> d.id and l.created_at > d.since
        order by l.created_at desc, l.id desc limit 5
      ) x) as listings,
      (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select cp.public_id as id, c.name as club_name, left(cp.body, 100) as body
        from public.club_posts cp
        join public.clubs c on c.id = cp.club_id
        where cp.hidden_at is null and cp.author_id <> d.id and cp.created_at > d.since
          and (
            exists (select 1 from public.club_follows f where f.club_id = cp.club_id and f.profile_id = d.id)
            or exists (select 1 from public.club_members m where m.club_id = cp.club_id and m.profile_id = d.id and m.status = 'approved')
          )
        order by cp.created_at desc, cp.id desc limit 5
      ) x) as club_posts,
      (select coalesce(jsonb_agg(x), '[]'::jsonb) from (
        select fp.public_id as id, fp.title, fp.business_name
        from public.feed_posts fp
        where fp.kind = 'perk' and fp.hidden_at is null
          and fp.author_id <> d.id and fp.created_at > d.since
        order by fp.created_at desc, fp.id desc limit 5
      ) x) as offers
    from due d join claimed c on c.id = d.id
  )
  select s.public_id, s.email, s.full_name, s.since,
    (s.listing_count + s.post_count + s.offer_count) as total,
    s.listings, s.club_posts, s.offers
  from summary s
$$;
revoke all on function private.claim_digests(integer) from public, anon, authenticated, hootus_api;
grant execute on function private.claim_digests(integer) to hootus_api;
