-- Partners may only see their own listings (listings_partner_scope), so the
-- security-definer contact lookup applies the same rule.
create or replace function private.listing_contact_email(listing_public_id uuid)
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
    and (select private.current_role()) is not null
    and ((select private.current_role()) <> 'partner' or l.author_id = (select private.current_profile_id()));
$$;
revoke all on function private.listing_contact_email(uuid) from public, anon, authenticated, hootus_api;
grant execute on function private.listing_contact_email(uuid) to hootus_api;

-- can_manage_club always trusts clubs.leader_id, so founders stay approved
-- managers: UpdateClubMember and LeaveClubMembership skip them, and earlier
-- demotions or departures are restored.
update public.club_members m set role = 'manager', status = 'approved'
from public.clubs c
where m.club_id = c.id and m.profile_id = c.leader_id
  and (m.role <> 'manager' or m.status <> 'approved');

insert into public.club_members (club_id, profile_id, role, status)
select id, leader_id, 'manager', 'approved'
from public.clubs
where leader_id is not null
on conflict (club_id, profile_id) do nothing;
