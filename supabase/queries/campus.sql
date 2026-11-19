/* @name GetCampusClubs */
select c.public_id as id, c.slug, c.name, c.handle, c.mark, c.color, c.category, c.org_type,
  c.description, c.meeting, c.location, c.is_sample,
  private.club_follower_count(c.id) as followers,
  exists(select 1 from public.club_follows f where f.club_id = c.id) as following,
  private.club_member_count(c.id) as members,
  (select m.status from public.club_members m
   where m.club_id = c.id and m.profile_id = (select private.current_profile_id())) as membership_status,
  (select m.role from public.club_members m
   where m.club_id = c.id and m.profile_id = (select private.current_profile_id())) as membership_role,
  private.can_manage_club(c.id) as can_post
from public.clubs c
order by c.name limit 100;

/* @name GetCampusEvents */
select e.public_id as id, c.public_id as club, e.slug, e.title,
  e.starts_at, e.ends_at, e.location, e.price, e.event_type, e.poster, e.description, e.note, e.image_urls,
  exists(select 1 from public.club_event_rsvps r where r.event_id = e.id) as attending
from public.club_events e join public.clubs c on c.id = e.club_id
order by e.starts_at, e.id limit 100;

/* @name GetCampusPosts */
select p.public_id as id, c.public_id as club, e.public_id as event,
  p.body as text, p.image_urls, p.created_at,
  private.club_post_like_count(p.id) as likes,
  exists(select 1 from public.club_post_likes l where l.post_id = p.id) as liked,
  exists(select 1 from public.club_post_saves s where s.post_id = p.id) as saved
from public.club_posts p join public.clubs c on c.id = p.club_id
left join public.club_events e on e.id = p.event_id
order by p.created_at desc, p.id desc limit :limit!::int offset :offset!::int;

/* @name GetSavedCampusPosts */
select p.public_id as id, c.public_id as club, e.public_id as event,
  p.body as text, p.image_urls, p.created_at,
  private.club_post_like_count(p.id) as likes,
  exists(select 1 from public.club_post_likes l where l.post_id = p.id) as liked,
  true as saved
from public.club_post_saves s join public.club_posts p on p.id = s.post_id
join public.clubs c on c.id = p.club_id left join public.club_events e on e.id = p.event_id
order by s.created_at desc, s.id desc limit 100;

/* @name GetCampusListings */
select public_id as id, category, title, description, price_jpy, location, is_sample
from public.listings
where status = 'active' and category in ('sales','housing')
order by created_at desc, id desc limit 6;

/* @name SetCampusFollow */
with target as (select id from public.clubs where public_id = :id!::uuid),
added as (
  insert into public.club_follows (club_id)
  select id from target where :active!::boolean on conflict (profile_id,club_id) do nothing
), removed as (
  delete from public.club_follows where club_id in (select id from target) and not :active!::boolean
)
select exists(select 1 from target) as found;

/* @name SetCampusLike */
with target as (select id from public.club_posts where public_id = :id!::uuid),
added as (
  insert into public.club_post_likes (post_id)
  select id from target where :active!::boolean on conflict (profile_id,post_id) do nothing
), removed as (
  delete from public.club_post_likes where post_id in (select id from target) and not :active!::boolean
)
select exists(select 1 from target) as found;

/* @name SetCampusSave */
with target as (select id from public.club_posts where public_id = :id!::uuid),
added as (
  insert into public.club_post_saves (post_id)
  select id from target where :active!::boolean on conflict (profile_id,post_id) do nothing
), removed as (
  delete from public.club_post_saves where post_id in (select id from target) and not :active!::boolean
)
select exists(select 1 from target) as found;

/* @name SetCampusRsvp */
with target as (select id from public.club_events where public_id = :id!::uuid),
added as (
  insert into public.club_event_rsvps (event_id)
  select id from target where :active!::boolean on conflict (profile_id,event_id) do nothing
), removed as (
  delete from public.club_event_rsvps where event_id in (select id from target) and not :active!::boolean
)
select exists(select 1 from target) as found;

