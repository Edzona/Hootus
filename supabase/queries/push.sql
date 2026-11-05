/* @name SavePushSubscription */
-- Null id means the caller is not a confirmed member.
select private.save_push_subscription(:endpoint!::text, :p256dh!::text, :auth!::text) as id;

/* @name DeletePushSubscription */
-- RLS limits this to your own devices. Zero rows is fine (already removed).
delete from public.push_subscriptions where endpoint = :endpoint!::text
returning public_id as id;

/* @name CountPushSubscriptions */
select count(*)::int as devices from public.push_subscriptions;

/* @name ClaimMessagePush */
-- Zero rows: no push is due. One row with null endpoint: recipient has no devices.
select * from private.claim_message_push(:messageId!::uuid);

/* @name FinishNotificationPush */
select private.finish_notification_push(:notificationId!::uuid, :outcome!::text,
  :okEndpoints!::text[], :deadEndpoints!::text[]) as finished;
