create or replace function private.review_club_request(request_public_id uuid, decision text, note text default null)
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
    clean_slug := btrim(regexp_replace(clean_handle, '_+', '-', 'g'), '-');
    if clean_slug = '' then
      clean_slug := 'club';
    end if;
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

create or replace function private.create_partner_account(
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
  clean_slug := btrim(regexp_replace(clean_handle, '_+', '-', 'g'), '-');
  if clean_slug = '' then
    clean_slug := 'club';
  end if;
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
