import { pageSchema } from '../helpers/validation.js';
import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { createFeedPost, getFeed, feedSchema } from '../controllers/feed.controller.js';

export const feedRoutes = Router();

feedRoutes.get('/', validate(pageSchema, 'query'), getFeed);
feedRoutes.post('/', validate(feedSchema), createFeedPost);
