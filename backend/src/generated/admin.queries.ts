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


/** 'SetUserRole' parameters type */
export interface ISetUserRoleParams {
  id: string;
  role: string;
}

/** 'SetUserRole' return type */
export interface ISetUserRoleResult {
  avatar_url: string | null;
  created_at: Date | null;
  full_name: string | null;
  id: string | null;
  role: string | null;
}

/** 'SetUserRole' query type */
export interface ISetUserRoleQuery {
  params: ISetUserRoleParams;
  result: ISetUserRoleResult;
}

const setUserRoleIR: any = {"usedParamSet":{"id":true,"role":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":81,"b":84}]},{"name":"role","required":true,"transform":{"type":"scalar"},"locs":[{"a":93,"b":98}]}],"statement":"select id, full_name, role, avatar_url, created_at\nfrom private.set_profile_role(:id!::uuid, :role!::text)"};

/**
 * Query generated from SQL:
 * ```
 * select id, full_name, role, avatar_url, created_at
 * from private.set_profile_role(:id!::uuid, :role!::text)
 * ```
 */
export const setUserRole = new PreparedQuery<ISetUserRoleParams,ISetUserRoleResult>(setUserRoleIR);


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


/** 'GetClubRequests' parameters type */
export interface IGetClubRequestsParams {
  limit: number;
  offset: number;
}

/** 'GetClubRequests' return type */
export interface IGetClubRequestsResult {
  category: string;
  created_at: Date;
  description: string;
  handle: string;
  id: string;
  location: string;
  meeting: string;
  name: string;
  requester_name: string | null;
  review_note: string | null;
  reviewed_at: Date | null;
  status: string;
  verification_note: string;
}

/** 'GetClubRequests' query type */
export interface IGetClubRequestsQuery {
  params: IGetClubRequestsParams;
  result: IGetClubRequestsResult;
}

const getClubRequestsIR: any = {"usedParamSet":{"limit":true,"offset":true},"params":[{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":338,"b":344}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":358,"b":365}]}],"statement":"select r.public_id as id, r.name, r.handle, r.category, r.description, r.meeting, r.location,\n  r.verification_note, r.status, r.review_note, r.created_at, r.reviewed_at,\n  private.author_name(r.requester_id) as requester_name\nfrom public.club_requests r\norder by case when r.status = 'pending' then 0 else 1 end, r.created_at desc\nlimit :limit!::int offset :offset!::int"};

/**
 * Query generated from SQL:
 * ```
 * select r.public_id as id, r.name, r.handle, r.category, r.description, r.meeting, r.location,
 *   r.verification_note, r.status, r.review_note, r.created_at, r.reviewed_at,
 *   private.author_name(r.requester_id) as requester_name
 * from public.club_requests r
 * order by case when r.status = 'pending' then 0 else 1 end, r.created_at desc
 * limit :limit!::int offset :offset!::int
 * ```
 */
export const getClubRequests = new PreparedQuery<IGetClubRequestsParams,IGetClubRequestsResult>(getClubRequestsIR);


/** 'ReviewClubRequest' parameters type */
export interface IReviewClubRequestParams {
  decision: string;
  id: string;
  note?: string | null | void;
}

/** 'ReviewClubRequest' return type */
export interface IReviewClubRequestResult {
  category: string | null;
  handle: string | null;
  id: string | null;
  name: string | null;
  review_note: string | null;
  reviewed_at: Date | null;
  status: string | null;
}

/** 'ReviewClubRequest' query type */
export interface IReviewClubRequestQuery {
  params: IReviewClubRequestParams;
  result: IReviewClubRequestResult;
}

const reviewClubRequestIR: any = {"usedParamSet":{"id":true,"decision":true,"note":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":101,"b":104}]},{"name":"decision","required":true,"transform":{"type":"scalar"},"locs":[{"a":113,"b":122}]},{"name":"note","required":false,"transform":{"type":"scalar"},"locs":[{"a":131,"b":135}]}],"statement":"select id, name, handle, category, status, review_note, reviewed_at\nfrom private.review_club_request(:id!::uuid, :decision!::text, :note::text)"};

/**
 * Query generated from SQL:
 * ```
 * select id, name, handle, category, status, review_note, reviewed_at
 * from private.review_club_request(:id!::uuid, :decision!::text, :note::text)
 * ```
 */
export const reviewClubRequest = new PreparedQuery<IReviewClubRequestParams,IReviewClubRequestResult>(reviewClubRequestIR);


/** 'CreatePartnerAccount' parameters type */
export interface ICreatePartnerAccountParams {
  category: string;
  contactName: string;
  description: string;
  email: string;
  handle: string;
  hours: string;
  location: string;
  orgName: string;
}

/** 'CreatePartnerAccount' return type */
export interface ICreatePartnerAccountResult {
  category: string | null;
  club_id: string | null;
  email: string | null;
  handle: string | null;
  org_name: string | null;
  profile_id: string | null;
}

/** 'CreatePartnerAccount' query type */
export interface ICreatePartnerAccountQuery {
  params: ICreatePartnerAccountParams;
  result: ICreatePartnerAccountResult;
}

const createPartnerAccountIR: any = {"usedParamSet":{"email":true,"contactName":true,"orgName":true,"handle":true,"category":true,"description":true,"hours":true,"location":true},"params":[{"name":"email","required":true,"transform":{"type":"scalar"},"locs":[{"a":117,"b":123}]},{"name":"contactName","required":true,"transform":{"type":"scalar"},"locs":[{"a":132,"b":144}]},{"name":"orgName","required":true,"transform":{"type":"scalar"},"locs":[{"a":153,"b":161}]},{"name":"handle","required":true,"transform":{"type":"scalar"},"locs":[{"a":170,"b":177}]},{"name":"category","required":true,"transform":{"type":"scalar"},"locs":[{"a":188,"b":197}]},{"name":"description","required":true,"transform":{"type":"scalar"},"locs":[{"a":206,"b":218}]},{"name":"hours","required":true,"transform":{"type":"scalar"},"locs":[{"a":227,"b":233}]},{"name":"location","required":true,"transform":{"type":"scalar"},"locs":[{"a":242,"b":251}]}],"statement":"select profile_id, club_id, email, org_name_out as org_name, handle, category\nfrom private.create_partner_account(\n  :email!::text, :contactName!::text, :orgName!::text, :handle!::text,\n  :category!::text, :description!::text, :hours!::text, :location!::text\n)"};

/**
 * Query generated from SQL:
 * ```
 * select profile_id, club_id, email, org_name_out as org_name, handle, category
 * from private.create_partner_account(
 *   :email!::text, :contactName!::text, :orgName!::text, :handle!::text,
 *   :category!::text, :description!::text, :hours!::text, :location!::text
 * )
 * ```
 */
export const createPartnerAccount = new PreparedQuery<ICreatePartnerAccountParams,ICreatePartnerAccountResult>(createPartnerAccountIR);


