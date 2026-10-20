import { getMyProfile as selectMyProfile } from '../generated/profiles.queries.js';
import type { RequestHandler } from 'express';
import { assertAuthenticated } from '../helpers/auth.js';
import { HttpError } from '../helpers/errors.js';
import { ErrorCode } from '../types/errorCode.js';

export const getMyProfile: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const [data] = await req.db(tx => selectMyProfile.run({ publicId: req.user.id }, tx));
  if (!data) throw new HttpError(403, ErrorCode.ProfileRequired, 'An active student profile is required.');
  res.json({ data });
};
