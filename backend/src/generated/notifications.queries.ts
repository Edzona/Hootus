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
  listing_title: string;
  read_at: Date | null;
  updated_at: Date;
}

/** 'GetNotifications' query type */
export interface IGetNotificationsQuery {
  params: IGetNotificationsParams;
  result: IGetNotificationsResult;
}

const getNotificationsIR: any = {"usedParamSet":{"limit":true,"offset":true},"params":[{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":446,"b":452}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":466,"b":473}]}],"statement":"-- RLS limits rows to your own notifications. Newest activity first.\nselect n.public_id as id, n.kind, n.event_count, n.created_at, n.updated_at, n.read_at,\n  private.author_name(n.actor_id) as actor_name,\n  c.public_id as conversation, l.title as listing_title\nfrom public.notifications n\nleft join public.conversations c on c.id = n.conversation_id\nleft join public.listings l on l.id = c.listing_id\norder by n.updated_at desc, n.id desc\nlimit :limit!::int offset :offset!::int"};

/**
 * Query generated from SQL:
 * ```
 * -- RLS limits rows to your own notifications. Newest activity first.
 * select n.public_id as id, n.kind, n.event_count, n.created_at, n.updated_at, n.read_at,
 *   private.author_name(n.actor_id) as actor_name,
 *   c.public_id as conversation, l.title as listing_title
 * from public.notifications n
 * left join public.conversations c on c.id = n.conversation_id
 * left join public.listings l on l.id = c.listing_id
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


/** 'ClaimMessageEmail' parameters type */
export interface IClaimMessageEmailParams {
  messageId: string;
}

/** 'ClaimMessageEmail' return type */
export interface IClaimMessageEmailResult {
  listing_title: string | null;
  notification_id: string | null;
  recipient_email: string | null;
  recipient_name: string | null;
  sender_name: string | null;
}

/** 'ClaimMessageEmail' query type */
export interface IClaimMessageEmailQuery {
  params: IClaimMessageEmailParams;
  result: IClaimMessageEmailResult;
}

const claimMessageEmailIR: any = {"usedParamSet":{"messageId":true},"params":[{"name":"messageId","required":true,"transform":{"type":"scalar"},"locs":[{"a":132,"b":142}]}],"statement":"-- Zero rows means no email is due (the conversation already had an unread notification).\nselect * from private.claim_message_email(:messageId!::uuid)"};

/**
 * Query generated from SQL:
 * ```
 * -- Zero rows means no email is due (the conversation already had an unread notification).
 * select * from private.claim_message_email(:messageId!::uuid)
 * ```
 */
export const claimMessageEmail = new PreparedQuery<IClaimMessageEmailParams,IClaimMessageEmailResult>(claimMessageEmailIR);


/** 'FinishNotificationEmail' parameters type */
export interface IFinishNotificationEmailParams {
  notificationId: string;
  outcome: string;
}

/** 'FinishNotificationEmail' return type */
export interface IFinishNotificationEmailResult {
  finished: boolean | null;
}

/** 'FinishNotificationEmail' query type */
export interface IFinishNotificationEmailQuery {
  params: IFinishNotificationEmailParams;
  result: IFinishNotificationEmailResult;
}

const finishNotificationEmailIR: any = {"usedParamSet":{"notificationId":true,"outcome":true},"params":[{"name":"notificationId","required":true,"transform":{"type":"scalar"},"locs":[{"a":41,"b":56}]},{"name":"outcome","required":true,"transform":{"type":"scalar"},"locs":[{"a":65,"b":73}]}],"statement":"select private.finish_notification_email(:notificationId!::uuid, :outcome!::text) as finished"};

/**
 * Query generated from SQL:
 * ```
 * select private.finish_notification_email(:notificationId!::uuid, :outcome!::text) as finished
 * ```
 */
export const finishNotificationEmail = new PreparedQuery<IFinishNotificationEmailParams,IFinishNotificationEmailResult>(finishNotificationEmailIR);


