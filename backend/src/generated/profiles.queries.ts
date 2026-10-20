/** Types generated for queries found in "../supabase/queries/profiles.sql" */
import { PreparedQuery } from '@pgtyped/runtime';

/** 'GetAuthProfile' parameters type */
export interface IGetAuthProfileParams {
  authUserId: string;
}

/** 'GetAuthProfile' return type */
export interface IGetAuthProfileResult {
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

const getAuthProfileIR: any = {"usedParamSet":{"authUserId":true},"params":[{"name":"authUserId","required":true,"transform":{"type":"scalar"},"locs":[{"a":104,"b":115}]}],"statement":"select id::text as \"internal_id!\", public_id, role, full_name\nfrom public.profiles where auth_user_id = :authUserId!"};

/**
 * Query generated from SQL:
 * ```
 * select id::text as "internal_id!", public_id, role, full_name
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


