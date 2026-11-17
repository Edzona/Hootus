/** Types generated for queries found in "../supabase/queries/listings.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type NumberOrString = number | string;

export type stringArray = (string)[];

/** 'CreateListing' parameters type */
export interface ICreateListingParams {
  authorId: NumberOrString;
  category: string;
  description: string;
  image_urls: stringArray;
  location?: string | null | void;
  price_jpy?: NumberOrString | null | void;
  title: string;
}

/** 'CreateListing' return type */
export interface ICreateListingResult {
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

/** 'CreateListing' query type */
export interface ICreateListingQuery {
  params: ICreateListingParams;
  result: ICreateListingResult;
}

const createListingIR: any = {"usedParamSet":{"authorId":true,"category":true,"title":true,"description":true,"price_jpy":true,"image_urls":true,"location":true},"params":[{"name":"authorId","required":true,"transform":{"type":"scalar"},"locs":[{"a":111,"b":120}]},{"name":"category","required":true,"transform":{"type":"scalar"},"locs":[{"a":131,"b":140}]},{"name":"title","required":true,"transform":{"type":"scalar"},"locs":[{"a":143,"b":149}]},{"name":"description","required":true,"transform":{"type":"scalar"},"locs":[{"a":152,"b":164}]},{"name":"price_jpy","required":false,"transform":{"type":"scalar"},"locs":[{"a":167,"b":176}]},{"name":"image_urls","required":true,"transform":{"type":"scalar"},"locs":[{"a":179,"b":190}]},{"name":"location","required":false,"transform":{"type":"scalar"},"locs":[{"a":193,"b":201}]}],"statement":"insert into public.listings (author_id, category, title, description, price_jpy, image_urls, location)\nvalues (:authorId!::bigint, :category!, :title!, :description!, :price_jpy, :image_urls!, :location)\nreturning public_id as id, category, title, description,\nprice_jpy::double precision as price_jpy, image_urls, location, status,\ncreated_at, updated_at, private.author_name(author_id) as author_name"};

/**
 * Query generated from SQL:
 * ```
 * insert into public.listings (author_id, category, title, description, price_jpy, image_urls, location)
 * values (:authorId!::bigint, :category!, :title!, :description!, :price_jpy, :image_urls!, :location)
 * returning public_id as id, category, title, description,
 * price_jpy::double precision as price_jpy, image_urls, location, status,
 * created_at, updated_at, private.author_name(author_id) as author_name
 * ```
 */
export const createListing = new PreparedQuery<ICreateListingParams,ICreateListingResult>(createListingIR);


/** 'OwnsListingPhotos' parameters type */
export interface IOwnsListingPhotosParams {
  names: stringArray;
}

/** 'OwnsListingPhotos' return type */
export interface IOwnsListingPhotosResult {
  owned: boolean | null;
}

/** 'OwnsListingPhotos' query type */
export interface IOwnsListingPhotosQuery {
  params: IOwnsListingPhotosParams;
  result: IOwnsListingPhotosResult;
}

const ownsListingPhotosIR: any = {"usedParamSet":{"names":true},"params":[{"name":"names","required":true,"transform":{"type":"scalar"},"locs":[{"a":35,"b":41}]}],"statement":"select private.owns_listing_photos(:names!::text[]) as owned"};

/**
 * Query generated from SQL:
 * ```
 * select private.owns_listing_photos(:names!::text[]) as owned
 * ```
 */
export const ownsListingPhotos = new PreparedQuery<IOwnsListingPhotosParams,IOwnsListingPhotosResult>(ownsListingPhotosIR);


/** 'GetListings' parameters type */
export interface IGetListingsParams {
  limit: number;
  offset: number;
}

/** 'GetListings' return type */
export interface IGetListingsResult {
  author_name: string | null;
  category: string;
  created_at: Date;
  description: string;
  id: string;
  image_urls: stringArray;
  is_mine: boolean | null;
  location: string | null;
  price_jpy: number | null;
  status: string;
  title: string;
  updated_at: Date;
}

/** 'GetListings' query type */
export interface IGetListingsQuery {
  params: IGetListingsParams;
  result: IGetListingsResult;
}

const getListingsIR: any = {"usedParamSet":{"limit":true,"offset":true},"params":[{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":349,"b":355}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":369,"b":376}]}],"statement":"select public_id as id, category, title, description,\nprice_jpy::double precision as price_jpy, image_urls, location, status,\ncreated_at, updated_at, private.author_name(author_id) as author_name,\n(author_id = (select private.current_profile_id())) as is_mine\nfrom public.listings\nwhere status = 'active'\norder by created_at desc, listings.id limit :limit!::int offset :offset!::int"};

