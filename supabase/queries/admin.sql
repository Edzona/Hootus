/* @name GetUsers */
-- Admin directory: public fields only, never email, student ID or Auth IDs.
select public_id as id, full_name, role, avatar_url, created_at
from public.profiles
order by created_at desc, profiles.id limit :limit!::int offset :offset!::int;

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
