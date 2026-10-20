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

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    if (error && error.status && error.status >= 500) {
      throw new HttpError(503, ErrorCode.AuthUnavailable, 'Authentication is temporarily unavailable.');
    }
    throw new HttpError(401, ErrorCode.Unauthorized, 'Your session is invalid or expired.');
  }
  if (!user.email || !/^[a-z0-9._%+-]+@temple\.edu$/i.test(user.email) || !user.email_confirmed_at) {
    throw new HttpError(403, ErrorCode.TempleEmailRequired, 'A confirmed @temple.edu email is required.');
  }
  const db: UserDatabase = work => withUser(user.id, work);
  const [profile] = await db(tx => getAuthProfile.run({ authUserId: user.id }, tx));
  const role = userRoleSchema.safeParse(profile?.role);
  if (!profile || !role.success) {
    throw new HttpError(403, ErrorCode.ProfileRequired, 'An active student profile is required.');
  }
  req.user = {
    id: profile.public_id, internalId: profile.internal_id, email: user.email, role: role.data,
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
