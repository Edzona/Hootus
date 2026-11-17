import { z } from 'zod';
import type { IDatabaseConnection } from '@pgtyped/runtime';
import { env } from '../config/env.js';
import { ownsListingPhotos } from '../generated/listings.queries.js';
import { HttpError } from './errors.js';
import { ErrorCode } from '../types/errorCode.js';

export const pageSchema = z.strictObject({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).max(100000).default(0),
});

// Fields shared by club requests, club edits and partner onboarding.
export const orgHandleSchema = z.string().trim().min(2).max(40)
  .regex(/^[a-zA-Z0-9_]+$/, 'Use letters, numbers, or underscores only.');
export const orgDescriptionSchema = z.string().trim().min(10).max(1000);
export const orgNameSchema = z.string().trim().min(2).max(100);
export const orgTextSchema = z.string().trim().max(120).default('');
export const imageUrlsSchema = z.array(z.url().refine(url => /^https?:\/\//.test(url))).max(10).default([]);

const uploadedPhotoName = /^[0-9a-f-]{36}\.(?:jpg|png|webp)$/;

export const photosNotUploaded = () =>
  new HttpError(400, ErrorCode.InvalidData, 'Upload your photos before posting.');

export function extractPhotoNames(urls: string[]): string[] {
  const bucket = `${env.SUPABASE_URL.replace(/\/$/, '')}/storage/v1/object/public/listing-photos/`;
  const names = urls.map(url => url.startsWith(bucket) ? url.slice(bucket.length) : '');
  if (names.some(name => !uploadedPhotoName.test(name))) throw photosNotUploaded();
  return names;
}

export async function assertOwnsPhotos(names: string[], tx: IDatabaseConnection): Promise<void> {
  if (!names.length) return;
  const [photos] = await ownsListingPhotos.run({ names }, tx);
  if (!photos?.owned) throw photosNotUploaded();
}
