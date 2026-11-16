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
  club: string;
  club_event: string;
  club_event_title: string;
  club_name: string;
  club_post: string;
  club_post_body: string | null;
  created_at: Date;
  event_count: number;
  id: string;
  kind: string;
  listing: string;
  listing_category: string;
  listing_title: string;
  read_at: Date | null;
  updated_at: Date;
}

/** 'GetNotifications' query type */
export interface IGetNotificationsQuery {
  params: IGetNotificationsParams;
  result: IGetNotificationsResult;
}

const getNotificationsIR: any = {"usedParamSet":{"limit":true,"offset":true},"params":[{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":744,"b":750}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":764,"b":771}]}],"statement":"-- RLS limits rows to your own notifications. Newest activity first.\nselect n.public_id as id, n.kind, n.event_count, n.created_at, n.updated_at, n.read_at,\n  private.author_name(n.actor_id) as actor_name,\n  l.public_id as listing, l.title as listing_title, l.category as listing_category,\n  c.public_id as club, c.name as club_name,\n  cp.public_id as club_post, left(cp.body, 120) as club_post_body,\n  ce.public_id as club_event, ce.title as club_event_title\nfrom public.notifications n\nleft join public.listings l on l.id = n.listing_id\nleft join public.clubs c on c.id = n.club_id\nleft join public.club_posts cp on cp.id = n.club_post_id\nleft join public.club_events ce on ce.id = n.club_event_id\norder by n.updated_at desc, n.id desc\nlimit :limit!::int offset :offset!::int"};

/**
 * Query generated from SQL:
 * ```
 * -- RLS limits rows to your own notifications. Newest activity first.
 * select n.public_id as id, n.kind, n.event_count, n.created_at, n.updated_at, n.read_at,
 *   private.author_name(n.actor_id) as actor_name,
 *   l.public_id as listing, l.title as listing_title, l.category as listing_category,
 *   c.public_id as club, c.name as club_name,
 *   cp.public_id as club_post, left(cp.body, 120) as club_post_body,
 *   ce.public_id as club_event, ce.title as club_event_title
 * from public.notifications n
 * left join public.listings l on l.id = n.listing_id
 * left join public.clubs c on c.id = n.club_id
 * left join public.club_posts cp on cp.id = n.club_post_id
 * left join public.club_events ce on ce.id = n.club_event_id
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


