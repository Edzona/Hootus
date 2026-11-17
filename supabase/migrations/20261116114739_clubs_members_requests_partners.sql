-- Club memberships, club creation requests, club editing, post/event photos,
-- promotional offers, and admin-created partner accounts.

-- 1. Club memberships.
create table public.club_members (
  id bigint generated always as identity primary key,
  public_id uuid not null unique default gen_random_uuid(),
  club_id bigint not null references public.clubs(id) on delete cascade,
  profile_id bigint not null default private.current_profile_id() references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('manager', 'member')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  unique (club_id, profile_id)
);

create index club_members_club_status_idx on public.club_members (club_id, status);
create index club_members_profile_idx on public.club_members (profile_id);

-- Backfill existing club leaders as approved managers.
insert into public.club_members (club_id, profile_id, role, status)
select id, leader_id, 'manager', 'approved'
from public.clubs
where leader_id is not null
on conflict (club_id, profile_id) do nothing;

create function private.can_manage_club(target_club_id bigint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select private.current_role()) = 'admin'
    or exists (
      select 1 from public.clubs c
      where c.id = target_club_id
        and c.leader_id = (select private.current_profile_id())
    )
    or exists (
      select 1 from public.club_members m
      where m.club_id = target_club_id
        and m.profile_id = (select private.current_profile_id())
        and m.status = 'approved'
        and m.role = 'manager'
    );
$$;
revoke all on function private.can_manage_club(bigint) from public, anon, authenticated;
grant execute on function private.can_manage_club(bigint) to hootus_api;

create function private.club_member_count(target_club_id bigint)
returns integer
language sql stable security definer set search_path = ''
as $$
  select count(*)::int from public.club_members m
  where m.club_id = target_club_id and m.status = 'approved';
$$;
revoke all on function private.club_member_count(bigint) from public, anon, authenticated;
grant execute on function private.club_member_count(bigint) to hootus_api;

-- Support optional photos on club posts and club events, and allow club managers to publish.
alter table public.club_posts
  add column image_urls text[] not null default '{}' check (cardinality(image_urls) <= 10);

alter table public.club_events
  add column image_urls text[] not null default '{}' check (cardinality(image_urls) <= 10);

grant insert (image_urls) on public.club_posts to hootus_api;
grant insert (image_urls) on public.club_events to hootus_api;

drop policy if exists "club_posts_publish" on public.club_posts;
create policy "club_posts_publish" on public.club_posts for insert to hootus_api
with check (
  (select private.current_role()) is not null
  and author_id = (select private.current_profile_id())
  and private.can_manage_club(club_id)
);

drop policy if exists "club_events_publish" on public.club_events;
create policy "club_events_publish" on public.club_events for insert to hootus_api
with check (
  (select private.current_role()) is not null
  and private.can_manage_club(club_id)
);

alter table public.club_members enable row level security;
revoke all on sequence public.club_members_id_seq from public, anon, authenticated;
grant usage on sequence public.club_members_id_seq to hootus_api;
revoke all on public.club_members from public, anon, authenticated, hootus_api;
grant select on public.club_members to hootus_api;
grant insert (club_id) on public.club_members to hootus_api;
grant update (role, status) on public.club_members to hootus_api;
grant delete on public.club_members to hootus_api;

create policy club_members_read on public.club_members for select to hootus_api
using (
  (select private.current_role()) is not null
  and (profile_id = (select private.current_profile_id()) or private.can_manage_club(club_id))
);

create policy club_members_request on public.club_members for insert to hootus_api
with check (
  (select private.current_role()) is not null
  and profile_id = (select private.current_profile_id())
  and role = 'member'
  and status = 'pending'
);

create policy club_members_manage on public.club_members for update to hootus_api
using ((select private.current_role()) is not null and private.can_manage_club(club_id))
with check ((select private.current_role()) is not null and private.can_manage_club(club_id));

create policy club_members_delete on public.club_members for delete to hootus_api
using (
  (select private.current_role()) is not null
  and (profile_id = (select private.current_profile_id()) or private.can_manage_club(club_id))
);

