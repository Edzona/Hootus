/* @name GetNotifications */
-- RLS limits rows to your own notifications. Newest activity first.
select n.public_id as id, n.kind, n.event_count, n.created_at, n.updated_at, n.read_at,
  private.author_name(n.actor_id) as actor_name,
  c.public_id as conversation, l.title as listing_title
from public.notifications n
left join public.conversations c on c.id = n.conversation_id
left join public.listings l on l.id = c.listing_id
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

/* @name MarkConversationNotificationsRead */
-- Opening a conversation clears its notification.
update public.notifications n set read_at = now()
from public.conversations c
where c.id = n.conversation_id
  and c.public_id = :conversationId!::uuid
  and n.read_at is null
returning n.public_id as id;

/* @name ClaimMessageEmail */
-- Zero rows means no email is due (the conversation already had an unread notification).
select * from private.claim_message_email(:messageId!::uuid);

/* @name FinishNotificationEmail */
select private.finish_notification_email(:notificationId!::uuid, :outcome!::text) as finished;
