/* @name CreateFeedPost */
insert into public.feed_posts (author_id, kind, title, body, image_urls, room_number, meeting_time, business_name, coupon_code, expires_at)
values (:authorId!::bigint, :kind!, :title!, :body!, :image_urls!, :room_number, :meeting_time, :business_name, :coupon_code, :expires_at)
returning public_id as id, kind, title, body, image_urls, room_number, meeting_time,
business_name, coupon_code, expires_at, created_at, updated_at,
private.author_name(author_id) as author_name;

/* @name GetFeed */
select public_id as id, kind, title, body, image_urls, room_number, meeting_time,
business_name, coupon_code, expires_at, created_at, updated_at,
private.author_name(author_id) as author_name from public.feed_posts
order by created_at desc, feed_posts.id limit :limit!::int offset :offset!::int;
