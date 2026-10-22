/** Types generated for queries found in "../supabase/queries/feed.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'CreateFeedPost' parameters type */
export interface ICreateFeedPostParams {
  authorId: NumberOrString;
  body: string;
  business_name?: string | null | void;
  coupon_code?: string | null | void;
  expires_at?: DateOrString | null | void;
  image_urls: stringArray;
  kind: string;
  meeting_time?: DateOrString | null | void;
  room_number?: string | null | void;
  title: string;
}

/** 'CreateFeedPost' return type */
export interface ICreateFeedPostResult {
  author_name: string | null;
  body: string;
  business_name: string | null;
  coupon_code: string | null;
  created_at: Date;
  expires_at: Date | null;
  id: string;
  image_urls: stringArray;
  kind: string;
  meeting_time: Date | null;
  room_number: string | null;
  title: string;
  updated_at: Date;
}

/** 'CreateFeedPost' query type */
export interface ICreateFeedPostQuery {
  params: ICreateFeedPostParams;
  result: ICreateFeedPostResult;
}

const createFeedPostIR: any = {"usedParamSet":{"authorId":true,"kind":true,"title":true,"body":true,"image_urls":true,"room_number":true,"meeting_time":true,"business_name":true,"coupon_code":true,"expires_at":true},"params":[{"name":"authorId","required":true,"transform":{"type":"scalar"},"locs":[{"a":148,"b":157}]},{"name":"kind","required":true,"transform":{"type":"scalar"},"locs":[{"a":168,"b":173}]},{"name":"title","required":true,"transform":{"type":"scalar"},"locs":[{"a":176,"b":182}]},{"name":"body","required":true,"transform":{"type":"scalar"},"locs":[{"a":185,"b":190}]},{"name":"image_urls","required":true,"transform":{"type":"scalar"},"locs":[{"a":193,"b":204}]},{"name":"room_number","required":false,"transform":{"type":"scalar"},"locs":[{"a":207,"b":218}]},{"name":"meeting_time","required":false,"transform":{"type":"scalar"},"locs":[{"a":221,"b":233}]},{"name":"business_name","required":false,"transform":{"type":"scalar"},"locs":[{"a":236,"b":249}]},{"name":"coupon_code","required":false,"transform":{"type":"scalar"},"locs":[{"a":252,"b":263}]},{"name":"expires_at","required":false,"transform":{"type":"scalar"},"locs":[{"a":266,"b":276}]}],"statement":"insert into public.feed_posts (author_id, kind, title, body, image_urls, room_number, meeting_time, business_name, coupon_code, expires_at)\nvalues (:authorId!::bigint, :kind!, :title!, :body!, :image_urls!, :room_number, :meeting_time, :business_name, :coupon_code, :expires_at)\nreturning public_id as id, kind, title, body, image_urls, room_number, meeting_time,\nbusiness_name, coupon_code, expires_at, created_at, updated_at,\nprivate.author_name(author_id) as author_name"};

/**
 * Query generated from SQL:
 * ```
 * insert into public.feed_posts (author_id, kind, title, body, image_urls, room_number, meeting_time, business_name, coupon_code, expires_at)
 * values (:authorId!::bigint, :kind!, :title!, :body!, :image_urls!, :room_number, :meeting_time, :business_name, :coupon_code, :expires_at)
 * returning public_id as id, kind, title, body, image_urls, room_number, meeting_time,
 * business_name, coupon_code, expires_at, created_at, updated_at,
 * private.author_name(author_id) as author_name
 * ```
 */
export const createFeedPost = new PreparedQuery<ICreateFeedPostParams,ICreateFeedPostResult>(createFeedPostIR);


/** 'GetFeed' parameters type */
export interface IGetFeedParams {
  limit: number;
  offset: number;
}

/** 'GetFeed' return type */
export interface IGetFeedResult {
  author_name: string | null;
  body: string;
  business_name: string | null;
  coupon_code: string | null;
  created_at: Date;
  expires_at: Date | null;
  id: string;
  image_urls: stringArray;
  kind: string;
  meeting_time: Date | null;
  room_number: string | null;
  title: string;
  updated_at: Date;
}

/** 'GetFeed' query type */
export interface IGetFeedQuery {
  params: IGetFeedParams;
  result: IGetFeedResult;
}

const getFeedIR: any = {"usedParamSet":{"limit":true,"offset":true},"params":[{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":261,"b":267}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":281,"b":288}]}],"statement":"select public_id as id, kind, title, body, image_urls, room_number, meeting_time,\nbusiness_name, coupon_code, expires_at, created_at, updated_at,\nprivate.author_name(author_id) as author_name from public.feed_posts\norder by created_at desc, feed_posts.id limit :limit!::int offset :offset!::int"};

/**
 * Query generated from SQL:
 * ```
 * select public_id as id, kind, title, body, image_urls, room_number, meeting_time,
 * business_name, coupon_code, expires_at, created_at, updated_at,
 * private.author_name(author_id) as author_name from public.feed_posts
 * order by created_at desc, feed_posts.id limit :limit!::int offset :offset!::int
 * ```
 */
export const getFeed = new PreparedQuery<IGetFeedParams,IGetFeedResult>(getFeedIR);


