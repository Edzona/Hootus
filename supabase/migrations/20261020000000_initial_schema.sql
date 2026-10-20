begin;

-- Only the server login can assume the application role. Neither role bypasses RLS.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'hootus_api') then
    create role hootus_api nologin noinherit nobypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'hootus_server') then
    create role hootus_server login noinherit nobypassrls;
  end if;
end;
$$;
grant hootus_api to hootus_server;
grant usage on schema public to hootus_api;
-- Provision the server password outside migrations; never commit credentials.

create table public.profiles (
  id bigint generated always as identity primary key,
  public_id uuid not null unique default gen_random_uuid(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  email text not null check (email ~* '^[a-z0-9._%+-]+@temple[.]edu$'),
  -- Optional at OAuth signup; collect during onboarding. Never a number:
  -- leading zeroes matter. This is self-reported, not proof of enrollment.
  student_id text unique check (student_id ~ '^[0-9]{9}$'),
  full_name text,
  avatar_url text,
  bio text,
  role text not null default 'student'
    check (role in ('student', 'club_leader', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profiles_email_unique on public.profiles (lower(email));

-- Internal functions stay outside the API's public schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated, hootus_api;
grant usage on schema private to hootus_api;

-- Resolve Auth UUID to the relational key without recursive profile RLS.
create function private.current_profile_id()
returns bigint
language sql stable security definer set search_path = ''
as $$
  select id from public.profiles where auth_user_id = (select auth.uid())
$$;
revoke all on function private.current_profile_id() from public, anon, authenticated, hootus_api;
grant execute on function private.current_profile_id() to hootus_api;

create table public.listings (
  id bigint generated always as identity primary key,
  public_id uuid not null unique default gen_random_uuid(),
  author_id bigint not null default private.current_profile_id() references public.profiles(id) on delete cascade,
  category text not null check (category in ('sales', 'housing', 'gigs')),
  title text not null check (length(btrim(title)) > 0),
  description text not null default '',
  price_jpy bigint check (price_jpy between 0 and 9007199254740991),
  image_urls text[] not null default '{}',
  location text,
  status text not null default 'active' check (status in ('active', 'sold', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.feed_posts (
  id bigint generated always as identity primary key,
  public_id uuid not null unique default gen_random_uuid(),
  author_id bigint not null default private.current_profile_id() references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('club_event', 'perk')),
  title text not null check (length(btrim(title)) > 0),
  body text not null default '',
  image_urls text[] not null default '{}',
  room_number text,
  meeting_time timestamptz,
  business_name text,
  coupon_code text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (kind <> 'club_event' or
    (room_number is not null and length(btrim(room_number)) > 0 and meeting_time is not null)),
  check (kind <> 'perk' or
    (business_name is not null and length(btrim(business_name)) > 0))
);

-- Basic direct messages. Conversation/group membership can be added later.
create table public.messages (
  id bigint generated always as identity primary key,
  public_id uuid not null unique default gen_random_uuid(),
  sender_id bigint not null default private.current_profile_id() references public.profiles(id) on delete cascade,
  recipient_id bigint not null references public.profiles(id) on delete cascade,
  body text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now(),
  check (sender_id <> recipient_id)
);

create index listings_author_idx on public.listings(author_id);
create index listings_feed_idx on public.listings(category, status, created_at desc);
create index feed_posts_author_idx on public.feed_posts(author_id);
create index feed_posts_feed_idx on public.feed_posts(kind, created_at desc);
create index messages_sender_idx on public.messages(sender_id, created_at desc);
create index messages_recipient_idx on public.messages(recipient_id, created_at desc);


create function private.sync_auth_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.email is null or new.email !~* '^[a-z0-9._%+-]+@temple[.]edu$' then
    raise exception 'Hootus requires an @temple.edu email address'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    insert into public.profiles (auth_user_id, email, full_name, student_id)
    values (
      new.id,
      lower(new.email),
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
      nullif(btrim(coalesce(
        new.raw_user_meta_data ->> 'student_id',
        new.raw_user_meta_data ->> 'studentId'
      )), '')
    );
    -- Deliberately ignore user metadata role: every signup starts as student.
  else
    update public.profiles set email = lower(new.email) where auth_user_id = new.id;
  end if;
  return new;
end;
$$;

create trigger hootus_auth_user_created
after insert on auth.users
for each row execute function private.sync_auth_profile();

create trigger hootus_auth_email_changed
after update of email on auth.users
for each row execute function private.sync_auth_profile();

-- Check the current Auth record, not editable metadata or a stale JWT email.
-- A confirmed Temple email is required for all authenticated data access.
create function private.current_role()
returns text
language sql stable security definer set search_path = ''
as $$
  select p.role
  from public.profiles p
  join auth.users u on u.id = p.auth_user_id
  where u.id = (select auth.uid())
    and u.email ~* '^[a-z0-9._%+-]+@temple[.]edu$'
    and u.email_confirmed_at is not null
$$;

-- Members may see author display names, never another profile's private fields.
create function private.author_name(profile_id bigint)
returns text
language sql stable security definer set search_path = ''
as $$
  select p.full_name from public.profiles p
  where p.id = profile_id and (select private.current_role()) is not null
$$;
revoke all on function private.author_name(bigint) from public, anon, authenticated;
grant execute on function private.author_name(bigint) to hootus_api;

create function private.set_updated_at()
returns trigger
language plpgsql set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
create trigger listings_updated_at before update on public.listings
for each row execute function private.set_updated_at();
create trigger feed_posts_updated_at before update on public.feed_posts
for each row execute function private.set_updated_at();

revoke all on function private.sync_auth_profile() from public, anon, authenticated, hootus_api;
revoke all on function private.set_updated_at() from public, anon, authenticated, hootus_api;
revoke all on function private.current_role() from public, anon, authenticated, hootus_api;
grant execute on function private.current_role() to hootus_api;

alter table public.profiles enable row level security;
alter table public.listings enable row level security;
alter table public.feed_posts enable row level security;
alter table public.messages enable row level security;

revoke all on sequence public.profiles_id_seq, public.listings_id_seq,
  public.feed_posts_id_seq, public.messages_id_seq from public, anon, authenticated;
grant usage on sequence public.profiles_id_seq, public.listings_id_seq,
  public.feed_posts_id_seq, public.messages_id_seq to hootus_api, service_role;

-- Explicit grants override permissive project defaults. Identity, ownership,
-- roles and creation timestamps cannot be changed by browser clients.
revoke all on public.profiles, public.listings, public.feed_posts, public.messages
  from public, anon, authenticated, hootus_api;
grant select on public.profiles, public.listings, public.feed_posts, public.messages to hootus_api;
grant update (full_name, student_id, avatar_url, bio) on public.profiles to hootus_api;
grant insert (author_id, category, title, description, price_jpy, image_urls, location, status)
  on public.listings to hootus_api;
grant update (category, title, description, price_jpy, image_urls, location, status)
  on public.listings to hootus_api;
grant insert (author_id, kind, title, body, image_urls, room_number, meeting_time,
  business_name, coupon_code, expires_at) on public.feed_posts to hootus_api;
grant update (kind, title, body, image_urls, room_number, meeting_time,
  business_name, coupon_code, expires_at) on public.feed_posts to hootus_api;
grant delete on public.listings, public.feed_posts to hootus_api;
grant insert (sender_id, recipient_id, body) on public.messages to hootus_api;
grant all on public.profiles, public.listings, public.feed_posts, public.messages to service_role;

-- Profiles contain private email/student IDs: only the owner or an admin reads.
create policy profiles_read on public.profiles for select to hootus_api
using ((select private.current_role()) is not null
  and (id = (select private.current_profile_id()) or (select private.current_role()) = 'admin'));
create policy profiles_edit on public.profiles for update to hootus_api
using ((select private.current_role()) is not null and id = (select private.current_profile_id()))
with check ((select private.current_role()) is not null and id = (select private.current_profile_id()));

create policy listings_read on public.listings for select to hootus_api
using ((select private.current_role()) is not null);
create policy listings_create on public.listings for insert to hootus_api
with check ((select private.current_role()) is not null and author_id = (select private.current_profile_id()));
create policy listings_edit on public.listings for update to hootus_api
using ((select private.current_role()) is not null
  and (author_id = (select private.current_profile_id()) or (select private.current_role()) = 'admin'))
with check ((select private.current_role()) is not null
  and (author_id = (select private.current_profile_id()) or (select private.current_role()) = 'admin'));
create policy listings_delete on public.listings for delete to hootus_api
using ((select private.current_role()) is not null
  and (author_id = (select private.current_profile_id()) or (select private.current_role()) = 'admin'));

create policy feed_posts_read on public.feed_posts for select to hootus_api
using ((select private.current_role()) is not null);
create policy feed_posts_create on public.feed_posts for insert to hootus_api
with check (author_id = (select private.current_profile_id()) and (
  (select private.current_role()) = 'admin'
  or ((select private.current_role()) = 'club_leader' and kind = 'club_event')
));
create policy feed_posts_edit on public.feed_posts for update to hootus_api
using (
  (select private.current_role()) = 'admin'
  or ((select private.current_role()) = 'club_leader'
    and author_id = (select private.current_profile_id()) and kind = 'club_event')
)
with check (
  (select private.current_role()) = 'admin'
  or ((select private.current_role()) = 'club_leader'
    and author_id = (select private.current_profile_id()) and kind = 'club_event')
);
create policy feed_posts_delete on public.feed_posts for delete to hootus_api
using (
  (select private.current_role()) = 'admin'
  or ((select private.current_role()) = 'club_leader'
    and author_id = (select private.current_profile_id()) and kind = 'club_event')
);

-- Admins have no special access to private messages. Messages are append-only.
create policy messages_read on public.messages for select to hootus_api
using ((select private.current_role()) is not null
  and ((select private.current_profile_id()) = sender_id or (select private.current_profile_id()) = recipient_id));
create policy messages_send on public.messages for insert to hootus_api
with check ((select private.current_role()) is not null and sender_id = (select private.current_profile_id()));

-- Supabase normally creates this publication; also support a fresh instance.
do $$
begin
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;
end;
$$;
alter publication supabase_realtime add table public.messages;

commit;
