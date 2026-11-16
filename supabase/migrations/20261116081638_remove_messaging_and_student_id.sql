-- Remove in-app messaging (replaced by direct @temple.edu email contact),
-- remove student_id from profiles, and add seller email lookup for active listings.

-- 1. Remove messaging triggers and functions.
drop trigger if exists messages_notify on public.messages;
drop trigger if exists messages_touch_conversation on public.messages;
drop function if exists private.notify_message();
drop function if exists private.touch_conversation();
drop function if exists private.claim_message_push(uuid);
drop function if exists private.claim_message_email(uuid);

-- 2. Clean up message notifications while preserving listing notifications.
delete from public.notifications where kind = 'message';
drop index if exists public.notifications_one_unread_conversation;
alter table public.notifications
  drop constraint if exists notifications_check,
  drop constraint if exists notifications_kind_check,
  drop column if exists conversation_id,
  drop column if exists first_message_id;
alter table public.notifications
  add constraint notifications_kind_check check (kind in ('listing'));

-- 3. Drop messaging tables.
drop table if exists public.messages cascade;
drop table if exists public.conversations cascade;

-- 4. Remove student_id from profiles and update auth profile sync trigger.
revoke update on public.profiles from hootus_api;
grant update (full_name, avatar_url, bio) on public.profiles to hootus_api;
alter table public.profiles drop column if exists student_id;

create or replace function private.sync_auth_profile()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  if new.email is null or new.email !~* '^[a-z0-9._%+-]+@temple[.]edu$' then
    raise exception 'Hootus requires an @temple.edu email address'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    insert into public.profiles (auth_user_id, email, full_name)
    values (
      new.id,
      lower(new.email),
      coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name')
    );
  else
    update public.profiles set email = lower(new.email) where auth_user_id = new.id;
  end if;
  return new;
end;
$$;

-- 5. Seller email lookup for active listings (authenticated TUJ members only).
create function private.listing_contact_email(listing_public_id uuid)
returns table (
  email text,
  seller_name text
)
language sql stable security definer set search_path = ''
as $$
  select p.email, coalesce(nullif(btrim(p.full_name), ''), 'TUJ Student')
  from public.listings l
  join public.profiles p on p.id = l.author_id
  where l.public_id = listing_public_id
    and l.status = 'active'
    and (select private.current_role()) is not null;
$$;
revoke all on function private.listing_contact_email(uuid) from public, anon, authenticated, hootus_api;
grant execute on function private.listing_contact_email(uuid) to hootus_api;