-- 2. Club creation requests & admin verification.
create table public.club_requests (
  id bigint generated always as identity primary key,
  public_id uuid not null unique default gen_random_uuid(),
  requester_id bigint not null default private.current_profile_id() references public.profiles(id) on delete cascade,
  name text not null,
  handle text not null,
  category text not null,
  description text not null,
  meeting text not null default '',
  location text not null default '',
  verification_note text not null default '',
  org_type text not null default 'club' check (org_type in ('club', 'partner')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  reviewed_by bigint references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_note text,
  created_at timestamptz not null default now()
);

create index club_requests_status_idx on public.club_requests (status, created_at desc);
create index club_requests_requester_idx on public.club_requests (requester_id);
create index club_requests_reviewed_by_idx on public.club_requests (reviewed_by);

alter table public.club_requests enable row level security;
revoke all on sequence public.club_requests_id_seq from public, anon, authenticated;
grant usage on sequence public.club_requests_id_seq to hootus_api;
revoke all on public.club_requests from public, anon, authenticated, hootus_api;
grant select on public.club_requests to hootus_api;
grant insert (name, handle, category, description, meeting, location, verification_note) on public.club_requests to hootus_api;

create policy club_requests_read on public.club_requests for select to hootus_api
using (
  (select private.current_role()) is not null
  and (requester_id = (select private.current_profile_id()) or (select private.current_role()) = 'admin')
);

create policy club_requests_create on public.club_requests for insert to hootus_api
with check (
  (select private.current_role()) is not null
  and requester_id = (select private.current_profile_id())
  and status = 'pending'
);

create function private.review_club_request(request_public_id uuid, decision text, note text default null)
returns table (
  id uuid,
  name text,
  handle text,
  category text,
  status text,
  review_note text,
  reviewed_at timestamptz
)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  req public.club_requests%rowtype;
  new_club_id bigint;
  clean_handle text;
  clean_slug text;
begin
  if (select private.current_role()) is distinct from 'admin' then
    raise exception 'admin role required' using errcode = '42501';
  end if;
  if decision not in ('approved', 'rejected') then
    raise exception 'invalid decision' using errcode = '22023';
  end if;

  select * into req from public.club_requests r
  where r.public_id = request_public_id and r.status = 'pending'
  for update;
  if not found then
    return;
  end if;

  if decision = 'approved' then
    clean_handle := lower(regexp_replace(req.handle, '[^a-zA-Z0-9_]', '', 'g'));
    if clean_handle = '' then
      clean_handle := 'club_' || substr(req.public_id::text, 1, 6);
    end if;
    clean_slug := clean_handle;
    if exists (select 1 from public.clubs c where lower(c.slug) = clean_slug or lower(c.handle) = clean_handle) then
      clean_slug := clean_handle || '-' || substr(req.public_id::text, 1, 4);
      clean_handle := clean_handle || substr(req.public_id::text, 1, 4);
    end if;

    insert into public.clubs (slug, name, handle, mark, color, category, description, meeting, location, leader_id, is_sample)
    values (
      clean_slug,
      req.name,
      clean_handle,
      upper(substr(req.name, 1, 2)),
      'plum',
      req.category,
      req.description,
      coalesce(nullif(req.meeting, ''), 'TBA'),
      coalesce(nullif(req.location, ''), 'TUJ Campus'),
      req.requester_id,
      false
    )
    returning clubs.id into new_club_id;

    insert into public.club_members (club_id, profile_id, role, status)
    values (new_club_id, req.requester_id, 'manager', 'approved')
    on conflict (club_id, profile_id) do update set role = 'manager', status = 'approved';

    update public.profiles set role = 'club_leader'
    where profiles.id = req.requester_id and profiles.role = 'student';
  end if;

  return query
  update public.club_requests r set
    status = decision,
    reviewed_by = (select private.current_profile_id()),
    reviewed_at = now(),
    review_note = nullif(btrim(coalesce(note, '')), '')
  where r.id = req.id
  returning r.public_id, r.name, r.handle, r.category, r.status, r.review_note, r.reviewed_at;
end;
$$;
revoke all on function private.review_club_request(uuid, text, text) from public, anon, authenticated;
grant execute on function private.review_club_request(uuid, text, text) to hootus_api;

-- 3. Allow club/partner managers to update their club/partner profile details.
grant update (name, category, description, meeting, location, mark, color) on public.clubs to hootus_api;

create policy clubs_edit on public.clubs for update to hootus_api
using ((select private.current_role()) is not null and private.can_manage_club(id))
with check ((select private.current_role()) is not null and private.can_manage_club(id));

-- 4. Distinguish student clubs from third-party partner organizations.
alter table public.clubs
  add column org_type text not null default 'club' check (org_type in ('club', 'partner'));

-- 5. Support 'partner' role on profiles (with external email allowed only for partners).
alter table public.profiles
  drop constraint if exists profiles_role_check,
  drop constraint if exists profiles_email_check;

alter table public.profiles
  add constraint profiles_role_check check (role in ('student', 'club_leader', 'partner', 'admin')),
  add constraint profiles_email_check check (role = 'partner' or email ~* '^[a-z0-9._%+-]+@temple[.]edu$');

-- 6. Allow club leaders, approved club managers, partners, and admins to publish promotional offers (kind = 'perk') in feed_posts.
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

-- 7. Update auth trigger: external emails are permitted only for admin-created partner accounts.
create or replace function private.sync_auth_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
declare
  is_partner boolean := coalesce(new.raw_app_meta_data ->> 'hootus_partner', '') = 'true';
begin
  if new.email is null or (not is_partner and new.email !~* '^[a-z0-9._%+-]+@temple[.]edu$') then
    raise exception 'Hootus requires an @temple.edu email address'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    insert into public.profiles (auth_user_id, email, full_name, role)
    values (
      new.id,
      lower(new.email),
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
      case when is_partner then 'partner' else 'student' end
    );
  else
    update public.profiles set email = lower(new.email) where auth_user_id = new.id;
  end if;
  return new;
end;
$$;

-- 8. Admin-only function to onboard a third-party partner (creates auth user, profile, partner page, and manager membership).
create function private.create_partner_account(
  partner_email text,
  contact_name text,
  org_name text,
  org_handle text,
  org_category text,
  org_description text,
  org_hours text default '',
  org_location text default ''
)
returns table (
  profile_id uuid,
  club_id uuid,
  email text,
  org_name_out text,
  handle text,
  category text
)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  clean_email text := lower(btrim(partner_email));
  clean_handle text := lower(regexp_replace(btrim(org_handle), '[^a-zA-Z0-9_]', '', 'g'));
  clean_slug text;
  new_auth_id uuid := gen_random_uuid();
  new_profile_id bigint;
  new_profile_public_id uuid;
  new_club_id bigint;
  new_club_public_id uuid;
begin
  if (select private.current_role()) is distinct from 'admin' then
    raise exception 'admin role required' using errcode = '42501';
  end if;

  if exists (select 1 from auth.users u where lower(u.email) = clean_email) then
    raise exception 'An account with that email already exists' using errcode = '23505';
  end if;

  if clean_handle = '' then
    clean_handle := 'partner_' || substr(new_auth_id::text, 1, 6);
  end if;
  clean_slug := clean_handle;
  if exists (select 1 from public.clubs c where lower(c.slug) = clean_slug or lower(c.handle) = clean_handle) then
    clean_slug := clean_handle || '-' || substr(new_auth_id::text, 1, 4);
    clean_handle := clean_handle || substr(new_auth_id::text, 1, 4);
  end if;

  insert into auth.users (
    id, instance_id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    confirmation_token, recovery_token, email_change_token_new, email_change,
    created_at, updated_at
  ) values (
    new_auth_id,
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', clean_email, '',
    now(),
    '{"provider":"email","providers":["email"],"hootus_partner":true}',
    jsonb_build_object('full_name', btrim(contact_name)),
    '', '', '', '', now(), now()
  );

  insert into auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  values (
    new_auth_id::text, new_auth_id,
    jsonb_build_object('sub', new_auth_id::text, 'email', clean_email, 'email_verified', true),
    'email', now(), now()
  );

  select p.id, p.public_id into new_profile_id, new_profile_public_id
  from public.profiles p where p.auth_user_id = new_auth_id;

  insert into public.clubs (slug, name, handle, mark, color, category, description, meeting, location, leader_id, is_sample, org_type)
  values (
    clean_slug,
    btrim(org_name),
    clean_handle,
    upper(substr(btrim(org_name), 1, 2)),
    'gold',
    org_category,
    btrim(org_description),
    coalesce(nullif(btrim(org_hours), ''), 'Contact for hours'),
    coalesce(nullif(btrim(org_location), ''), 'Sangenjaya / Tokyo'),
    new_profile_id,
    false,
    'partner'
  )
  returning clubs.id, clubs.public_id into new_club_id, new_club_public_id;

  insert into public.club_members (club_id, profile_id, role, status)
  values (new_club_id, new_profile_id, 'manager', 'approved')
  on conflict (club_id, profile_id) do update set role = 'manager', status = 'approved';

  return query
  select new_profile_public_id, new_club_public_id, clean_email, btrim(org_name), clean_handle, org_category;
end;
$$;
revoke all on function private.create_partner_account(text, text, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function private.create_partner_account(text, text, text, text, text, text, text, text) to hootus_api;

-- 9. Allow verified partner accounts (hootus_partner = 'true' in app_metadata) to pass private.current_role().
create or replace function private.current_role()
returns text
language sql stable security definer set search_path = ''
as $$
  select p.role
  from public.profiles p
  join auth.users u on u.id = p.auth_user_id
  where u.id = (select auth.uid())
    and u.email_confirmed_at is not null
    and (
      u.email ~* '^[a-z0-9._%+-]+@temple[.]edu$'
      or (p.role = 'partner' and coalesce(u.raw_app_meta_data ->> 'hootus_partner', '') = 'true')
    );
$$;

-- 10. Partners only see their own data, enforced once per table by a restrictive policy.
create policy clubs_partner_scope on public.clubs as restrictive for select to hootus_api
using ((select private.current_role()) <> 'partner' or private.can_manage_club(id));

create policy club_events_partner_scope on public.club_events as restrictive for select to hootus_api
using ((select private.current_role()) <> 'partner' or private.can_manage_club(club_id));

create policy club_posts_partner_scope on public.club_posts as restrictive for select to hootus_api
using ((select private.current_role()) <> 'partner' or private.can_manage_club(club_id));

create policy listings_partner_scope on public.listings as restrictive for select to hootus_api
using ((select private.current_role()) <> 'partner' or author_id = (select private.current_profile_id()));

create policy feed_posts_partner_scope on public.feed_posts as restrictive for select to hootus_api
using ((select private.current_role()) <> 'partner' or author_id = (select private.current_profile_id()));
