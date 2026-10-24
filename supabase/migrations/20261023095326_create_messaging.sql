-- Listing-based conversations between a buyer and the listing's author.
create table public.conversations (
  id bigint generated always as identity primary key,
  public_id uuid not null unique default gen_random_uuid(),
  listing_id bigint not null references public.listings(id) on delete cascade,
  buyer_id bigint not null default private.current_profile_id() references public.profiles(id) on delete cascade,
  seller_id bigint not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (listing_id, buyer_id),
  check (buyer_id <> seller_id)
);

create index conversations_buyer_idx on public.conversations (buyer_id, last_message_at desc);
create index conversations_seller_idx on public.conversations (seller_id, last_message_at desc);

alter table public.messages
  add column conversation_id bigint references public.conversations(id) on delete cascade,
  add constraint messages_body_max_length check (char_length(body) <= 2000);

create index messages_conversation_idx on public.messages (conversation_id, created_at);

-- Keep the inbox sorted without letting clients update conversations.
create function private.touch_conversation()
returns trigger
language plpgsql security definer set search_path = ''
as $$
begin
  update public.conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;
revoke all on function private.touch_conversation() from public, anon, authenticated, hootus_api;

create trigger messages_touch_conversation
after insert on public.messages
for each row when (new.conversation_id is not null)
execute function private.touch_conversation();

alter table public.conversations enable row level security;

-- Explicit grants, matching the initial schema's style.
revoke all on sequence public.conversations_id_seq from public, anon, authenticated;
grant usage on sequence public.conversations_id_seq to hootus_api;

revoke all on public.conversations from public, anon, authenticated, hootus_api;
grant select on public.conversations to hootus_api;
grant insert (listing_id, buyer_id, seller_id) on public.conversations to hootus_api;

-- Messages may now be filed under a conversation.
grant insert (conversation_id) on public.messages to hootus_api;

-- Only the two participants see a conversation. Admins get no special access,
-- matching the rule for messages.
create policy conversations_read on public.conversations for select to hootus_api
using ((select private.current_role()) is not null
  and (select private.current_profile_id()) in (buyer_id, seller_id));

-- A buyer can only start a conversation with the real author of an active listing.
create policy conversations_start on public.conversations for insert to hootus_api
with check ((select private.current_role()) is not null
  and buyer_id = (select private.current_profile_id())
  and exists (
    select 1 from public.listings l
    where l.id = listing_id
      and l.author_id = seller_id
      and l.status = 'active'
  ));

-- Restrictive: adds to messages_send rather than loosening it.
-- A message in a conversation must be between that conversation's two participants.
create policy messages_in_conversation on public.messages
as restrictive for insert to hootus_api
with check (conversation_id is null or exists (
  select 1 from public.conversations c
  where c.id = conversation_id
    and sender_id in (c.buyer_id, c.seller_id)
    and recipient_id in (c.buyer_id, c.seller_id)
));