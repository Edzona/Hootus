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

const getListingsIR: any = {"usedParamSet":{"limit":true,"offset":true},"params":[{"name":"limit","required":true,"transform":{"type":"scalar"},"locs":[{"a":261,"b":267}]},{"name":"offset","required":true,"transform":{"type":"scalar"},"locs":[{"a":281,"b":288}]}],"statement":"select public_id as id, category, title, description,\nprice_jpy::double precision as price_jpy, image_urls, location, status,\ncreated_at, updated_at, private.author_name(author_id) as author_name from public.listings\norder by created_at desc, listings.id limit :limit!::int offset :offset!::int"};

/**
 * Query generated from SQL:
 * ```
 * select public_id as id, category, title, description,
 * price_jpy::double precision as price_jpy, image_urls, location, status,
 * created_at, updated_at, private.author_name(author_id) as author_name from public.listings
 * order by created_at desc, listings.id limit :limit!::int offset :offset!::int
 * ```
 */
export const getListings = new PreparedQuery<IGetListingsParams,IGetListingsResult>(getListingsIR);


