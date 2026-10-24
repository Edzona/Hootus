/** Types generated for queries found in "../supabase/queries/messaging.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

/** 'StartConversation' parameters type */
export interface IStartConversationParams {
  listingId: string;
}

/** 'StartConversation' return type */
export interface IStartConversationResult {
  id: string | null;
}

/** 'StartConversation' query type */
export interface IStartConversationQuery {
  params: IStartConversationParams;
  result: IStartConversationResult;
}

const startConversationIR: any = {"usedParamSet":{"listingId":true},"params":[{"name":"listingId","required":true,"transform":{"type":"scalar"},"locs":[{"a":235,"b":245}]}],"statement":"-- Returns the conversation for this listing, creating it if needed.\n-- Zero rows means: listing not found, not active, or it's your own listing.\nwith target as (\n  select l.id, l.author_id from public.listings l\n  where l.public_id = :listingId!::uuid\n    and l.status = 'active'\n    and l.author_id <> (select private.current_profile_id())\n),\ninserted as (\n  insert into public.conversations (listing_id, seller_id)\n  select id, author_id from target\n  on conflict (listing_id, buyer_id) do nothing\n  returning public_id\n)\nselect public_id as id from inserted\nunion all\nselect c.public_id as id from public.conversations c\njoin target t on t.id = c.listing_id\nwhere c.buyer_id = (select private.current_profile_id())"};

/**
 * Query generated from SQL:
 * ```
 * -- Returns the conversation for this listing, creating it if needed.
 * -- Zero rows means: listing not found, not active, or it's your own listing.
 * with target as (
 *   select l.id, l.author_id from public.listings l
 *   where l.public_id = :listingId!::uuid
 *     and l.status = 'active'
 *     and l.author_id <> (select private.current_profile_id())
 * ),
 * inserted as (
 *   insert into public.conversations (listing_id, seller_id)
 *   select id, author_id from target
 *   on conflict (listing_id, buyer_id) do nothing
 *   returning public_id
 * )
 * select public_id as id from inserted
 * union all
 * select c.public_id as id from public.conversations c
 * join target t on t.id = c.listing_id
 * where c.buyer_id = (select private.current_profile_id())
 * ```
 */
export const startConversation = new PreparedQuery<IStartConversationParams,IStartConversationResult>(startConversationIR);


/** 'GetInbox' parameters type */
export interface IGetInboxParams {
  limit: number;
  offset: number;
}

/** 'GetInbox' return type */
export interface IGetInboxResult {
  category: string;
  id: string;
  is_seller: boolean | null;
  last_from_me: boolean | null;
  last_message: string;
  last_message_at: Date;
  listing: string;
  listing_status: string;
  listing_title: string;
  other_name: string | null;
}

/** 'GetInbox' query type */
export interface IGetInboxQuery {
  params: IGetInboxParams;
  result: IGetInboxResult;
}

const getInboxIR: any = {"usedParamSet":{"limit":true,"offset":true},"params":[{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":800,"b":806}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":820,"b":827}]}],"statement":"-- RLS limits rows to conversations you are part of.\nselect c.public_id as id,\n  l.public_id as listing, l.title as listing_title, l.category, l.status as listing_status,\n  private.author_name(case when c.buyer_id = (select private.current_profile_id())\n    then c.seller_id else c.buyer_id end) as other_name,\n  (c.seller_id = (select private.current_profile_id())) as is_seller,\n  m.body as last_message, m.created_at as last_message_at,\n  (m.sender_id = (select private.current_profile_id())) as last_from_me\nfrom public.conversations c\njoin public.listings l on l.id = c.listing_id\nleft join lateral (\n  select body, created_at, sender_id from public.messages\n  where conversation_id = c.id\n  order by created_at desc, id desc limit 1\n) m on true\norder by c.last_message_at desc, c.id desc\nlimit :limit!::int offset :offset!::int"};

/**
 * Query generated from SQL:
 * ```
 * -- RLS limits rows to conversations you are part of.
 * select c.public_id as id,
 *   l.public_id as listing, l.title as listing_title, l.category, l.status as listing_status,
 *   private.author_name(case when c.buyer_id = (select private.current_profile_id())
 *     then c.seller_id else c.buyer_id end) as other_name,
 *   (c.seller_id = (select private.current_profile_id())) as is_seller,
 *   m.body as last_message, m.created_at as last_message_at,
 *   (m.sender_id = (select private.current_profile_id())) as last_from_me
 * from public.conversations c
 * join public.listings l on l.id = c.listing_id
 * left join lateral (
 *   select body, created_at, sender_id from public.messages
 *   where conversation_id = c.id
 *   order by created_at desc, id desc limit 1
 * ) m on true
 * order by c.last_message_at desc, c.id desc
 * limit :limit!::int offset :offset!::int
 * ```
 */
export const getInbox = new PreparedQuery<IGetInboxParams,IGetInboxResult>(getInboxIR);


/** 'GetConversation' parameters type */
export interface IGetConversationParams {
  conversationId: string;
}

/** 'GetConversation' return type */
export interface IGetConversationResult {
  id: string;
  is_seller: boolean | null;
  listing: string;
  listing_status: string;
  listing_title: string;
  other_name: string | null;
}

