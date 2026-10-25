/* @name CreateListing */
insert into public.listings (author_id, category, title, description, price_jpy, image_urls, location)
values (:authorId!::bigint, :category!, :title!, :description!, :price_jpy, :image_urls!, :location)
returning public_id as id, category, title, description,
price_jpy::double precision as price_jpy, image_urls, location, status,
created_at, updated_at, private.author_name(author_id) as author_name;

/* @name GetListings */
select public_id as id, category, title, description,
price_jpy::double precision as price_jpy, image_urls, location, status,
created_at, updated_at, private.author_name(author_id) as author_name,
(author_id = (select private.current_profile_id())) as is_mine
from public.listings
order by created_at desc, listings.id limit :limit!::int offset :offset!::int;

/* @name SetListingStatus */
-- Only the author can end their own active listing.
update public.listings set status = :status!
where public_id = :id!::uuid
  and author_id = (select private.current_profile_id())
  and status = 'active'
returning public_id as id, status;
