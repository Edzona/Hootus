/* @name CreateListing */
insert into public.listings (author_id, category, title, description, price_jpy, image_urls, location)
values (:authorId!::bigint, :category!, :title!, :description!, :price_jpy, :image_urls!, :location)
returning public_id as id, category, title, description,
price_jpy::double precision as price_jpy, image_urls, location, status,
created_at, updated_at, private.author_name(author_id) as author_name;

/* @name OwnsListingPhotos */
select private.owns_listing_photos(:names!::text[]) as owned;

/* @name GetListings */
select public_id as id, category, title, description,
price_jpy::double precision as price_jpy, image_urls, location, status,
created_at, updated_at, private.author_name(author_id) as author_name,
(author_id = (select private.current_profile_id())) as is_mine
from public.listings
where status = 'active'
  and (:categories::text[] is null or category = any(:categories::text[]))
order by created_at desc, listings.id limit :limit!::int offset :offset!::int;


/* @name SetListingStatus */
-- Only the author can end their own active listing.
update public.listings set status = :status!
where public_id = :id!::uuid
  and author_id = (select private.current_profile_id())
  and status = 'active'
returning public_id as id, status;

/* @name GetMySoldListings */
-- The caller's successful listings, newest first, for their profile.
select public_id as id, category, title,
price_jpy::double precision as price_jpy, image_urls, ended_at
from public.listings
where author_id = (select private.current_profile_id()) and status = 'sold'
order by ended_at desc nulls last, id desc
limit :limit!::int offset :offset!::int;

/* @name GetListingContact */
select email, seller_name from private.listing_contact_email(:id!::uuid);

/* @name UpdateListing */
-- Only the author can edit their own active listing.
update public.listings set
  category = :category!,
  title = :title!,
  description = :description!,
  price_jpy = :price_jpy,
  image_urls = :image_urls!,
  location = :location
where public_id = :id!::uuid
  and author_id = (select private.current_profile_id())
  and status = 'active'
returning public_id as id, category, title, description,
price_jpy::double precision as price_jpy, image_urls, location, status,
created_at, updated_at, private.author_name(author_id) as author_name,
true as is_mine;
