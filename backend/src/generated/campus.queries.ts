/** Types generated for queries found in "../supabase/queries/campus.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

export type stringArray = (string)[];

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
  members: number | null;
  membership_role: string | null;
  membership_status: string | null;
  name: string;
  org_type: string;
  slug: string;
}

/** 'GetCampusClubs' query type */
export interface IGetCampusClubsQuery {
  params: IGetCampusClubsParams;
  result: IGetCampusClubsResult;
}

const getCampusClubsIR: any = {"usedParamSet":{},"params":[],"statement":"select c.public_id as id, c.slug, c.name, c.handle, c.mark, c.color, c.category, c.org_type,\n  c.description, c.meeting, c.location, c.is_sample,\n  private.club_follower_count(c.id) as followers,\n  exists(select 1 from public.club_follows f where f.club_id = c.id) as following,\n  private.club_member_count(c.id) as members,\n  (select m.status from public.club_members m\n   where m.club_id = c.id and m.profile_id = (select private.current_profile_id())) as membership_status,\n  (select m.role from public.club_members m\n   where m.club_id = c.id and m.profile_id = (select private.current_profile_id())) as membership_role,\n  private.can_manage_club(c.id) as can_post\nfrom public.clubs c\norder by c.name limit 100"};

/**
 * Query generated from SQL:
 * ```
 * select c.public_id as id, c.slug, c.name, c.handle, c.mark, c.color, c.category, c.org_type,
 *   c.description, c.meeting, c.location, c.is_sample,
 *   private.club_follower_count(c.id) as followers,
 *   exists(select 1 from public.club_follows f where f.club_id = c.id) as following,
 *   private.club_member_count(c.id) as members,
 *   (select m.status from public.club_members m
 *    where m.club_id = c.id and m.profile_id = (select private.current_profile_id())) as membership_status,
 *   (select m.role from public.club_members m
 *    where m.club_id = c.id and m.profile_id = (select private.current_profile_id())) as membership_role,
 *   private.can_manage_club(c.id) as can_post
 * from public.clubs c
 * order by c.name limit 100
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
  image_urls: stringArray;
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

const getCampusEventsIR: any = {"usedParamSet":{},"params":[],"statement":"select e.public_id as id, c.public_id as club, e.slug, e.title,\n  e.starts_at, e.ends_at, e.location, e.price, e.event_type, e.poster, e.description, e.note, e.image_urls,\n  exists(select 1 from public.club_event_rsvps r where r.event_id = e.id) as attending\nfrom public.club_events e join public.clubs c on c.id = e.club_id\norder by e.starts_at, e.id limit 100"};

/**
 * Query generated from SQL:
 * ```
 * select e.public_id as id, c.public_id as club, e.slug, e.title,
 *   e.starts_at, e.ends_at, e.location, e.price, e.event_type, e.poster, e.description, e.note, e.image_urls,
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
  image_urls: stringArray;
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

const getCampusPostsIR: any = {"usedParamSet":{"limit":true,"offset":true},"params":[{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":486,"b":492}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":506,"b":513}]}],"statement":"select p.public_id as id, c.public_id as club, e.public_id as event,\n  p.body as text, p.image_urls, p.created_at,\n  private.club_post_like_count(p.id) as likes,\n  exists(select 1 from public.club_post_likes l where l.post_id = p.id) as liked,\n  exists(select 1 from public.club_post_saves s where s.post_id = p.id) as saved\nfrom public.club_posts p join public.clubs c on c.id = p.club_id\nleft join public.club_events e on e.id = p.event_id\norder by p.created_at desc, p.id desc limit :limit!::int offset :offset!::int"};

/**
 * Query generated from SQL:
 * ```
 * select p.public_id as id, c.public_id as club, e.public_id as event,
 *   p.body as text, p.image_urls, p.created_at,
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
  image_urls: stringArray;
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

const getSavedCampusPostsIR: any = {"usedParamSet":{},"params":[],"statement":"select p.public_id as id, c.public_id as club, e.public_id as event,\n  p.body as text, p.image_urls, p.created_at,\n  private.club_post_like_count(p.id) as likes,\n  exists(select 1 from public.club_post_likes l where l.post_id = p.id) as liked,\n  true as saved\nfrom public.club_post_saves s join public.club_posts p on p.id = s.post_id\njoin public.clubs c on c.id = p.club_id left join public.club_events e on e.id = p.event_id\norder by s.created_at desc, s.id desc limit 100"};

/**
 * Query generated from SQL:
 * ```
 * select p.public_id as id, c.public_id as club, e.public_id as event,
 *   p.body as text, p.image_urls, p.created_at,
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

const getCampusListingsIR: any = {"usedParamSet":{},"params":[],"statement":"select public_id as id, category, title, description, price_jpy, location, is_sample\nfrom public.listings\nwhere status = 'active' and category in ('sales','housing')\norder by created_at desc, id desc limit 6"};

/**
 * Query generated from SQL:
 * ```
 * select public_id as id, category, title, description, price_jpy, location, is_sample
 * from public.listings
 * where status = 'active' and category in ('sales','housing')
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

const getPublishableClubIR: any = {"usedParamSet":{"clubId":true},"params":[{"name":"clubId","required":true,"transform":{"type":"scalar"},"locs":[{"a":73,"b":80}]}],"statement":"select c.id::text as internal_id from public.clubs c where c.public_id = :clubId!::uuid\nand private.can_manage_club(c.id)"};

/**
 * Query generated from SQL:
 * ```
 * select c.id::text as internal_id from public.clubs c where c.public_id = :clubId!::uuid
 * and private.can_manage_club(c.id)
 * ```
 */