/* @name GetPublishableClub */
select c.id::text as internal_id from public.clubs c where c.public_id = :clubId!::uuid
and private.can_manage_club(c.id);

/* @name CreateCampusPost */
insert into public.club_posts (club_id, event_id, body, image_urls)
select :clubInternalId!::bigint, e.id, :text!, :image_urls!
from (select 1) placeholder
left join public.club_events e on e.public_id = :eventId::uuid and e.club_id = :clubInternalId!::bigint
where :eventId::uuid is null or e.id is not null
returning public_id as id;

/* @name CreateCampusEvent */
insert into public.club_events (club_id,title,starts_at,ends_at,location,price,event_type,poster,description,note,image_urls)
values (:clubInternalId!::bigint,:title!,:starts_at!::timestamptz,:ends_at!::timestamptz,:location!,:price!,:event_type!,:poster!,:description!,:note!,:image_urls!)
returning public_id as id;

/* @name RequestClubMembership */
with target as (select id from public.clubs where public_id = :clubId!::uuid),
inserted as (
  insert into public.club_members (club_id)
  select id from target
  on conflict (club_id, profile_id) do nothing
  returning public_id as id, status, role
)
select id, status, role from inserted
union all
select m.public_id as id, m.status, m.role
from public.club_members m
join target t on t.id = m.club_id
where m.profile_id = (select private.current_profile_id())
  and not exists (select 1 from inserted);

/* @name ClearRejectedClubMembership */
with target as (select id from public.clubs where public_id = :clubId!::uuid)
delete from public.club_members m
where m.club_id in (select id from target)
  and m.profile_id = (select private.current_profile_id())
  and m.status = 'rejected';

/* @name LeaveClubMembership */
with target as (select id from public.clubs where public_id = :clubId!::uuid)
delete from public.club_members m
where m.club_id in (select id from target)
  and m.profile_id = (select private.current_profile_id())
  and not exists (select 1 from public.clubs c where c.id = m.club_id and c.leader_id = m.profile_id)
returning m.public_id as id;

/* @name GetClubMembers */
select m.public_id as id, private.author_name(m.profile_id) as name, m.role, m.status, m.created_at,
  (m.profile_id = (select private.current_profile_id())) as is_me
from public.club_members m
join public.clubs c on c.id = m.club_id
where c.public_id = :clubId!::uuid
  and private.can_manage_club(c.id)
order by case when m.status = 'pending' then 0 else 1 end, m.created_at asc;

/* @name UpdateClubMember */
update public.club_members m set
  status = coalesce(:status::text, m.status),
  role = coalesce(:role::text, m.role)
from public.clubs c
where m.club_id = c.id
  and c.public_id = :clubId!::uuid
  and m.public_id = :memberId!::uuid
  and private.can_manage_club(c.id)
  and m.profile_id <> c.leader_id
returning m.public_id as id, private.author_name(m.profile_id) as name, m.role, m.status, m.created_at;

/* @name RemoveClubMember */
delete from public.club_members m
using public.clubs c
where m.club_id = c.id
  and c.public_id = :clubId!::uuid
  and m.public_id = :memberId!::uuid
  and private.can_manage_club(c.id)
  and m.profile_id <> c.leader_id
returning m.public_id as id;

/* @name CreateClubRequest */
insert into public.club_requests (name, handle, category, description, meeting, location, verification_note)
values (:name!, :handle!, :category!, :description!, :meeting!, :location!, :verificationNote!)
returning public_id as id, name, handle, category, description, meeting, location, verification_note, status, review_note, created_at;

/* @name GetMyClubRequests */
select public_id as id, name, handle, category, description, meeting, location, verification_note, status, review_note, created_at, reviewed_at
from public.club_requests
where requester_id = (select private.current_profile_id())
order by created_at desc;

/* @name UpdateClub */
update public.clubs set
  name = :name!,
  category = :category!,
  description = :description!,
  meeting = :meeting!,
  location = :location!,
  mark = :mark!,
  color = :color!
where public_id = :clubId!::uuid
  and private.can_manage_club(id)
returning public_id as id, name, category, description, meeting, location, mark, color, org_type;
