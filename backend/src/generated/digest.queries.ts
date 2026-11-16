/** Types generated for queries found in "../supabase/queries/digest.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

export type DateOrString = Date | string;

export type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

/** 'ClaimDigests' parameters type */
export interface IClaimDigestsParams {
  batch: number;
}

/** 'ClaimDigests' return type */
export interface IClaimDigestsResult {
  club_posts: Json;
  email: string;
  full_name: string | null;
  listings: Json;
  offers: Json;
  profile_id: string;
  since: Date;
  total: number;
}

/** 'ClaimDigests' query type */
export interface IClaimDigestsQuery {
  params: IClaimDigestsParams;
  result: IClaimDigestsResult;
}

const claimDigestsIR: any = {"usedParamSet":{"batch":true},"params":[{"name":"batch","required":true,"transform":{"type":"scalar"},"locs":[{"a":294,"b":300}]}],"statement":"-- Server job only: claims members with new activity and advances their digest window.\nselect profile_id as \"profile_id!\", email as \"email!\", full_name, since as \"since!\",\n  total as \"total!\", listings as \"listings!\", club_posts as \"club_posts!\", offers as \"offers!\"\nfrom private.claim_digests(:batch!::int)"};

/**
 * Query generated from SQL:
 * ```
 * -- Server job only: claims members with new activity and advances their digest window.
 * select profile_id as "profile_id!", email as "email!", full_name, since as "since!",
 *   total as "total!", listings as "listings!", club_posts as "club_posts!", offers as "offers!"
 * from private.claim_digests(:batch!::int)
 * ```
 */
export const claimDigests = new PreparedQuery<IClaimDigestsParams,IClaimDigestsResult>(claimDigestsIR);


/** 'RevertDigest' parameters type */
export interface IRevertDigestParams {
  id: string;
  since: DateOrString;
}

/** 'RevertDigest' return type */
export interface IRevertDigestResult {
  reverted: boolean;
}

/** 'RevertDigest' query type */
export interface IRevertDigestQuery {
  params: IRevertDigestParams;
  result: IRevertDigestResult;
}

const revertDigestIR: any = {"usedParamSet":{"id":true,"since":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":29,"b":32}]},{"name":"since","required":true,"transform":{"type":"scalar"},"locs":[{"a":41,"b":47}]}],"statement":"select private.revert_digest(:id!::uuid, :since!::timestamptz) as \"reverted!\""};

/**
 * Query generated from SQL:
 * ```
 * select private.revert_digest(:id!::uuid, :since!::timestamptz) as "reverted!"
 * ```
 */
export const revertDigest = new PreparedQuery<IRevertDigestParams,IRevertDigestResult>(revertDigestIR);


/** 'SetEmailDigestByToken' parameters type */
export interface ISetEmailDigestByTokenParams {
  enabled: boolean;
  id: string;
}

/** 'SetEmailDigestByToken' return type */
export interface ISetEmailDigestByTokenResult {
  found: boolean;
}

/** 'SetEmailDigestByToken' query type */
export interface ISetEmailDigestByTokenQuery {
  params: ISetEmailDigestByTokenParams;
  result: ISetEmailDigestByTokenResult;
}

const setEmailDigestByTokenIR: any = {"usedParamSet":{"id":true,"enabled":true},"params":[{"name":"id","required":true,"transform":{"type":"scalar"},"locs":[{"a":32,"b":35}]},{"name":"enabled","required":true,"transform":{"type":"scalar"},"locs":[{"a":44,"b":52}]}],"statement":"select private.set_email_digest(:id!::uuid, :enabled!::boolean) as \"found!\""};

/**
 * Query generated from SQL:
 * ```
 * select private.set_email_digest(:id!::uuid, :enabled!::boolean) as "found!"
 * ```
 */
export const setEmailDigestByToken = new PreparedQuery<ISetEmailDigestByTokenParams,ISetEmailDigestByTokenResult>(setEmailDigestByTokenIR);