export const getPublishableClub = new PreparedQuery<IGetPublishableClubParams,IGetPublishableClubResult>(getPublishableClubIR);


/** 'CreateCampusPost' parameters type */
export interface ICreateCampusPostParams {
  clubInternalId: NumberOrString;
  eventId?: string | null | void;
  image_urls: stringArray;
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

const createCampusPostIR: any = {"usedParamSet":{"clubInternalId":true,"text":true,"image_urls":true,"eventId":true},"params":[{"name":"clubInternalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":75,"b":90},{"a":235,"b":250}]},{"name":"text","required":true,"transform":{"type":"scalar"},"locs":[{"a":107,"b":112}]},{"name":"image_urls","required":true,"transform":{"type":"scalar"},"locs":[{"a":115,"b":126}]},{"name":"eventId","required":false,"transform":{"type":"scalar"},"locs":[{"a":204,"b":211},{"a":266,"b":273}]}],"statement":"insert into public.club_posts (club_id, event_id, body, image_urls)\nselect :clubInternalId!::bigint, e.id, :text!, :image_urls!\nfrom (select 1) placeholder\nleft join public.club_events e on e.public_id = :eventId::uuid and e.club_id = :clubInternalId!::bigint\nwhere :eventId::uuid is null or e.id is not null\nreturning public_id as id"};

