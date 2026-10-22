import { getMyProfile as selectMyProfile, updateMyProfile as saveMyProfile } from '../generated/profiles.queries.js';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { assertAuthenticated } from '../helpers/auth.js';
import { HttpError } from '../helpers/errors.js';
import { ErrorCode } from '../types/errorCode.js';

// Students edit their bio and photo only; name, email, student ID and role stay fixed.
// Omitted fields are left unchanged; null clears a field.
export const profileUpdateSchema = z.strictObject({
  bio: z.string().trim().max(500).transform(bio => bio || null).nullable().optional(),
  avatar_url: z.url().max(500).nullable().optional(),
}).refine(body => body.bio !== undefined || body.avatar_url !== undefined, 'Send bio or avatar_url.');
const avatarFileName = /^[0-9a-f-]{36}\.(?:jpg|png|webp)$/;

export const getMyProfile: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const [data] = await req.db(tx => selectMyProfile.run({ publicId: req.user.id }, tx));
  if (!data) throw new HttpError(403, ErrorCode.ProfileRequired, 'An active student profile is required.');
  res.json({ data });
};

export const updateMyProfile: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { bio, avatar_url: avatarUrl } = res.locals.body as z.infer<typeof profileUpdateSchema>;
  // Photos must be files the caller uploaded to their own folder in the avatars bucket.
  if (avatarUrl) {
    const folder = `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/avatars/${req.user.authUserId}/`;
    if (!avatarUrl.startsWith(folder) || !avatarFileName.test(avatarUrl.slice(folder.length))) {
      throw new HttpError(400, ErrorCode.InvalidData, 'Upload your profile photo before saving it.');
    }
  }
  const [data] = await req.db(tx => saveMyProfile.run({
    publicId: req.user.id, setBio: bio !== undefined, bio, setAvatar: avatarUrl !== undefined, avatarUrl,
  }, tx));
  if (!data) throw new HttpError(403, ErrorCode.ProfileRequired, 'An active student profile is required.');
  res.json({ data });
};
