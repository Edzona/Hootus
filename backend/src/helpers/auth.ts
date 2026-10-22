import type { Request } from 'express';
import type { AuthUser } from '../types/express.js';
import { ErrorCode } from '../types/errorCode.js';
import { HttpError } from './errors.js';

// Express cannot infer middleware ordering; this narrows optional fields safely.
export function assertAuthenticated(req: Request): asserts req is Request & {
  user: AuthUser;
  db: NonNullable<Request['db']>;
} {
  if (!req.user || !req.db) throw new HttpError(401, ErrorCode.Unauthorized, 'Authentication is required.');
}