/**
 * Query generated from SQL:
 * ```
 * insert into public.club_posts (club_id, event_id, body, image_urls)
 * select :clubInternalId!::bigint, e.id, :text!, :image_urls!
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
  image_urls: stringArray;
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

const createCampusEventIR: any = {"usedParamSet":{"clubInternalId":true,"title":true,"starts_at":true,"ends_at":true,"location":true,"price":true,"event_type":true,"poster":true,"description":true,"note":true,"image_urls":true},"params":[{"name":"clubInternalId","required":true,"transform":{"type":"scalar"},"locs":[{"a":134,"b":149}]},{"name":"title","required":true,"transform":{"type":"scalar"},"locs":[{"a":159,"b":165}]},{"name":"starts_at","required":true,"transform":{"type":"scalar"},"locs":[{"a":167,"b":177}]},{"name":"ends_at","required":true,"transform":{"type":"scalar"},"locs":[{"a":192,"b":200}]},{"name":"location","required":true,"transform":{"type":"scalar"},"locs":[{"a":215,"b":224}]},{"name":"price","required":true,"transform":{"type":"scalar"},"locs":[{"a":226,"b":232}]},{"name":"event_type","required":true,"transform":{"type":"scalar"},"locs":[{"a":234,"b":245}]},{"name":"poster","required":true,"transform":{"type":"scalar"},"locs":[{"a":247,"b":254}]},{"name":"description","required":true,"transform":{"type":"scalar"},"locs":[{"a":256,"b":268}]},{"name":"note","required":true,"transform":{"type":"scalar"},"locs":[{"a":270,"b":275}]},{"name":"image_urls","required":true,"transform":{"type":"scalar"},"locs":[{"a":277,"b":288}]}],"statement":"insert into public.club_events (club_id,title,starts_at,ends_at,location,price,event_type,poster,description,note,image_urls)\nvalues (:clubInternalId!::bigint,:title!,:starts_at!::timestamptz,:ends_at!::timestamptz,:location!,:price!,:event_type!,:poster!,:description!,:note!,:image_urls!)\nreturning public_id as id"};

/**
 * Query generated from SQL:
 * ```
 * insert into public.club_events (club_id,title,starts_at,ends_at,location,price,event_type,poster,description,note,image_urls)
 * values (:clubInternalId!::bigint,:title!,:starts_at!::timestamptz,:ends_at!::timestamptz,:location!,:price!,:event_type!,:poster!,:description!,:note!,:image_urls!)
 * returning public_id as id
 * ```
 */
export const createCampusEvent = new PreparedQuery<ICreateCampusEventParams,ICreateCampusEventResult>(createCampusEventIR);


/** 'RequestClubMembership' parameters type */
export interface IRequestClubMembershipParams {
  clubId: string;
}

/** 'RequestClubMembership' return type */
export interface IRequestClubMembershipResult {
  id: string | null;
  role: string | null;
  status: string | null;
}

/** 'RequestClubMembership' query type */
export interface IRequestClubMembershipQuery {
  params: IRequestClubMembershipParams;
  result: IRequestClubMembershipResult;
}

const requestClubMembershipIR: any = {"usedParamSet":{"clubId":true},"params":[{"name":"clubId","required":true,"transform":{"type":"scalar"},"locs":[{"a":62,"b":69}]}],"statement":"with target as (select id from public.clubs where public_id = :clubId!::uuid),\ninserted as (\n  insert into public.club_members (club_id)\n  select id from target\n  on conflict (club_id, profile_id) do nothing\n  returning public_id as id, status, role\n)\nselect id, status, role from inserted\nunion all\nselect m.public_id as id, m.status, m.role\nfrom public.club_members m\njoin target t on t.id = m.club_id\nwhere m.profile_id = (select private.current_profile_id())\n  and not exists (select 1 from inserted)"};

/**
 * Query generated from SQL:
 * ```
 * with target as (select id from public.clubs where public_id = :clubId!::uuid),
 * inserted as (
 *   insert into public.club_members (club_id)
 *   select id from target
 *   on conflict (club_id, profile_id) do nothing
 *   returning public_id as id, status, role
 * )
 * select id, status, role from inserted
 * union all
 * select m.public_id as id, m.status, m.role
 * from public.club_members m
 * join target t on t.id = m.club_id
 * where m.profile_id = (select private.current_profile_id())
 *   and not exists (select 1 from inserted)
 * ```
 */
export const requestClubMembership = new PreparedQuery<IRequestClubMembershipParams,IRequestClubMembershipResult>(requestClubMembershipIR);


/** 'LeaveClubMembership' parameters type */
export interface ILeaveClubMembershipParams {
  clubId: string;
}

/** 'LeaveClubMembership' return type */
export interface ILeaveClubMembershipResult {
  id: string;
}

/** 'LeaveClubMembership' query type */
export interface ILeaveClubMembershipQuery {
  params: ILeaveClubMembershipParams;
  result: ILeaveClubMembershipResult;
}

const leaveClubMembershipIR: any = {"usedParamSet":{"clubId":true},"params":[{"name":"clubId","required":true,"transform":{"type":"scalar"},"locs":[{"a":62,"b":69}]}],"statement":"with target as (select id from public.clubs where public_id = :clubId!::uuid)\ndelete from public.club_members\nwhere club_id in (select id from target)\n  and profile_id = (select private.current_profile_id())\nreturning public_id as id"};

