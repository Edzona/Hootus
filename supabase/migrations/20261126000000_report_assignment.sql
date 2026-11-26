alter table public.content_reports
  add column assigned_to bigint references public.profiles(id) on delete set null,
  add column assigned_at timestamptz;

create index content_reports_assigned_to_idx on public.content_reports(assigned_to)
  where assigned_to is not null;

-- Moderators cannot read other profiles under RLS; expose staff public IDs to staff only.
create function private.staff_public_id(profile_id bigint)
returns uuid
language sql stable security definer set search_path = ''
as $$
  select p.public_id from public.profiles p
  where p.id = profile_id and (select private.current_role()) in ('admin', 'moderator')
$$;
revoke all on function private.staff_public_id(bigint) from public, anon, authenticated, hootus_api;
grant execute on function private.staff_public_id(bigint) to hootus_api;

-- Only admins assign open reports, and only to current admins or moderators.
-- The assignee row is share-locked so a concurrent role change waits.
create function private.assign_report(report_id uuid, assignee uuid)
returns table (id uuid, assignee_id uuid, assignee_name text, assigned_at timestamptz)
language plpgsql volatile security definer set search_path = ''
as $$
#variable_conflict use_column
declare
  assignee_profile bigint;
begin
  if (select private.current_role()) is distinct from 'admin' then
    raise exception 'admin role required' using errcode = '42501';
  end if;
  if assignee is not null then
    select p.id into assignee_profile from public.profiles p
    where p.public_id = assignee and p.role in ('admin', 'moderator')
    for share;
    if assignee_profile is null then
      raise exception 'assignee must be a moderator or admin' using errcode = '23514';
    end if;
  end if;
  return query
  update public.content_reports r
  set assigned_to = assignee_profile,
      assigned_at = case when assignee_profile is null then null else now() end
  where r.public_id = report_id and r.status = 'open'
  returning r.public_id, assignee,
    (select p.full_name from public.profiles p where p.id = r.assigned_to), r.assigned_at;
end;
$$;
revoke all on function private.assign_report(uuid, uuid) from public, anon, authenticated, hootus_api;
grant execute on function private.assign_report(uuid, uuid) to hootus_api;
