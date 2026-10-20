import { pageSchema } from '../helpers/validation.js';
import { Router } from 'express';
import { requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { createFeedPost, getFeed, feedSchema } from '../controllers/feed.controller.js';
import { UserRole } from '../types/domain.js';

export const feedRoutes = Router();

feedRoutes.get('/', validate(pageSchema, 'query'), getFeed);
feedRoutes.post('/', requireRole([UserRole.ClubLeader, UserRole.Admin]), validate(feedSchema), createFeedPost);
