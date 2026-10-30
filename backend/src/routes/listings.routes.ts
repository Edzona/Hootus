import { pageSchema } from "../helpers/validation.js";
import { Router } from "express";
import { validate } from "../middleware/validate.js";
import {
  createListing,
  getListings,
  listingSchema,
  setListingStatus,
  listingStatusParams,
  listingStatusBody,
} from "../controllers/listings.controller.js";
export const listingsRoutes = Router();
listingsRoutes.patch(
  "/:id/status",
  validate(listingStatusParams, "params"),
  validate(listingStatusBody),
  setListingStatus,
);

listingsRoutes.get("/", validate(pageSchema, "query"), getListings);
listingsRoutes.post("/", validate(listingSchema), createListing);
