import type { RequestHandler } from 'express';
import { z } from 'zod';
import * as q from '../generated/admin.queries.js';
import { assertAuthenticated } from '../helpers/auth.js';
import { withAuthor } from '../helpers/authors.js';
import { HttpError } from '../helpers/errors.js';
import { pageSchema } from '../helpers/validation.js';
import { ListingStatus, UserRole } from '../types/domain.js';
import { ErrorCode } from '../types/errorCode.js';

const hasChange = (body: object) => Object.keys(body).length > 0;

export const adminIdParams = z.strictObject({ id: z.uuid() });
export const setUserRoleBody = z.strictObject({ role: z.enum(UserRole) });
export const moderateListingBody = z.strictObject({
  status: z.enum(ListingStatus).optional(),
  title: z.string().trim().min(1).max(200).optional(),
  description: z.string().trim().max(10000).optional(),
}).refine(hasChange, 'Send at least one field to change.');
export const moderateFeedBody = z.strictObject({
  title: z.string().trim().min(1).max(200).optional(),
  body: z.string().trim().max(10000).optional(),
}).refine(hasChange, 'Send at least one field to change.');

const listingNotFound = () => new HttpError(404, ErrorCode.NotFound, 'That listing no longer exists.');
const postNotFound = () => new HttpError(404, ErrorCode.NotFound, 'That feed post no longer exists.');

export const getUsers: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { limit, offset } = res.locals.query as z.infer<typeof pageSchema>;
  const data = await req.db(tx => q.getUsers.run({ limit, offset }, tx));
  res.json({ data });
};

export const setUserRole: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { id } = res.locals.params as z.infer<typeof adminIdParams>;
  const { role } = res.locals.body as z.infer<typeof setUserRoleBody>;
  if (id === req.user.id) throw new HttpError(409, ErrorCode.Conflict, 'Admins cannot change their own role.');
  const [user] = await req.db(tx => q.setUserRole.run({ id, role }, tx));
  if (!user) throw new HttpError(404, ErrorCode.NotFound, 'That member no longer exists.');
  res.json({ data: user });
};

export const moderateListing: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { id } = res.locals.params as z.infer<typeof adminIdParams>;
  const body = res.locals.body as z.infer<typeof moderateListingBody>;
  const [listing] = await req.db(tx => q.moderateListing.run({ id, ...body }, tx));
  if (!listing) throw listingNotFound();
  res.json({ data: withAuthor(listing) });
};

export const deleteListing: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { id } = res.locals.params as z.infer<typeof adminIdParams>;
  const [deleted] = await req.db(tx => q.deleteListing.run({ id }, tx));
  if (!deleted) throw listingNotFound();
  res.json({ data: deleted });
};

export const moderateFeedPost: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { id } = res.locals.params as z.infer<typeof adminIdParams>;
  const body = res.locals.body as z.infer<typeof moderateFeedBody>;
  const [post] = await req.db(tx => q.moderateFeedPost.run({ id, ...body }, tx));
  if (!post) throw postNotFound();
  res.json({ data: withAuthor(post) });
};

export const deleteFeedPost: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { id } = res.locals.params as z.infer<typeof adminIdParams>;
  const [deleted] = await req.db(tx => q.deleteFeedPost.run({ id }, tx));
  if (!deleted) throw postNotFound();
  res.json({ data: deleted });
};
