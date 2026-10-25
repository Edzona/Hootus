import {
  createListing as insertPost,
  getListings as selectPosts,
  setListingStatus as updateStatus,
} from "../generated/listings.queries.js";
import { withAuthor } from "../helpers/authors.js";
import { pageSchema } from "../helpers/validation.js";
import type { RequestHandler } from "express";
import { z } from "zod";
import { assertAuthenticated } from "../helpers/auth.js";
import { listingCategorySchema, ListingStatus } from "../types/domain.js";
import { HttpError } from "../helpers/errors.js";
import { ErrorCode } from "../types/errorCode.js";

export const listingSchema = z.strictObject({
  category: listingCategorySchema,
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(10000).default(""),
  price_jpy: z
    .number()
    .int()
    .nonnegative()
    .max(Number.MAX_SAFE_INTEGER)
    .nullable()
    .optional(),
  image_urls: z
    .array(z.url().refine((url) => /^https?:\/\//.test(url)))
    .max(10)
    .default([]),
  location: z.string().trim().max(300).optional(),
});
export const createListing: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const body = res.locals.body as z.infer<typeof listingSchema>;
  const [data] = await req.db((tx) =>
    insertPost.run({ ...body, authorId: req.user.internalId }, tx),
  );
  res.status(201).json({ data: withAuthor(data) });
};

export const getListings: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { limit, offset } = res.locals.query as z.infer<typeof pageSchema>;
  const data = await req.db((tx) => selectPosts.run({ limit, offset }, tx));
  res.json({ data: data.map(withAuthor) });
};

export const listingStatusParams = z.strictObject({ id: z.uuid() });
// Sellers end a listing as a success ('sold') or without one ('closed').
export const listingStatusBody = z.strictObject({
  status: z.enum([ListingStatus.Sold, ListingStatus.Closed]),
});

export const setListingStatus: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { id } = res.locals.params as z.infer<typeof listingStatusParams>;
  const { status } = res.locals.body as z.infer<typeof listingStatusBody>;
  const [listing] = await req.db((tx) => updateStatus.run({ id, status }, tx));
  if (!listing)
    throw new HttpError(
      404,
      ErrorCode.NotFound,
      "That listing is not open, or it is not yours.",
    );
  res.json({ data: listing });
};