/**
 * Query generated from SQL:
 * ```
 * select public_id as id, category, title, description,
 * price_jpy::double precision as price_jpy, image_urls, location, status,
 * created_at, updated_at, private.author_name(author_id) as author_name,
 * (author_id = (select private.current_profile_id())) as is_mine
 * from public.listings
 * where status = 'active'
 * order by created_at desc, listings.id limit :limit!::int offset :offset!::int
 * ```
 */
export const getListings = new PreparedQuery<IGetListingsParams,IGetListingsResult>(getListingsIR);


/** 'SetListingStatus' parameters type */
export interface ISetListingStatusParams {
  id: string;
  status: string;
}

/** 'SetListingStatus' return type */
export interface ISetListingStatusResult {
  id: string;
  status: string;
}

/** 'SetListingStatus' query type */
export interface ISetListingStatusQuery {
  params: ISetListingStatusParams;
  result: ISetListingStatusResult;
}

const setListingStatusIR: any = {"usedParamSet":{"status":true,"id":true},"params":[{"name":"status","required":true,"transform":{"type":"scalar"},"locs":[{"a":89,"b":96}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":116,"b":119}]}],"statement":"-- Only the author can end their own active listing.\nupdate public.listings set status = :status!\nwhere public_id = :id!::uuid\n  and author_id = (select private.current_profile_id())\n  and status = 'active'\nreturning public_id as id, status"};

/**
 * Query generated from SQL:
 * ```
 * -- Only the author can end their own active listing.
 * update public.listings set status = :status!
 * where public_id = :id!::uuid
 *   and author_id = (select private.current_profile_id())
 *   and status = 'active'
 * returning public_id as id, status
 * ```
 */
export const setListingStatus = new PreparedQuery<ISetListingStatusParams,ISetListingStatusResult>(setListingStatusIR);


/** 'GetMySoldListings' parameters type */
export interface IGetMySoldListingsParams {
  limit: number;
  offset: number;
}

/** 'GetMySoldListings' return type */
export interface IGetMySoldListingsResult {
  category: string;
  ended_at: Date | null;
  id: string;
  image_urls: stringArray;
  price_jpy: number | null;
  title: string;
}

/** 'GetMySoldListings' query type */
export interface IGetMySoldListingsQuery {
  params: IGetMySoldListingsParams;
  result: IGetMySoldListingsResult;
}

const getMySoldListingsIR: any = {"usedParamSet":{"limit":true,"offset":true},"params":[{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":320,"b":326}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":340,"b":347}]}],"statement":"-- The caller's successful listings, newest first, for their profile.\nselect public_id as id, category, title,\nprice_jpy::double precision as price_jpy, image_urls, ended_at\nfrom public.listings\nwhere author_id = (select private.current_profile_id()) and status = 'sold'\norder by ended_at desc nulls last, id desc\nlimit :limit!::int offset :offset!::int"};

/**
 * Query generated from SQL:
 * ```
 * -- The caller's successful listings, newest first, for their profile.
 * select public_id as id, category, title,
 * price_jpy::double precision as price_jpy, image_urls, ended_at
 * from public.listings
 * where author_id = (select private.current_profile_id()) and status = 'sold'
 * order by ended_at desc nulls last, id desc
 * limit :limit!::int offset :offset!::int
 * ```
 */
export const getMySoldListings = new PreparedQuery<IGetMySoldListingsParams,IGetMySoldListingsResult>(getMySoldListingsIR);


/** 'GetListingContact' parameters type */
export interface IGetListingContactParams {
  id: string;
}

/** 'GetListingContact' return type */
export interface IGetListingContactResult {
  email: string | null;
  seller_name: string | null;
}

/** 'GetListingContact' query type */
export interface IGetListingContactQuery {
  params: IGetListingContactParams;
  result: IGetListingContactResult;
}

const getListingContactIR: any = {"usedParamSet":{"id":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":61,"b":64}]}],"statement":"select email, seller_name from private.listing_contact_email(:id!::uuid)"};

/**
 * Query generated from SQL:
 * ```
 * select email, seller_name from private.listing_contact_email(:id!::uuid)
 * ```
 */
export const getListingContact = new PreparedQuery<IGetListingContactParams,IGetListingContactResult>(getListingContactIR);


/** 'UpdateListing' parameters type */
export interface IUpdateListingParams {
  category: string;
  description: string;
  id: string;
  image_urls: stringArray;
  location?: string | null | void;
  price_jpy?: NumberOrString | null | void;
  title: string;
}

/** 'UpdateListing' return type */
export interface IUpdateListingResult {
  author_name: string | null;
  category: string;
  created_at: Date;
  description: string;
  id: string;
  image_urls: stringArray;
  is_mine: boolean | null;
  location: string | null;
  price_jpy: number | null;
  status: string;
  title: string;
  updated_at: Date;
}

/** 'UpdateListing' query type */
export interface IUpdateListingQuery {
  params: IUpdateListingParams;
  result: IUpdateListingResult;
}

const updateListingIR: any = {"usedParamSet":{"category":true,"title":true,"description":true,"price_jpy":true,"image_urls":true,"location":true,"id":true},"params":[{"name":"category","required":true,"transform":{"type":"scalar"},"locs":[{"a":94,"b":103}]},{"name":"title","required":true,"transform":{"type":"scalar"},"locs":[{"a":116,"b":122}]},{"name":"description","required":true,"transform":{"type":"scalar"},"locs":[{"a":141,"b":153}]},{"name":"price_jpy","required":false,"transform":{"type":"scalar"},"locs":[{"a":170,"b":179}]},{"name":"image_urls","required":true,"transform":{"type":"scalar"},"locs":[{"a":197,"b":208}]},{"name":"location","required":false,"transform":{"type":"scalar"},"locs":[{"a":224,"b":232}]},{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":252,"b":255}]}],"statement":"-- Only the author can edit their own active listing.\nupdate public.listings set\n  category = :category!,\n  title = :title!,\n  description = :description!,\n  price_jpy = :price_jpy,\n  image_urls = :image_urls!,\n  location = :location\nwhere public_id = :id!::uuid\n  and author_id = (select private.current_profile_id())\n  and status = 'active'\nreturning public_id as id, category, title, description,\nprice_jpy::double precision as price_jpy, image_urls, location, status,\ncreated_at, updated_at, private.author_name(author_id) as author_name,\ntrue as is_mine"};

/**
 * Query generated from SQL:
 * ```
 * -- Only the author can edit their own active listing.
 * update public.listings set
 *   category = :category!,
 *   title = :title!,
 *   description = :description!,
 *   price_jpy = :price_jpy,
 *   image_urls = :image_urls!,
 *   location = :location
 * where public_id = :id!::uuid
 *   and author_id = (select private.current_profile_id())
 *   and status = 'active'
 * returning public_id as id, category, title, description,
 * price_jpy::double precision as price_jpy, image_urls, location, status,
 * created_at, updated_at, private.author_name(author_id) as author_name,
 * true as is_mine
 * ```
 */
export const updateListing = new PreparedQuery<IUpdateListingParams,IUpdateListingResult>(updateListingIR);


