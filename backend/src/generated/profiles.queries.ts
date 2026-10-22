/** Types generated for queries found in "../supabase/queries/profiles.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetAuthProfile' parameters type */
export interface IGetAuthProfileParams {
  authUserId: string;
}

/** 'GetAuthProfile' return type */
export interface IGetAuthProfileResult {
  email: string;
  full_name: string | null;
  internal_id: string;
  public_id: string;
  role: string;
}

/** 'GetAuthProfile' query type */
export interface IGetAuthProfileQuery {
  params: IGetAuthProfileParams;
  result: IGetAuthProfileResult;
}

const getAuthProfileIR: any = {"usedParamSet":{"authUserId":true},"params":[{"name":"authUserId","required":true,"transform":{"type":"scalar"},"locs":[{"a":111,"b":122}]}],"statement":"select id::text as \"internal_id!\", public_id, email, role, full_name\nfrom public.profiles where auth_user_id = :authUserId!"};

/**
 * Query generated from SQL:
 * ```
 * select id::text as "internal_id!", public_id, email, role, full_name
 * from public.profiles where auth_user_id = :authUserId!
 * ```
 */
export const getAuthProfile = new PreparedQuery<IGetAuthProfileParams,IGetAuthProfileResult>(getAuthProfileIR);


/** 'GetMyProfile' parameters type */
export interface IGetMyProfileParams {
  publicId: string;
}

/** 'GetMyProfile' return type */
export interface IGetMyProfileResult {
  avatar_url: string | null;
  bio: string | null;
  created_at: Date;
  email: string;
  full_name: string | null;
  id: string;
  role: string;
  student_id: string | null;
  updated_at: Date;
}

/** 'GetMyProfile' query type */
export interface IGetMyProfileQuery {
  params: IGetMyProfileParams;
  result: IGetMyProfileResult;
}

const getMyProfileIR: any = {"usedParamSet":{"publicId":true},"params":[{"name":"publicId","required":true,"transform":{"type":"scalar"},"locs":[{"a":139,"b":148}]}],"statement":"select public_id as id, email, student_id, full_name, avatar_url, bio,\nrole, created_at, updated_at\nfrom public.profiles where public_id = :publicId!"};

/**
 * Query generated from SQL:
 * ```
 * select public_id as id, email, student_id, full_name, avatar_url, bio,
 * role, created_at, updated_at
 * from public.profiles where public_id = :publicId!
 * ```
 */
export const getMyProfile = new PreparedQuery<IGetMyProfileParams,IGetMyProfileResult>(getMyProfileIR);


/** 'UpdateMyProfile' parameters type */
export interface IUpdateMyProfileParams {
  avatarUrl?: string | null | void;
  bio?: string | null | void;
  publicId: string;
  setAvatar: boolean;
  setBio: boolean;
}

/** 'UpdateMyProfile' return type */
export interface IUpdateMyProfileResult {
  avatar_url: string | null;
  bio: string | null;
  created_at: Date;
  email: string;
  full_name: string | null;
  id: string;
  role: string;
  student_id: string | null;
  updated_at: Date;
}

/** 'UpdateMyProfile' query type */
export interface IUpdateMyProfileQuery {
  params: IUpdateMyProfileParams;
  result: IUpdateMyProfileResult;
}

const updateMyProfileIR: any = {"usedParamSet":{"setBio":true,"bio":true,"setAvatar":true,"avatarUrl":true,"publicId":true},"params":[{"name":"setBio","required":true,"transform":{"type":"scalar"},"locs":[{"a":45,"b":52}]},{"name":"bio","required":false,"transform":{"type":"scalar"},"locs":[{"a":68,"b":71}]},{"name":"setAvatar","required":true,"transform":{"type":"scalar"},"locs":[{"a":118,"b":128}]},{"name":"avatarUrl","required":false,"transform":{"type":"scalar"},"locs":[{"a":144,"b":153}]},{"name":"publicId","required":true,"transform":{"type":"scalar"},"locs":[{"a":199,"b":208}]}],"statement":"update public.profiles set\n  bio = case when :setBio!::boolean then :bio::text else bio end,\n  avatar_url = case when :setAvatar!::boolean then :avatarUrl::text else avatar_url end\nwhere public_id = :publicId!\nreturning public_id as id, email, student_id, full_name, avatar_url, bio,\nrole, created_at, updated_at"};

/**
 * Query generated from SQL:
 * ```
 * update public.profiles set
 *   bio = case when :setBio!::boolean then :bio::text else bio end,
 *   avatar_url = case when :setAvatar!::boolean then :avatarUrl::text else avatar_url end
 * where public_id = :publicId!
 * returning public_id as id, email, student_id, full_name, avatar_url, bio,
 * role, created_at, updated_at
 * ```
 */
export const updateMyProfile = new PreparedQuery<IUpdateMyProfileParams,IUpdateMyProfileResult>(updateMyProfileIR);


