/** Types generated for queries found in "../supabase/queries/campus.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

/** 'GetCampusClubs' parameters type */
export type IGetCampusClubsParams = void;

/** 'GetCampusClubs' return type */
export interface IGetCampusClubsResult {
  can_post: boolean | null;
  category: string;
  color: string;
  description: string;
  followers: number | null;
  following: boolean | null;
  handle: string;
  id: string;
  is_sample: boolean;
  location: string;
  mark: string;
  meeting: string;
  name: string;
  slug: string;
}

/** 'GetCampusClubs' query type */
export interface IGetCampusClubsQuery {
  params: IGetCampusClubsParams;
  result: IGetCampusClubsResult;
}

const getCampusClubsIR: any = {"usedParamSet":{},"params":[],"statement":"select c.public_id as id, c.slug, c.name, c.handle, c.mark, c.color, c.category,\n  c.description, c.meeting, c.location, c.is_sample,\n  private.club_follower_count(c.id) as followers,\n  exists(select 1 from public.club_follows f where f.club_id = c.id) as following,\n  ((select private.current_role()) = 'admin' or\n    ((select private.current_role()) = 'club_leader' and c.leader_id = (select private.current_profile_id()))) as can_post\nfrom public.clubs c order by c.name limit 100"};

/**
 * Query generated from SQL:
 * ```
 * select c.public_id as id, c.slug, c.name, c.handle, c.mark, c.color, c.category,
 *   c.description, c.meeting, c.location, c.is_sample,
 *   private.club_follower_count(c.id) as followers,
 *   exists(select 1 from public.club_follows f where f.club_id = c.id) as following,
 *   ((select private.current_role()) = 'admin' or
 *     ((select private.current_role()) = 'club_leader' and c.leader_id = (select private.current_profile_id()))) as can_post
 * from public.clubs c order by c.name limit 100
 * ```
 */
export const getCampusClubs = new PreparedQuery<IGetCampusClubsParams,IGetCampusClubsResult>(getCampusClubsIR);


/** 'GetCampusEvents' parameters type */
export type IGetCampusEventsParams = void;

/** 'GetCampusEvents' return type */
export interface IGetCampusEventsResult {
  attending: boolean | null;
  club: string;
  description: string;
  ends_at: Date;
  event_type: string;
  id: string;
  location: string;
  note: string;
  poster: string;
  price: string;
  slug: string | null;
  starts_at: Date;
  title: string;
}

/** 'GetCampusEvents' query type */
export interface IGetCampusEventsQuery {
  params: IGetCampusEventsParams;
  result: IGetCampusEventsResult;
}

const getCampusEventsIR: any = {"usedParamSet":{},"params":[],"statement":"select e.public_id as id, c.public_id as club, e.slug, e.title,\n  e.starts_at, e.ends_at, e.location, e.price, e.event_type, e.poster, e.description, e.note,\n  exists(select 1 from public.club_event_rsvps r where r.event_id = e.id) as attending\nfrom public.club_events e join public.clubs c on c.id = e.club_id\norder by e.starts_at, e.id limit 100"};

/**
 * Query generated from SQL:
 * ```
 * select e.public_id as id, c.public_id as club, e.slug, e.title,
 *   e.starts_at, e.ends_at, e.location, e.price, e.event_type, e.poster, e.description, e.note,
 *   exists(select 1 from public.club_event_rsvps r where r.event_id = e.id) as attending
 * from public.club_events e join public.clubs c on c.id = e.club_id
 * order by e.starts_at, e.id limit 100
 * ```
 */
export const getCampusEvents = new PreparedQuery<IGetCampusEventsParams,IGetCampusEventsResult>(getCampusEventsIR);


/** 'GetCampusPosts' parameters type */
export interface IGetCampusPostsParams {
  limit: number;
  offset: number;
}

/** 'GetCampusPosts' return type */
export interface IGetCampusPostsResult {
  club: string;
  created_at: Date;
  event: string;
  id: string;
  liked: boolean | null;
  likes: number | null;
  saved: boolean | null;
  text: string;
}

/** 'GetCampusPosts' query type */
export interface IGetCampusPostsQuery {
  params: IGetCampusPostsParams;
  result: IGetCampusPostsResult;
}

