import { getAuthProfile } from '../generated/profiles.queries.js';
import { assertAuthenticated } from '../helpers/auth.js';
import { ErrorCode } from '../types/errorCode.js';
import type { RequestHandler } from 'express';
import { supabase } from '../config/supabase.js';
import { withUser, type UserDatabase } from '../config/database.js';
import { userRoleSchema, type UserRole } from '../types/domain.js';
import { HttpError } from '../helpers/errors.js';

export const requireAuth: RequestHandler = async (req, _res, next) => {
  const token = /^Bearer\s+(\S+)$/i.exec(req.headers.authorization ?? '')?.[1];
  if (!token) throw new HttpError(401, ErrorCode.Unauthorized, 'A Bearer token is required.');

  // Signature and expiry are checked locally against Auth's cached public keys, so
  // this normally makes no Auth network call. Revoked sessions stay valid until the
  // access token expires; the database below checks the current account state.
  const { data, error } = await supabase.auth.getClaims(token);
  if (!data) {
    if (error && ((error.status ?? 0) >= 500 || error.name === 'AuthRetryableFetchError')) {
      throw new HttpError(503, ErrorCode.AuthUnavailable, 'Authentication is temporarily unavailable.');
    }
    throw new HttpError(401, ErrorCode.Unauthorized, 'Your session is invalid or expired.');
  }
  const { sub, role: claimRole } = data.claims;
  if (!sub || claimRole !== 'authenticated') {
    throw new HttpError(401, ErrorCode.Unauthorized, 'Your session is invalid or expired.');
  }
  const db: UserDatabase = work => withUser(sub, work);
  const [profile] = await db(tx => getAuthProfile.run({ authUserId: sub }, tx));
  const role = userRoleSchema.safeParse(profile?.role);
  if (!profile || !role.success) {
    throw new HttpError(403, ErrorCode.ProfileRequired, 'An active student profile is required.');
  }
  req.user = {
    id: profile.public_id, internalId: profile.internal_id, email: profile.email, role: role.data,
    ...(profile.full_name ? { name: profile.full_name } : {}),
  };
  req.db = db;
  next();
};

export function requireRole(roles: UserRole[]): RequestHandler {
  return (req, _res, next) => {
    assertAuthenticated(req);
    if (!roles.includes(req.user.role)) throw new HttpError(403, ErrorCode.Forbidden, 'Your role cannot perform this action.');
    next();
  };
}
