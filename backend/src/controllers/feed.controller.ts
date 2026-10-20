import { createFeedPost as insertPost, getFeed as selectPosts } from '../generated/feed.queries.js';
import { withAuthor } from '../helpers/authors.js';
import { pageSchema } from '../helpers/validation.js';
import { ErrorCode } from '../types/errorCode.js';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { assertAuthenticated } from '../helpers/auth.js';
import { HttpError } from '../helpers/errors.js';
import { FeedPostKind, UserRole } from '../types/domain.js';

const common = {
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().max(10000).default(''),
  image_urls: z.array(z.url().refine(url => /^https?:\/\//.test(url))).max(10).default([]),
};

export const feedSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    ...common, kind: z.literal(FeedPostKind.ClubEvent),
    room_number: z.string().trim().min(1).max(100),
    meeting_time: z.iso.datetime({ offset: true }),
  }),
  z.strictObject({
    ...common, kind: z.literal(FeedPostKind.Perk),
    business_name: z.string().trim().min(1).max(200),
    coupon_code: z.string().trim().max(100).optional(),
    expires_at: z.iso.datetime({ offset: true }).optional(),
  }),
]);

// Record requires an entry for every enum member when a new kind is added.
const publishRoles: Record<FeedPostKind, readonly UserRole[]> = {
  [FeedPostKind.ClubEvent]: [UserRole.ClubLeader, UserRole.Admin],
  [FeedPostKind.Perk]: [UserRole.Admin],
};

export const createFeedPost: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const body = res.locals.body as z.infer<typeof feedSchema>;
  if (!publishRoles[body.kind].includes(req.user.role)) {
    throw new HttpError(403, ErrorCode.Forbidden, 'Your role cannot publish this type of feed post.');
  }
  const [data] = await req.db(tx => insertPost.run({
    ...body, authorId: req.user.internalId,
    room_number: body.kind === FeedPostKind.ClubEvent ? body.room_number : null,
    meeting_time: body.kind === FeedPostKind.ClubEvent ? body.meeting_time : null,
    business_name: body.kind === FeedPostKind.Perk ? body.business_name : null,
    coupon_code: body.kind === FeedPostKind.Perk ? body.coupon_code : null,
    expires_at: body.kind === FeedPostKind.Perk ? body.expires_at : null,
  }, tx));
  res.status(201).json({ data: withAuthor(data) });
};
export const getFeed: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { limit, offset } = res.locals.query as z.infer<typeof pageSchema>;
  const data = await req.db(tx => selectPosts.run({ limit, offset }, tx));
  res.json({ data: data.map(withAuthor) });
};
