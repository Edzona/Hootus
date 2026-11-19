import { pageSchema } from '../helpers/validation.js';
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import {
  createListing, getListings, listingsQuery, updateListing, listingSchema, setListingStatus, listingStatusParams, listingStatusBody, getMySoldListings, getListingContact,
} from '../controllers/listings.controller.js';

export const listingsRoutes = Router();

listingsRoutes.get('/', validate(listingsQuery, 'query'), getListings);
listingsRoutes.post('/', validate(listingSchema), createListing);
listingsRoutes.get('/mine/sold', validate(pageSchema, 'query'), getMySoldListings);
listingsRoutes.get('/:id/contact', validate(listingStatusParams, 'params'), getListingContact);
listingsRoutes.patch('/:id', validate(listingStatusParams, 'params'), validate(listingSchema), updateListing);
listingsRoutes.patch('/:id/status', validate(listingStatusParams, 'params'), validate(listingStatusBody), setListingStatus);
