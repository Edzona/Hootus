import { createListing as insertPost, getListings as selectPosts } from '../generated/listings.queries.js';
import { withAuthor } from '../helpers/authors.js';
import { pageSchema } from '../helpers/validation.js';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { assertAuthenticated } from '../helpers/auth.js';
import { listingCategorySchema } from '../types/domain.js';


export const listingSchema = z.strictObject({
  category: listingCategorySchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10000).default(''),
  price_jpy: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER).nullable().optional(),
  image_urls: z.array(z.url().refine(url => /^https?:\/\//.test(url))).max(10).default([]),
  location: z.string().trim().max(300).optional(),
});
export const createListing: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const body = res.locals.body as z.infer<typeof listingSchema>;
  const [data] = await req.db(tx => insertPost.run({ ...body, authorId: req.user.internalId }, tx));
  res.status(201).json({ data: withAuthor(data) });
};

export const getListings: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { limit, offset } = res.locals.query as z.infer<typeof pageSchema>;
  const data = await req.db(tx => selectPosts.run({ limit, offset }, tx));
  res.json({ data: data.map(withAuthor) });
};
