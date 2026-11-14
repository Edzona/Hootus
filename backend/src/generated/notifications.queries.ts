/** Types generated for queries found in "../supabase/queries/notifications.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetNotifications' parameters type */
export interface IGetNotificationsParams {
  limit: number;
  offset: number;
}

/** 'GetNotifications' return type */
export interface IGetNotificationsResult {
  actor_name: string | null;
  conversation: string;
  created_at: Date;
  event_count: number;
  id: string;
  kind: string;
  listing: string;
  listing_title: string;
  read_at: Date | null;
  updated_at: Date;
}

/** 'GetNotifications' query type */
export interface IGetNotificationsQuery {
  params: IGetNotificationsParams;
  result: IGetNotificationsResult;
}

const getNotificationsIR: any = {"usedParamSet":{"limit":true,"offset":true},"params":[{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":591,"b":597}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":611,"b":618}]}],"statement":"-- RLS limits rows to your own notifications. Newest activity first.\nselect n.public_id as id, n.kind, n.event_count, n.created_at, n.updated_at, n.read_at,\n  private.author_name(n.actor_id) as actor_name,\n  c.public_id as conversation, l.public_id as listing, l.title as listing_title\nfrom public.notifications n\nleft join public.conversations c on c.id = n.conversation_id\n-- Message notifications: the conversation's listing. Listing notifications: the newest listing.\nleft join public.listings l on l.id = coalesce(n.listing_id, c.listing_id)\norder by n.updated_at desc, n.id desc\nlimit :limit!::int offset :offset!::int"};

/**
 * Query generated from SQL:
 * ```
 * -- RLS limits rows to your own notifications. Newest activity first.
 * select n.public_id as id, n.kind, n.event_count, n.created_at, n.updated_at, n.read_at,
 *   private.author_name(n.actor_id) as actor_name,
 *   c.public_id as conversation, l.public_id as listing, l.title as listing_title
 * from public.notifications n
 * left join public.conversations c on c.id = n.conversation_id
 * -- Message notifications: the conversation's listing. Listing notifications: the newest listing.
 * left join public.listings l on l.id = coalesce(n.listing_id, c.listing_id)
 * order by n.updated_at desc, n.id desc
 * limit :limit!::int offset :offset!::int
 * ```
 */
export const getNotifications = new PreparedQuery<IGetNotificationsParams,IGetNotificationsResult>(getNotificationsIR);


/** 'CountUnreadNotifications' parameters type */
export type ICountUnreadNotificationsParams = void;

/** 'CountUnreadNotifications' return type */
export interface ICountUnreadNotificationsResult {
  unread: number | null;
}

/** 'CountUnreadNotifications' query type */
export interface ICountUnreadNotificationsQuery {
  params: ICountUnreadNotificationsParams;
  result: ICountUnreadNotificationsResult;
}

const countUnreadNotificationsIR: any = {"usedParamSet":{},"params":[],"statement":"select count(*)::int as unread from public.notifications where read_at is null"};

/**
 * Query generated from SQL:
 * ```
 * select count(*)::int as unread from public.notifications where read_at is null
 * ```
 */
export const countUnreadNotifications = new PreparedQuery<ICountUnreadNotificationsParams,ICountUnreadNotificationsResult>(countUnreadNotificationsIR);


/** 'MarkNotificationRead' parameters type */
export interface IMarkNotificationReadParams {
  notificationId: string;
}

/** 'MarkNotificationRead' return type */
export interface IMarkNotificationReadResult {
  id: string;
}

/** 'MarkNotificationRead' query type */
export interface IMarkNotificationReadQuery {
  params: IMarkNotificationReadParams;
  result: IMarkNotificationReadResult;
}

const markNotificationReadIR: any = {"usedParamSet":{"notificationId":true},"params":[{"name":"notificationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":140,"b":155}]}],"statement":"-- Zero rows means not found or not yours: return 404.\nupdate public.notifications set read_at = coalesce(read_at, now())\nwhere public_id = :notificationId!::uuid\nreturning public_id as id"};