/**
 * Query generated from SQL:
 * ```
 * with target as (select id from public.clubs where public_id = :clubId!::uuid)
 * delete from public.club_members
 * where club_id in (select id from target)
 *   and profile_id = (select private.current_profile_id())
 * returning public_id as id
 * ```
 */
export const leaveClubMembership = new PreparedQuery<ILeaveClubMembershipParams,ILeaveClubMembershipResult>(leaveClubMembershipIR);


/** 'GetClubMembers' parameters type */
export interface IGetClubMembersParams {
  clubId: string;
}

/** 'GetClubMembers' return type */
export interface IGetClubMembersResult {
  created_at: Date;
  id: string;
  is_me: boolean | null;
  name: string | null;
  role: string;
  status: string;
}

/** 'GetClubMembers' query type */
export interface IGetClubMembersQuery {
  params: IGetClubMembersParams;
  result: IGetClubMembersResult;
}

const getClubMembersIR: any = {"usedParamSet":{"clubId":true},"params":[{"name":"clubId","required":true,"transform":{"type":"scalar"},"locs":[{"a":254,"b":261}]}],"statement":"select m.public_id as id, private.author_name(m.profile_id) as name, m.role, m.status, m.created_at,\n  (m.profile_id = (select private.current_profile_id())) as is_me\nfrom public.club_members m\njoin public.clubs c on c.id = m.club_id\nwhere c.public_id = :clubId!::uuid\n  and private.can_manage_club(c.id)\norder by case when m.status = 'pending' then 0 else 1 end, m.created_at asc"};

/**
 * Query generated from SQL:
 * ```
 * select m.public_id as id, private.author_name(m.profile_id) as name, m.role, m.status, m.created_at,
 *   (m.profile_id = (select private.current_profile_id())) as is_me
 * from public.club_members m
 * join public.clubs c on c.id = m.club_id
 * where c.public_id = :clubId!::uuid
 *   and private.can_manage_club(c.id)
 * order by case when m.status = 'pending' then 0 else 1 end, m.created_at asc
 * ```
 */
export const getClubMembers = new PreparedQuery<IGetClubMembersParams,IGetClubMembersResult>(getClubMembersIR);


/** 'UpdateClubMember' parameters type */
export interface IUpdateClubMemberParams {
  clubId: string;
  memberId: string;
  role?: string | null | void;
  status?: string | null | void;
}

/** 'UpdateClubMember' return type */
export interface IUpdateClubMemberResult {
  created_at: Date;
  id: string;
  name: string | null;
  role: string;
  status: string;
}

/** 'UpdateClubMember' query type */
export interface IUpdateClubMemberQuery {
  params: IUpdateClubMemberParams;
  result: IUpdateClubMemberResult;
}