/** 'GetConversation' query type */
export interface IGetConversationQuery {
  params: IGetConversationParams;
  result: IGetConversationResult;
}

const getConversationIR: any = {"usedParamSet":{"conversationId":true},"params":[{"name":"conversationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":477,"b":492}]}],"statement":"-- Chat header. Zero rows means not found or not yours: return 404.\nselect c.public_id as id,\n  l.public_id as listing, l.title as listing_title, l.status as listing_status,\n  private.author_name(case when c.buyer_id = (select private.current_profile_id())\n    then c.seller_id else c.buyer_id end) as other_name,\n  (c.seller_id = (select private.current_profile_id())) as is_seller\nfrom public.conversations c\njoin public.listings l on l.id = c.listing_id\nwhere c.public_id = :conversationId!::uuid"};

/**
 * Query generated from SQL:
 * ```
 * -- Chat header. Zero rows means not found or not yours: return 404.
 * select c.public_id as id,
 *   l.public_id as listing, l.title as listing_title, l.status as listing_status,
 *   private.author_name(case when c.buyer_id = (select private.current_profile_id())
 *     then c.seller_id else c.buyer_id end) as other_name,
 *   (c.seller_id = (select private.current_profile_id())) as is_seller
 * from public.conversations c
 * join public.listings l on l.id = c.listing_id
 * where c.public_id = :conversationId!::uuid
 * ```
 */
export const getConversation = new PreparedQuery<IGetConversationParams,IGetConversationResult>(getConversationIR);


/** 'GetConversationMessages' parameters type */
export interface IGetConversationMessagesParams {
  before?: DateOrString | null | void;
  conversationId: string;
  limit: number;
}

/** 'GetConversationMessages' return type */
export interface IGetConversationMessagesResult {
  body: string;
  created_at: Date;
  from_me: boolean | null;
  id: string;
}

/** 'GetConversationMessages' query type */
export interface IGetConversationMessagesQuery {
  params: IGetConversationMessagesParams;
  result: IGetConversationMessagesResult;
}

const getConversationMessagesIR: any = {"usedParamSet":{"conversationId":true,"before":true,"limit":true},"params":[{"name":"conversationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":333,"b":348}]},{"name":"before","required":false,"transform":{"type":"scalar"},"locs":[{"a":363,"b":369},{"a":410,"b":416}]},{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":476,"b":482}]}],"statement":"-- Newest first; reverse on the frontend. Pass the oldest created_at\n-- you have as :before to load the previous page.\nselect m.public_id as id, m.body, m.created_at,\n  (m.sender_id = (select private.current_profile_id())) as from_me\nfrom public.messages m\njoin public.conversations c on c.id = m.conversation_id\nwhere c.public_id = :conversationId!::uuid\n  and (:before::timestamptz is null or m.created_at < :before::timestamptz)\norder by m.created_at desc, m.id desc\nlimit :limit!::int"};

/**
 * Query generated from SQL:
 * ```
 * -- Newest first; reverse on the frontend. Pass the oldest created_at
 * -- you have as :before to load the previous page.
 * select m.public_id as id, m.body, m.created_at,
 *   (m.sender_id = (select private.current_profile_id())) as from_me
 * from public.messages m
 * join public.conversations c on c.id = m.conversation_id
 * where c.public_id = :conversationId!::uuid
 *   and (:before::timestamptz is null or m.created_at < :before::timestamptz)
 * order by m.created_at desc, m.id desc
 * limit :limit!::int
 * ```
 */
export const getConversationMessages = new PreparedQuery<IGetConversationMessagesParams,IGetConversationMessagesResult>(getConversationMessagesIR);


/** 'SendMessage' parameters type */
export interface ISendMessageParams {
  body: string;
  conversationId: string;
}

/** 'SendMessage' return type */
export interface ISendMessageResult {
  created_at: Date;
  id: string;
}

/** 'SendMessage' query type */
export interface ISendMessageQuery {
  params: ISendMessageParams;
  result: ISendMessageResult;
}

const sendMessageIR: any = {"usedParamSet":{"body":true,"conversationId":true},"params":[{"name":"body","required":true,"transform":{"type":"scalar"},"locs":[{"a":309,"b":314}]},{"name":"conversationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":370,"b":385}]}],"statement":"-- sender_id comes from its column default. Zero rows means the\n-- conversation was not found or is not yours: return 404.\ninsert into public.messages (conversation_id, recipient_id, body)\nselect c.id,\n  case when c.buyer_id = (select private.current_profile_id())\n    then c.seller_id else c.buyer_id end,\n  :body!::text\nfrom public.conversations c\nwhere c.public_id = :conversationId!::uuid\nreturning public_id as id, created_at"};

/**
 * Query generated from SQL:
 * ```
 * -- sender_id comes from its column default. Zero rows means the
 * -- conversation was not found or is not yours: return 404.
 * insert into public.messages (conversation_id, recipient_id, body)
 * select c.id,
 *   case when c.buyer_id = (select private.current_profile_id())
 *     then c.seller_id else c.buyer_id end,
 *   :body!::text
 * from public.conversations c
 * where c.public_id = :conversationId!::uuid
 * returning public_id as id, created_at
 * ```
 */
export const sendMessage = new PreparedQuery<ISendMessageParams,ISendMessageResult>(sendMessageIR);


