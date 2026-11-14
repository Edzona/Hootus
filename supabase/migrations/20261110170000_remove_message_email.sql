-- New-message notifications are delivered by browser push only. Email delivery
-- and its bookkeeping are removed. Sign-in codes are sent by Supabase Auth and
-- are unaffected.
drop function private.claim_message_email(uuid);
drop function private.finish_notification_email(uuid, text);

alter table public.notifications
  drop column email_status,
  drop column email_attempted_at;
