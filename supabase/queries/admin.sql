/* @name GetUsers */
-- Admin directory: public fields only, never email, student ID or Auth IDs.
select public_id as id, full_name, role, avatar_url, created_at
from public.profiles
order by created_at desc, profiles.id limit :limit!::int offset :offset!::int;

/* @name GetListings */
select public_id as id, category, title, description,
price_jpy::double precision as price_jpy, image_urls, location, status,
created_at, updated_at, private.author_name(author_id) as author_name
from public.listings
order by created_at desc, listings.id limit :limit!::int offset :offset!::int;

/* @name SetUserRole */
select id, full_name, role, avatar_url, created_at
from private.set_profile_role(:id!::uuid, :role!::text);

/* @name ModerateListing */
update public.listings set
  status = coalesce(:status::text, status),
  title = coalesce(:title::text, title),
  description = coalesce(:description::text, description)
where public_id = :id!::uuid
returning public_id as id, category, title, description,
price_jpy::double precision as price_jpy, image_urls, location, status,
created_at, updated_at, private.author_name(author_id) as author_name;

/* @name DeleteListing */
delete from public.listings where public_id = :id!::uuid
returning public_id as id;

/* @name ModerateFeedPost */
update public.feed_posts set
  title = coalesce(:title::text, title),
  body = coalesce(:body::text, body)
where public_id = :id!::uuid
returning public_id as id, kind, title, body, image_urls, room_number, meeting_time,
business_name, coupon_code, expires_at, created_at, updated_at,
private.author_name(author_id) as author_name;

/* @name DeleteFeedPost */
delete from public.feed_posts where public_id = :id!::uuid
returning public_id as id;

/* @name GetClubRequests */
select r.public_id as id, r.name, r.handle, r.category, r.description, r.meeting, r.location,
  r.verification_note, r.status, r.review_note, r.created_at, r.reviewed_at,
  private.author_name(r.requester_id) as requester_name
from public.club_requests r
order by case when r.status = 'pending' then 0 else 1 end, r.created_at desc
limit :limit!::int offset :offset!::int;

/* @name ReviewClubRequest */
select id, name, handle, category, status, review_note, reviewed_at
from private.review_club_request(:id!::uuid, :decision!::text, :note::text);

/* @name CreatePartnerAccount */
select profile_id, club_id, email, org_name_out as org_name, handle, category
from private.create_partner_account(
  :email!::text, :contactName!::text, :orgName!::text, :handle!::text,
  :category!::text, :description!::text, :hours!::text, :location!::text
);