const getCampusPostsIR: any = {"usedParamSet":{"limit":true,"offset":true},"params":[{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":472,"b":478}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":492,"b":499}]}],"statement":"select p.public_id as id, c.public_id as club, e.public_id as event,\n  p.body as text, p.created_at,\n  private.club_post_like_count(p.id) as likes,\n  exists(select 1 from public.club_post_likes l where l.post_id = p.id) as liked,\n  exists(select 1 from public.club_post_saves s where s.post_id = p.id) as saved\nfrom public.club_posts p join public.clubs c on c.id = p.club_id\nleft join public.club_events e on e.id = p.event_id\norder by p.created_at desc, p.id desc limit :limit!::int offset :offset!::int"};

/**
 * Query generated from SQL:
 * ```
 * select p.public_id as id, c.public_id as club, e.public_id as event,
 *   p.body as text, p.created_at,
 *   private.club_post_like_count(p.id) as likes,
 *   exists(select 1 from public.club_post_likes l where l.post_id = p.id) as liked,
 *   exists(select 1 from public.club_post_saves s where s.post_id = p.id) as saved
 * from public.club_posts p join public.clubs c on c.id = p.club_id
 * left join public.club_events e on e.id = p.event_id
 * order by p.created_at desc, p.id desc limit :limit!::int offset :offset!::int
 * ```
 */
export const getCampusPosts = new PreparedQuery<IGetCampusPostsParams,IGetCampusPostsResult>(getCampusPostsIR);


/** 'GetSavedCampusPosts' parameters type */
export type IGetSavedCampusPostsParams = void;

/** 'GetSavedCampusPosts' return type */
export interface IGetSavedCampusPostsResult {
  club: string;
  created_at: Date;
  event: string;
  id: string;
  liked: boolean | null;
  likes: number | null;
  saved: boolean | null;
  text: string;
}

/** 'GetSavedCampusPosts' query type */
export interface IGetSavedCampusPostsQuery {
  params: IGetSavedCampusPostsParams;
  result: IGetSavedCampusPostsResult;
}

const getSavedCampusPostsIR: any = {"usedParamSet":{},"params":[],"statement":"select p.public_id as id, c.public_id as club, e.public_id as event,\n  p.body as text, p.created_at,\n  private.club_post_like_count(p.id) as likes,\n  exists(select 1 from public.club_post_likes l where l.post_id = p.id) as liked,\n  true as saved\nfrom public.club_post_saves s join public.club_posts p on p.id = s.post_id\njoin public.clubs c on c.id = p.club_id left join public.club_events e on e.id = p.event_id\norder by s.created_at desc, s.id desc limit 100"};

/**
 * Query generated from SQL:
 * ```
 * select p.public_id as id, c.public_id as club, e.public_id as event,
 *   p.body as text, p.created_at,
 *   private.club_post_like_count(p.id) as likes,
 *   exists(select 1 from public.club_post_likes l where l.post_id = p.id) as liked,
 *   true as saved
 * from public.club_post_saves s join public.club_posts p on p.id = s.post_id
 * join public.clubs c on c.id = p.club_id left join public.club_events e on e.id = p.event_id
 * order by s.created_at desc, s.id desc limit 100
 * ```
 */
export const getSavedCampusPosts = new PreparedQuery<IGetSavedCampusPostsParams,IGetSavedCampusPostsResult>(getSavedCampusPostsIR);


/** 'GetCampusListings' parameters type */
export type IGetCampusListingsParams = void;

/** 'GetCampusListings' return type */
export interface IGetCampusListingsResult {
  category: string;
  description: string;
  id: string;
  is_sample: boolean;
  location: string | null;
  price_jpy: string | null;
  title: string;
}

/** 'GetCampusListings' query type */
export interface IGetCampusListingsQuery {
  params: IGetCampusListingsParams;
  result: IGetCampusListingsResult;
}

const getCampusListingsIR: any = {"usedParamSet":{},"params":[],"statement":"select public_id as id, category, title, description, price_jpy, location, is_sample\nfrom public.listings where status = 'active' and category in ('sales','housing')\norder by created_at desc, id desc limit 6"};