const updateClubMemberIR: any = {"usedParamSet":{"status":true,"role":true,"clubId":true,"memberId":true},"params":[{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":53,"b":59}]},{"name":"role","required":false,"transform":{"type":"scalar"},"locs":[{"a":97,"b":101}]},{"name":"clubId","required":true,"transform":{"type":"scalar"},"locs":[{"a":181,"b":188}]},{"name":"memberId","required":true,"transform":{"type":"scalar"},"locs":[{"a":216,"b":225}]}],"statement":"update public.club_members m set\n  status = coalesce(:status::text, m.status),\n  role = coalesce(:role::text, m.role)\nfrom public.clubs c\nwhere m.club_id = c.id\n  and c.public_id = :clubId!::uuid\n  and m.public_id = :memberId!::uuid\n  and private.can_manage_club(c.id)\n  and m.profile_id <> c.leader_id\nreturning m.public_id as id, private.author_name(m.profile_id) as name, m.role, m.status, m.created_at"};

/**
 * Query generated from SQL:
 * ```
 * update public.club_members m set
 *   status = coalesce(:status::text, m.status),
 *   role = coalesce(:role::text, m.role)
 * from public.clubs c
 * where m.club_id = c.id
 *   and c.public_id = :clubId!::uuid
 *   and m.public_id = :memberId!::uuid
 *   and private.can_manage_club(c.id)
 *   and m.profile_id <> c.leader_id
 * returning m.public_id as id, private.author_name(m.profile_id) as name, m.role, m.status, m.created_at
 * ```
 */
export const updateClubMember = new PreparedQuery<IUpdateClubMemberParams,IUpdateClubMemberResult>(updateClubMemberIR);


/** 'RemoveClubMember' parameters type */
export interface IRemoveClubMemberParams {
  clubId: string;
  memberId: string;
}

/** 'RemoveClubMember' return type */
export interface IRemoveClubMemberResult {
  id: string;
}

/** 'RemoveClubMember' query type */
export interface IRemoveClubMemberQuery {
  params: IRemoveClubMemberParams;
  result: IRemoveClubMemberResult;
}

const removeClubMemberIR: any = {"usedParamSet":{"clubId":true,"memberId":true},"params":[{"name":"clubId","required":true,"transform":{"type":"scalar"},"locs":[{"a":98,"b":105}]},{"name":"memberId","required":true,"transform":{"type":"scalar"},"locs":[{"a":133,"b":142}]}],"statement":"delete from public.club_members m\nusing public.clubs c\nwhere m.club_id = c.id\n  and c.public_id = :clubId!::uuid\n  and m.public_id = :memberId!::uuid\n  and private.can_manage_club(c.id)\n  and m.profile_id <> c.leader_id\nreturning m.public_id as id"};

/**
 * Query generated from SQL:
 * ```
 * delete from public.club_members m
 * using public.clubs c
 * where m.club_id = c.id
 *   and c.public_id = :clubId!::uuid
 *   and m.public_id = :memberId!::uuid
 *   and private.can_manage_club(c.id)
 *   and m.profile_id <> c.leader_id
 * returning m.public_id as id
 * ```
 */
export const removeClubMember = new PreparedQuery<IRemoveClubMemberParams,IRemoveClubMemberResult>(removeClubMemberIR);


/** 'CreateClubRequest' parameters type */
export interface ICreateClubRequestParams {
  category: string;
  description: string;
  handle: string;
  location: string;
  meeting: string;
  name: string;
  verificationNote: string;
}

/** 'CreateClubRequest' return type */
export interface ICreateClubRequestResult {
  category: string;
  created_at: Date;
  description: string;
  handle: string;
  id: string;
  location: string;
  meeting: string;
  name: string;
  review_note: string | null;
  status: string;
  verification_note: string;
}

/** 'CreateClubRequest' query type */
export interface ICreateClubRequestQuery {
  params: ICreateClubRequestParams;
  result: ICreateClubRequestResult;
}

const createClubRequestIR: any = {"usedParamSet":{"name":true,"handle":true,"category":true,"description":true,"meeting":true,"location":true,"verificationNote":true},"params":[{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":117,"b":122}]},{"name":"handle","required":true,"transform":{"type":"scalar"},"locs":[{"a":125,"b":132}]},{"name":"category","required":true,"transform":{"type":"scalar"},"locs":[{"a":135,"b":144}]},{"name":"description","required":true,"transform":{"type":"scalar"},"locs":[{"a":147,"b":159}]},{"name":"meeting","required":true,"transform":{"type":"scalar"},"locs":[{"a":162,"b":170}]},{"name":"location","required":true,"transform":{"type":"scalar"},"locs":[{"a":173,"b":182}]},{"name":"verificationNote","required":true,"transform":{"type":"scalar"},"locs":[{"a":185,"b":202}]}],"statement":"insert into public.club_requests (name, handle, category, description, meeting, location, verification_note)\nvalues (:name!, :handle!, :category!, :description!, :meeting!, :location!, :verificationNote!)\nreturning public_id as id, name, handle, category, description, meeting, location, verification_note, status, review_note, created_at"};

/**
 * Query generated from SQL:
 * ```
 * insert into public.club_requests (name, handle, category, description, meeting, location, verification_note)
 * values (:name!, :handle!, :category!, :description!, :meeting!, :location!, :verificationNote!)
 * returning public_id as id, name, handle, category, description, meeting, location, verification_note, status, review_note, created_at
 * ```
 */
export const createClubRequest = new PreparedQuery<ICreateClubRequestParams,ICreateClubRequestResult>(createClubRequestIR);


/** 'GetMyClubRequests' parameters type */
export type IGetMyClubRequestsParams = void;

/** 'GetMyClubRequests' return type */
export interface IGetMyClubRequestsResult {
  category: string;
  created_at: Date;
  description: string;
  handle: string;
  id: string;
  location: string;
  meeting: string;
  name: string;
  review_note: string | null;
  reviewed_at: Date | null;
  status: string;
  verification_note: string;
}

/** 'GetMyClubRequests' query type */
export interface IGetMyClubRequestsQuery {
  params: IGetMyClubRequestsParams;
  result: IGetMyClubRequestsResult;
}

const getMyClubRequestsIR: any = {"usedParamSet":{},"params":[],"statement":"select public_id as id, name, handle, category, description, meeting, location, verification_note, status, review_note, created_at, reviewed_at\nfrom public.club_requests\nwhere requester_id = (select private.current_profile_id())\norder by created_at desc"};

/**
 * Query generated from SQL:
 * ```
 * select public_id as id, name, handle, category, description, meeting, location, verification_note, status, review_note, created_at, reviewed_at
 * from public.club_requests
 * where requester_id = (select private.current_profile_id())
 * order by created_at desc
 * ```
 */
export const getMyClubRequests = new PreparedQuery<IGetMyClubRequestsParams,IGetMyClubRequestsResult>(getMyClubRequestsIR);


/** 'UpdateClub' parameters type */
export interface IUpdateClubParams {
  category: string;
  clubId: string;
  color: string;
  description: string;
  location: string;
  mark: string;
  meeting: string;
  name: string;
}

/** 'UpdateClub' return type */
export interface IUpdateClubResult {
  category: string;
  color: string;
  description: string;
  id: string;
  location: string;
  mark: string;
  meeting: string;
  name: string;
  org_type: string;
}

/** 'UpdateClub' query type */
export interface IUpdateClubQuery {
  params: IUpdateClubParams;
  result: IUpdateClubResult;
}

const updateClubIR: any = {"usedParamSet":{"name":true,"category":true,"description":true,"meeting":true,"location":true,"mark":true,"color":true,"clubId":true},"params":[{"name":"name","required":true,"transform":{"type":"scalar"},"locs":[{"a":33,"b":38}]},{"name":"category","required":true,"transform":{"type":"scalar"},"locs":[{"a":54,"b":63}]},{"name":"description","required":true,"transform":{"type":"scalar"},"locs":[{"a":82,"b":94}]},{"name":"meeting","required":true,"transform":{"type":"scalar"},"locs":[{"a":109,"b":117}]},{"name":"location","required":true,"transform":{"type":"scalar"},"locs":[{"a":133,"b":142}]},{"name":"mark","required":true,"transform":{"type":"scalar"},"locs":[{"a":154,"b":159}]},{"name":"color","required":true,"transform":{"type":"scalar"},"locs":[{"a":172,"b":178}]},{"name":"clubId","required":true,"transform":{"type":"scalar"},"locs":[{"a":198,"b":205}]}],"statement":"update public.clubs set\n  name = :name!,\n  category = :category!,\n  description = :description!,\n  meeting = :meeting!,\n  location = :location!,\n  mark = :mark!,\n  color = :color!\nwhere public_id = :clubId!::uuid\n  and private.can_manage_club(id)\nreturning public_id as id, name, category, description, meeting, location, mark, color, org_type"};

/**
 * Query generated from SQL:
 * ```
 * update public.clubs set
 *   name = :name!,
 *   category = :category!,
 *   description = :description!,
 *   meeting = :meeting!,
 *   location = :location!,
 *   mark = :mark!,
 *   color = :color!
 * where public_id = :clubId!::uuid
 *   and private.can_manage_club(id)
 * returning public_id as id, name, category, description, meeting, location, mark, color, org_type
 * ```
 */
export const updateClub = new PreparedQuery<IUpdateClubParams,IUpdateClubResult>(updateClubIR);