/**
 * Query generated from SQL:
 * ```
 * -- Zero rows means not found or not yours: return 404.
 * update public.notifications set read_at = coalesce(read_at, now())
 * where public_id = :notificationId!::uuid
 * returning public_id as id
 * ```
 */
export const markNotificationRead = new PreparedQuery<IMarkNotificationReadParams,IMarkNotificationReadResult>(markNotificationReadIR);


/** 'MarkAllNotificationsRead' parameters type */
export type IMarkAllNotificationsReadParams = void;

/** 'MarkAllNotificationsRead' return type */
export interface IMarkAllNotificationsReadResult {
  id: string;
}

/** 'MarkAllNotificationsRead' query type */
export interface IMarkAllNotificationsReadQuery {
  params: IMarkAllNotificationsReadParams;
  result: IMarkAllNotificationsReadResult;
}

const markAllNotificationsReadIR: any = {"usedParamSet":{},"params":[],"statement":"update public.notifications set read_at = now()\nwhere read_at is null\nreturning public_id as id"};

/**
 * Query generated from SQL:
 * ```
 * update public.notifications set read_at = now()
 * where read_at is null
 * returning public_id as id
 * ```
 */
export const markAllNotificationsRead = new PreparedQuery<IMarkAllNotificationsReadParams,IMarkAllNotificationsReadResult>(markAllNotificationsReadIR);


/** 'MarkConversationNotificationsRead' parameters type */
export interface IMarkConversationNotificationsReadParams {
  conversationId: string;
}

/** 'MarkConversationNotificationsRead' return type */
export interface IMarkConversationNotificationsReadResult {
  id: string;
}

/** 'MarkConversationNotificationsRead' query type */
export interface IMarkConversationNotificationsReadQuery {
  params: IMarkConversationNotificationsReadParams;
  result: IMarkConversationNotificationsReadResult;
}

const markConversationNotificationsReadIR: any = {"usedParamSet":{"conversationId":true},"params":[{"name":"conversationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":180,"b":195}]}],"statement":"-- Opening a conversation clears its notification.\nupdate public.notifications n set read_at = now()\nfrom public.conversations c\nwhere c.id = n.conversation_id\n  and c.public_id = :conversationId!::uuid\n  and n.read_at is null\nreturning n.public_id as id"};

/**
 * Query generated from SQL:
 * ```
 * -- Opening a conversation clears its notification.
 * update public.notifications n set read_at = now()
 * from public.conversations c
 * where c.id = n.conversation_id
 *   and c.public_id = :conversationId!::uuid
 *   and n.read_at is null
 * returning n.public_id as id
 * ```
 */
export const markConversationNotificationsRead = new PreparedQuery<IMarkConversationNotificationsReadParams,IMarkConversationNotificationsReadResult>(markConversationNotificationsReadIR);


/** 'MarkListingNotificationsRead' parameters type */
export type IMarkListingNotificationsReadParams = void;

/** 'MarkListingNotificationsRead' return type */
export interface IMarkListingNotificationsReadResult {
  id: string;
}

/** 'MarkListingNotificationsRead' query type */
export interface IMarkListingNotificationsReadQuery {
  params: IMarkListingNotificationsReadParams;
  result: IMarkListingNotificationsReadResult;
}

const markListingNotificationsReadIR: any = {"usedParamSet":{},"params":[],"statement":"-- Viewing the listings page clears your \"new listings\" notification.\nupdate public.notifications set read_at = now()\nwhere kind = 'listing' and read_at is null\nreturning public_id as id"};

/**
 * Query generated from SQL:
 * ```
 * -- Viewing the listings page clears your "new listings" notification.
 * update public.notifications set read_at = now()
 * where kind = 'listing' and read_at is null
 * returning public_id as id
 * ```
 */
export const markListingNotificationsRead = new PreparedQuery<IMarkListingNotificationsReadParams,IMarkListingNotificationsReadResult>(markListingNotificationsReadIR);


