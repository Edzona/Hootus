/* @name StartConversation */
-- Returns the conversation for this listing, creating it if needed.
-- Zero rows means: listing not found, not active, or it's your own listing.
with target as (
  select l.id, l.author_id from public.listings l
  where l.public_id = :listingId!::uuid
    and l.status = 'active'
    and l.author_id <> (select private.current_profile_id())
),
inserted as (
  insert into public.conversations (listing_id, seller_id)
  select id, author_id from target
  on conflict (listing_id, buyer_id) do nothing
  returning public_id
)
select public_id as id from inserted
union all
select c.public_id as id from public.conversations c
join target t on t.id = c.listing_id
where c.buyer_id = (select private.current_profile_id());

/* @name GetInbox */
-- RLS limits rows to conversations you are part of.
select c.public_id as id,
  l.public_id as listing, l.title as listing_title, l.category, l.status as listing_status,
  private.author_name(case when c.buyer_id = (select private.current_profile_id())
    then c.seller_id else c.buyer_id end) as other_name,
  (c.seller_id = (select private.current_profile_id())) as is_seller,
  m.body as last_message, m.created_at as last_message_at,
  (m.sender_id = (select private.current_profile_id())) as last_from_me
from public.conversations c
join public.listings l on l.id = c.listing_id
left join lateral (
  select body, created_at, sender_id from public.messages
  where conversation_id = c.id
  order by created_at desc, id desc limit 1
) m on true
order by c.last_message_at desc, c.id desc
limit :limit!::int offset :offset!::int;

/* @name GetConversation */
-- Chat header. Zero rows means not found or not yours: return 404.
select c.public_id as id,
  l.public_id as listing, l.title as listing_title, l.status as listing_status,
  private.author_name(case when c.buyer_id = (select private.current_profile_id())
    then c.seller_id else c.buyer_id end) as other_name,
  (c.seller_id = (select private.current_profile_id())) as is_seller
from public.conversations c
join public.listings l on l.id = c.listing_id
where c.public_id = :conversationId!::uuid;

/* @name GetConversationMessages */
-- Newest first; reverse on the frontend. Pass the oldest created_at
-- you have as :before to load the previous page.
select m.public_id as id, m.body, m.created_at,
  (m.sender_id = (select private.current_profile_id())) as from_me
from public.messages m
join public.conversations c on c.id = m.conversation_id
where c.public_id = :conversationId!::uuid
  and (:before::timestamptz is null or m.created_at < :before::timestamptz)
order by m.created_at desc, m.id desc
limit :limit!::int;

/* @name SendMessage */
-- sender_id comes from its column default. Zero rows means the
-- conversation was not found or is not yours: return 404.
insert into public.messages (conversation_id, recipient_id, body)
select c.id,
  case when c.buyer_id = (select private.current_profile_id())
    then c.seller_id else c.buyer_id end,
  :body!::text
from public.conversations c
where c.public_id = :conversationId!::uuid
returning public_id as id, created_at;
