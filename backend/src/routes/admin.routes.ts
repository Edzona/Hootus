import { Router } from 'express';
import { pageSchema } from '../helpers/validation.js';
import { validate } from '../middleware/validate.js';
import {
  adminIdParams, deleteFeedPost, deleteListing, getUsers, moderateFeedBody, moderateFeedPost, moderateListing,
  moderateListingBody, setUserRole, setUserRoleBody,
} from '../controllers/admin.controller.js';

// Mounted behind requireRole([UserRole.Admin]) in routes/index.ts.
export const adminRoutes = Router();

adminRoutes.get('/users', validate(pageSchema, 'query'), getUsers);
adminRoutes.patch('/users/:id', validate(adminIdParams, 'params'), validate(setUserRoleBody), setUserRole);
adminRoutes.patch('/listings/:id', validate(adminIdParams, 'params'), validate(moderateListingBody), moderateListing);
adminRoutes.delete('/listings/:id', validate(adminIdParams, 'params'), deleteListing);
adminRoutes.patch('/feed/:id', validate(adminIdParams, 'params'), validate(moderateFeedBody), moderateFeedPost);
adminRoutes.delete('/feed/:id', validate(adminIdParams, 'params'), deleteFeedPost);