/**
 * Query generated from SQL:
 * ```
 * select public_id as id, category, title, description, price_jpy, location, is_sample
 * from public.listings where status = 'active' and category in ('sales','housing')
 * order by created_at desc, id desc limit 6
 * ```
 */
export const getCampusListings = new PreparedQuery<IGetCampusListingsParams,IGetCampusListingsResult>(getCampusListingsIR);


/** 'SetCampusFollow' parameters type */
export interface ISetCampusFollowParams {
  active: boolean;
  id: string;
}

/** 'SetCampusFollow' return type */
export interface ISetCampusFollowResult {
  found: boolean | null;
}

/** 'SetCampusFollow' query type */
export interface ISetCampusFollowQuery {
  params: ISetCampusFollowParams;
  result: ISetCampusFollowResult;
}

const setCampusFollowIR: any = {"usedParamSet":{"id":true,"active":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":62,"b":65}]},{"name":"active","required":true,"transform":{"type":"scalar"},"locs":[{"a":160,"b":167},{"a":321,"b":328}]}],"statement":"with target as (select id from public.clubs where public_id = :id!::uuid),\nadded as (\n  insert into public.club_follows (club_id)\n  select id from target where :active!::boolean on conflict (profile_id,club_id) do nothing\n), removed as (\n  delete from public.club_follows where club_id in (select id from target) and not :active!::boolean\n)\nselect exists(select 1 from target) as found"};

/**
 * Query generated from SQL:
 * ```
 * with target as (select id from public.clubs where public_id = :id!::uuid),
 * added as (
 *   insert into public.club_follows (club_id)
 *   select id from target where :active!::boolean on conflict (profile_id,club_id) do nothing
 * ), removed as (
 *   delete from public.club_follows where club_id in (select id from target) and not :active!::boolean
 * )
 * select exists(select 1 from target) as found
 * ```
 */
export const setCampusFollow = new PreparedQuery<ISetCampusFollowParams,ISetCampusFollowResult>(setCampusFollowIR);


/** 'SetCampusLike' parameters type */
export interface ISetCampusLikeParams {
  active: boolean;
  id: string;
}

/** 'SetCampusLike' return type */
export interface ISetCampusLikeResult {
  found: boolean | null;
}

/** 'SetCampusLike' query type */
export interface ISetCampusLikeQuery {
  params: ISetCampusLikeParams;
  result: ISetCampusLikeResult;
}

const setCampusLikeIR: any = {"usedParamSet":{"id":true,"active":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":67,"b":70}]},{"name":"active","required":true,"transform":{"type":"scalar"},"locs":[{"a":168,"b":175},{"a":332,"b":339}]}],"statement":"with target as (select id from public.club_posts where public_id = :id!::uuid),\nadded as (\n  insert into public.club_post_likes (post_id)\n  select id from target where :active!::boolean on conflict (profile_id,post_id) do nothing\n), removed as (\n  delete from public.club_post_likes where post_id in (select id from target) and not :active!::boolean\n)\nselect exists(select 1 from target) as found"};

/**
 * Query generated from SQL:
 * ```
 * with target as (select id from public.club_posts where public_id = :id!::uuid),
 * added as (
 *   insert into public.club_post_likes (post_id)
 *   select id from target where :active!::boolean on conflict (profile_id,post_id) do nothing
 * ), removed as (
 *   delete from public.club_post_likes where post_id in (select id from target) and not :active!::boolean
 * )
 * select exists(select 1 from target) as found
 * ```
 */
export const setCampusLike = new PreparedQuery<ISetCampusLikeParams,ISetCampusLikeResult>(setCampusLikeIR);


/** 'SetCampusSave' parameters type */
export interface ISetCampusSaveParams {
  active: boolean;
  id: string;
}

/** 'SetCampusSave' return type */
export interface ISetCampusSaveResult {
  found: boolean | null;
}

/** 'SetCampusSave' query type */
export interface ISetCampusSaveQuery {
  params: ISetCampusSaveParams;
  result: ISetCampusSaveResult;
}

const setCampusSaveIR: any = {"usedParamSet":{"id":true,"active":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":67,"b":70}]},{"name":"active","required":true,"transform":{"type":"scalar"},"locs":[{"a":168,"b":175},{"a":332,"b":339}]}],"statement":"with target as (select id from public.club_posts where public_id = :id!::uuid),\nadded as (\n  insert into public.club_post_saves (post_id)\n  select id from target where :active!::boolean on conflict (profile_id,post_id) do nothing\n), removed as (\n  delete from public.club_post_saves where post_id in (select id from target) and not :active!::boolean\n)\nselect exists(select 1 from target) as found"};

/**
 * Query generated from SQL:
 * ```
 * with target as (select id from public.club_posts where public_id = :id!::uuid),
 * added as (
 *   insert into public.club_post_saves (post_id)
 *   select id from target where :active!::boolean on conflict (profile_id,post_id) do nothing
 * ), removed as (
 *   delete from public.club_post_saves where post_id in (select id from target) and not :active!::boolean
 * )
 * select exists(select 1 from target) as found
 * ```
 */
export const setCampusSave = new PreparedQuery<ISetCampusSaveParams,ISetCampusSaveResult>(setCampusSaveIR);


/** 'SetCampusRsvp' parameters type */
export interface ISetCampusRsvpParams {
  active: boolean;
  id: string;
}

/** 'SetCampusRsvp' return type */
export interface ISetCampusRsvpResult {
  found: boolean | null;
}

/** 'SetCampusRsvp' query type */
export interface ISetCampusRsvpQuery {
  params: ISetCampusRsvpParams;
  result: ISetCampusRsvpResult;
}

const setCampusRsvpIR: any = {"usedParamSet":{"id":true,"active":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":68,"b":71}]},{"name":"active","required":true,"transform":{"type":"scalar"},"locs":[{"a":171,"b":178},{"a":338,"b":345}]}],"statement":"with target as (select id from public.club_events where public_id = :id!::uuid),\nadded as (\n  insert into public.club_event_rsvps (event_id)\n  select id from target where :active!::boolean on conflict (profile_id,event_id) do nothing\n), removed as (\n  delete from public.club_event_rsvps where event_id in (select id from target) and not :active!::boolean\n)\nselect exists(select 1 from target) as found"};

/**
 * Query generated from SQL:
 * ```
 * with target as (select id from public.club_events where public_id = :id!::uuid),
 * added as (
 *   insert into public.club_event_rsvps (event_id)
 *   select id from target where :active!::boolean on conflict (profile_id,event_id) do nothing
 * ), removed as (
 *   delete from public.club_event_rsvps where event_id in (select id from target) and not :active!::boolean
 * )
 * select exists(select 1 from target) as found
 * ```
 */
export const setCampusRsvp = new PreparedQuery<ISetCampusRsvpParams,ISetCampusRsvpResult>(setCampusRsvpIR);


/** 'GetPublishableClub' parameters type */
export interface IGetPublishableClubParams {
  clubId: string;
}

/** 'GetPublishableClub' return type */
export interface IGetPublishableClubResult {
  internal_id: string | null;
}

/** 'GetPublishableClub' query type */
export interface IGetPublishableClubQuery {
  params: IGetPublishableClubParams;
  result: IGetPublishableClubResult;
}

const getPublishableClubIR: any = {"usedParamSet":{"clubId":true},"params":[{"name":"clubId","required":true,"transform":{"type":"scalar"},"locs":[{"a":73,"b":80}]}],"statement":"select c.id::text as internal_id from public.clubs c where c.public_id = :clubId!::uuid\nand ((select private.current_role()) = 'admin' or\n ((select private.current_role()) = 'club_leader' and c.leader_id = (select private.current_profile_id())))"};

/**
 * Query generated from SQL:
 * ```
 * select c.id::text as internal_id from public.clubs c where c.public_id = :clubId!::uuid
 * and ((select private.current_role()) = 'admin' or
 *  ((select private.current_role()) = 'club_leader' and c.leader_id = (select private.current_profile_id())))
 * ```
 */
export const getPublishableClub = new PreparedQuery<IGetPublishableClubParams,IGetPublishableClubResult>(getPublishableClubIR);


/** 'CreateCampusPost' parameters type */
export interface ICreateCampusPostParams {
  clubInternalId: NumberOrString;
  eventId?: string | null | void;
  text: string;
}

/** 'CreateCampusPost' return type */
export interface ICreateCampusPostResult {
  id: string;
}

/** 'CreateCampusPost' query type */
export interface ICreateCampusPostQuery {
  params: ICreateCampusPostParams;
  result: ICreateCampusPostResult;
}

const createCampusPostIR: any = {"usedParamSet":{"clubInternalId":true,"text":true,"eventId":true},"params":[{"name":"clubInternalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":63,"b":78},{"a":209,"b":224}]},{"name":"text","required":true,"transform":{"type":"scalar"},"locs":[{"a":95,"b":100}]},{"name":"eventId","required":false,"transform":{"type":"scalar"},"locs":[{"a":178,"b":185},{"a":240,"b":247}]}],"statement":"insert into public.club_posts (club_id, event_id, body)\nselect :clubInternalId!::bigint, e.id, :text!\nfrom (select 1) placeholder\nleft join public.club_events e on e.public_id = :eventId::uuid and e.club_id = :clubInternalId!::bigint\nwhere :eventId::uuid is null or e.id is not null\nreturning public_id as id"};

/**
 * Query generated from SQL:
 * ```
 * insert into public.club_posts (club_id, event_id, body)
 * select :clubInternalId!::bigint, e.id, :text!
 * from (select 1) placeholder
 * left join public.club_events e on e.public_id = :eventId::uuid and e.club_id = :clubInternalId!::bigint
 * where :eventId::uuid is null or e.id is not null
 * returning public_id as id
 * ```
 */
export const createCampusPost = new PreparedQuery<ICreateCampusPostParams,ICreateCampusPostResult>(createCampusPostIR);


/** 'CreateCampusEvent' parameters type */
export interface ICreateCampusEventParams {
  clubInternalId: NumberOrString;
  description: string;
  ends_at: DateOrString;
  event_type: string;
  location: string;
  note: string;
  poster: string;
  price: string;
  starts_at: DateOrString;
  title: string;
}

/** 'CreateCampusEvent' return type */
export interface ICreateCampusEventResult {
  id: string;
}

/** 'CreateCampusEvent' query type */
export interface ICreateCampusEventQuery {
  params: ICreateCampusEventParams;
  result: ICreateCampusEventResult;
}

const createCampusEventIR: any = {"usedParamSet":{"clubInternalId":true,"title":true,"starts_at":true,"ends_at":true,"location":true,"price":true,"event_type":true,"poster":true,"description":true,"note":true},"params":[{"name":"clubInternalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":123,"b":138}]},{"name":"title","required":true,"transform":{"type":"scalar"},"locs":[{"a":148,"b":154}]},{"name":"starts_at","required":true,"transform":{"type":"scalar"},"locs":[{"a":156,"b":166}]},{"name":"ends_at","required":true,"transform":{"type":"scalar"},"locs":[{"a":181,"b":189}]},{"name":"location","required":true,"transform":{"type":"scalar"},"locs":[{"a":204,"b":213}]},{"name":"price","required":true,"transform":{"type":"scalar"},"locs":[{"a":215,"b":221}]},{"name":"event_type","required":true,"transform":{"type":"scalar"},"locs":[{"a":223,"b":234}]},{"name":"poster","required":true,"transform":{"type":"scalar"},"locs":[{"a":236,"b":243}]},{"name":"description","required":true,"transform":{"type":"scalar"},"locs":[{"a":245,"b":257}]},{"name":"note","required":true,"transform":{"type":"scalar"},"locs":[{"a":259,"b":264}]}],"statement":"insert into public.club_events (club_id,title,starts_at,ends_at,location,price,event_type,poster,description,note)\nvalues (:clubInternalId!::bigint,:title!,:starts_at!::timestamptz,:ends_at!::timestamptz,:location!,:price!,:event_type!,:poster!,:description!,:note!)\nreturning public_id as id"};

/**
 * Query generated from SQL:
 * ```
 * insert into public.club_events (club_id,title,starts_at,ends_at,location,price,event_type,poster,description,note)
 * values (:clubInternalId!::bigint,:title!,:starts_at!::timestamptz,:ends_at!::timestamptz,:location!,:price!,:event_type!,:poster!,:description!,:note!)
 * returning public_id as id
 * ```
 */
export const createCampusEvent = new PreparedQuery<ICreateCampusEventParams,ICreateCampusEventResult>(createCampusEventIR);


