-- hootus_api has no update grant on profiles.role; admins change roles only here.
-- Caller and target rows are locked in id order, so reciprocal changes by two
-- admins wait instead of deadlocking; the waiting call then re-checks the
-- caller's role and is refused if it was demoted. Admins cannot change their own role.
create function private.set_profile_role(target uuid, new_role text)
returns table (id uuid, full_name text, role text, avatar_url text, created_at timestamptz)
language plpgsql volatile security definer set search_path = ''
as $$
declare
  caller bigint := (select private.current_profile_id());
begin
  if (select private.current_role()) is distinct from 'admin' then
    raise exception 'admin role required' using errcode = '42501';
  end if;
  perform 1 from public.profiles p
  where p.id = caller or p.public_id = target
  order by p.id
  for update;
  if not exists (select 1 from public.profiles p where p.id = caller and p.role = 'admin') then
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
