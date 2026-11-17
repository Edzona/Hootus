/* @name GetNotifications */
-- RLS limits rows to your own notifications. Newest activity first.
select n.public_id as id, n.kind, n.event_count, n.created_at, n.updated_at, n.read_at,
  private.author_name(n.actor_id) as actor_name,
  l.public_id as listing, l.title as listing_title, l.category as listing_category,
  c.public_id as club, c.name as club_name,
  cp.public_id as club_post, left(cp.body, 120) as club_post_body,
  ce.public_id as club_event, ce.title as club_event_title
from public.notifications n
left join public.listings l on l.id = n.listing_id
left join public.clubs c on c.id = n.club_id
left join public.club_posts cp on cp.id = n.club_post_id
left join public.club_events ce on ce.id = n.club_event_id
order by n.updated_at desc, n.id desc
limit :limit!::int offset :offset!::int;

/* @name CountUnreadNotifications */
select count(*)::int as unread from public.notifications where read_at is null;

/* @name MarkNotificationRead */
-- Zero rows means not found or not yours: return 404.
update public.notifications set read_at = coalesce(read_at, now())
where public_id = :notificationId!::uuid
returning public_id as id;

/* @name MarkAllNotificationsRead */
update public.notifications set read_at = now()
where read_at is null
returning public_id as id;

/* @name MarkListingNotificationsRead */
-- Viewing the listings page clears your "new listings" notification.
update public.notifications set read_at = now()
where kind = 'listing' and read_at is null
returning public_id as id;
