-- hootus_api has no update grant on profiles.role; admins change roles only here.
-- Locking the caller's row serializes concurrent role changes, so two admins
-- cannot demote each other at once, and an admin cannot change their own role.
create function private.set_profile_role(target uuid, new_role text)
returns table (id uuid, full_name text, role text, avatar_url text, created_at timestamptz)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  caller bigint;
begin
  if (select private.current_role()) is distinct from 'admin' then
    raise exception 'admin role required' using errcode = '42501';
  end if;
  select p.id into caller from public.profiles p
  where p.id = (select private.current_profile_id()) and p.role = 'admin'
  for update;
  if caller is null then
    raise exception 'admin role required' using errcode = '42501';
  end if;
  if exists (select 1 from public.profiles p where p.public_id = target and p.id = caller) then
    raise exception 'admins cannot change their own role' using errcode = '42501';
  end if;
  return query
  update public.profiles p set role = new_role
  where p.public_id = target
  returning p.public_id, p.full_name, p.role, p.avatar_url, p.created_at;
end;
$$;
revoke all on function private.set_profile_role(uuid, text) from public, anon, authenticated, hootus_api;
grant execute on function private.set_profile_role(uuid, text) to hootus_api;
