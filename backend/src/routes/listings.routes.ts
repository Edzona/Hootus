import { pageSchema } from '../helpers/validation.js';
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { createListing, getListings, listingSchema } from '../controllers/listings.controller.js';

export const listingsRoutes = Router();

listingsRoutes.get('/', validate(pageSchema, 'query'), getListings);
listingsRoutes.post('/', validate(listingSchema), createListing);
