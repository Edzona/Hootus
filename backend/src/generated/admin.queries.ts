/** Types generated for queries found in "../supabase/queries/admin.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type stringArray = (string)[];

/** 'GetUsers' parameters type */
export interface IGetUsersParams {
  limit: number;
  offset: number;
}

/** 'GetUsers' return type */
export interface IGetUsersResult {
  avatar_url: string | null;
  created_at: Date;
  full_name: string | null;
  id: string;
  role: string;
}

/** 'GetUsers' query type */
export interface IGetUsersQuery {
  params: IGetUsersParams;
  result: IGetUsersResult;
}

const getUsersIR: any = {"usedParamSet":{"limit":true,"offset":true},"params":[{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":206,"b":212}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":226,"b":233}]}],"statement":"-- Admin directory: public fields only, never email, student ID or Auth IDs.\nselect public_id as id, full_name, role, avatar_url, created_at\nfrom public.profiles\norder by created_at desc, profiles.id limit :limit!::int offset :offset!::int"};

/**
 * Query generated from SQL:
 * ```
 * -- Admin directory: public fields only, never email, student ID or Auth IDs.
 * select public_id as id, full_name, role, avatar_url, created_at
 * from public.profiles
 * order by created_at desc, profiles.id limit :limit!::int offset :offset!::int
 * ```
 */
export const getUsers = new PreparedQuery<IGetUsersParams,IGetUsersResult>(getUsersIR);


/** 'ModerateListing' parameters type */
export interface IModerateListingParams {
  description?: string | null | void;
  id: string;
  status?: string | null | void;
  title?: string | null | void;
}

/** 'ModerateListing' return type */
export interface IModerateListingResult {
  author_name: string | null;
  category: string;
  created_at: Date;
  description: string;
  id: string;
  image_urls: stringArray;
  location: string | null;
  price_jpy: number | null;
  status: string;
  title: string;
  updated_at: Date;
}

/** 'ModerateListing' query type */
export interface IModerateListingQuery {
  params: IModerateListingParams;
  result: IModerateListingResult;
}

const moderateListingIR: any = {"usedParamSet":{"status":true,"title":true,"description":true,"id":true},"params":[{"name":"status","required":false,"transform":{"type":"scalar"},"locs":[{"a":47,"b":53}]},{"name":"title","required":false,"transform":{"type":"scalar"},"locs":[{"a":90,"b":95}]},{"name":"description","required":false,"transform":{"type":"scalar"},"locs":[{"a":137,"b":148}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":188,"b":191}]}],"statement":"update public.listings set\n  status = coalesce(:status::text, status),\n  title = coalesce(:title::text, title),\n  description = coalesce(:description::text, description)\nwhere public_id = :id!::uuid\nreturning public_id as id, category, title, description,\nprice_jpy::double precision as price_jpy, image_urls, location, status,\ncreated_at, updated_at, private.author_name(author_id) as author_name"};

/**
 * Query generated from SQL:
 * ```
 * update public.listings set
 *   status = coalesce(:status::text, status),
 *   title = coalesce(:title::text, title),
 *   description = coalesce(:description::text, description)
 * where public_id = :id!::uuid
 * returning public_id as id, category, title, description,
 * price_jpy::double precision as price_jpy, image_urls, location, status,
 * created_at, updated_at, private.author_name(author_id) as author_name
 * ```
 */
export const moderateListing = new PreparedQuery<IModerateListingParams,IModerateListingResult>(moderateListingIR);


/** 'DeleteListing' parameters type */
export interface IDeleteListingParams {
  id: string;
}

/** 'DeleteListing' return type */
export interface IDeleteListingResult {
  id: string;
}

/** 'DeleteListing' query type */
export interface IDeleteListingQuery {
  params: IDeleteListingParams;
  result: IDeleteListingResult;
}

const deleteListingIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":46,"b":49}]}],"statement":"delete from public.listings where public_id = :id!::uuid\nreturning public_id as id"};

/**
 * Query generated from SQL:
 * ```
 * delete from public.listings where public_id = :id!::uuid
 * returning public_id as id
 * ```
 */
export const deleteListing = new PreparedQuery<IDeleteListingParams,IDeleteListingResult>(deleteListingIR);


/** 'ModerateFeedPost' parameters type */
export interface IModerateFeedPostParams {
  body?: string | null | void;
  id: string;
  title?: string | null | void;
}

/** 'ModerateFeedPost' return type */
export interface IModerateFeedPostResult {
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

/** 'ModerateFeedPost' query type */
export interface IModerateFeedPostQuery {
  params: IModerateFeedPostParams;
  result: IModerateFeedPostResult;
}

const moderateFeedPostIR: any = {"usedParamSet":{"title":true,"body":true,"id":true},"params":[{"name":"title","required":false,"transform":{"type":"scalar"},"locs":[{"a":48,"b":53}]},{"name":"body","required":false,"transform":{"type":"scalar"},"locs":[{"a":88,"b":92}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":125,"b":128}]}],"statement":"update public.feed_posts set\n  title = coalesce(:title::text, title),\n  body = coalesce(:body::text, body)\nwhere public_id = :id!::uuid\nreturning public_id as id, kind, title, body, image_urls, room_number, meeting_time,\nbusiness_name, coupon_code, expires_at, created_at, updated_at,\nprivate.author_name(author_id) as author_name"};

/**
 * Query generated from SQL:
 * ```
 * update public.feed_posts set
 *   title = coalesce(:title::text, title),
 *   body = coalesce(:body::text, body)
 * where public_id = :id!::uuid
 * returning public_id as id, kind, title, body, image_urls, room_number, meeting_time,
 * business_name, coupon_code, expires_at, created_at, updated_at,
 * private.author_name(author_id) as author_name
 * ```
 */
export const moderateFeedPost = new PreparedQuery<IModerateFeedPostParams,IModerateFeedPostResult>(moderateFeedPostIR);


/** 'DeleteFeedPost' parameters type */
export interface IDeleteFeedPostParams {
  id: string;
}

/** 'DeleteFeedPost' return type */
export interface IDeleteFeedPostResult {
  id: string;
}

/** 'DeleteFeedPost' query type */
export interface IDeleteFeedPostQuery {
  params: IDeleteFeedPostParams;
  result: IDeleteFeedPostResult;
}

const deleteFeedPostIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":48,"b":51}]}],"statement":"delete from public.feed_posts where public_id = :id!::uuid\nreturning public_id as id"};

/**
 * Query generated from SQL:
 * ```
 * delete from public.feed_posts where public_id = :id!::uuid
 * returning public_id as id
 * ```
 */
export const deleteFeedPost = new PreparedQuery<IDeleteFeedPostParams,IDeleteFeedPostResult>(deleteFeedPostIR);


