import { Router } from 'express';
import { pageSchema } from '../helpers/validation.js';
import { validate } from '../middleware/validate.js';
import {
  adminIdParams, adminUsersQuery, assignReport, assignReportBody, deleteFeedPost, deleteListing, getListings, getUsers,
  moderateFeedBody, moderateFeedPost, moderateListing,
  moderateListingBody, setUserRole, setUserRoleBody, getClubRequests, reviewClubRequest, reviewClubRequestBody,
  createPartner, createPartnerBody,
  adminClubBody, createAdminClub, deleteAdminClub, getAdminClub, getAdminClubs, transferAdminClubFounder, transferClubFounderBody,
} from '../controllers/admin.controller.js';

// Mounted behind requireRole([UserRole.Admin]) in routes/index.ts.
export const adminRoutes = Router();

adminRoutes.get('/users', validate(adminUsersQuery, 'query'), getUsers);
adminRoutes.patch('/reports/:id/assignee', validate(adminIdParams, 'params'), validate(assignReportBody), assignReport);
adminRoutes.get('/listings', validate(pageSchema, 'query'), getListings);
adminRoutes.patch('/users/:id', validate(adminIdParams, 'params'), validate(setUserRoleBody), setUserRole);
adminRoutes.patch('/listings/:id', validate(adminIdParams, 'params'), validate(moderateListingBody), moderateListing);
adminRoutes.delete('/listings/:id', validate(adminIdParams, 'params'), deleteListing);
adminRoutes.patch('/feed/:id', validate(adminIdParams, 'params'), validate(moderateFeedBody), moderateFeedPost);
adminRoutes.delete('/feed/:id', validate(adminIdParams, 'params'), deleteFeedPost);
adminRoutes.get('/club-requests', validate(pageSchema, 'query'), getClubRequests);
adminRoutes.patch('/club-requests/:id', validate(adminIdParams, 'params'), validate(reviewClubRequestBody), reviewClubRequest);
adminRoutes.post('/partners', validate(createPartnerBody), createPartner);
adminRoutes.get('/clubs', validate(pageSchema, 'query'), getAdminClubs);
adminRoutes.get('/clubs/:id', validate(adminIdParams, 'params'), getAdminClub);
adminRoutes.post('/clubs', validate(adminClubBody), createAdminClub);
adminRoutes.patch('/clubs/:id/founder', validate(adminIdParams, 'params'), validate(transferClubFounderBody), transferAdminClubFounder);
adminRoutes.delete('/clubs/:id', validate(adminIdParams, 'params'), deleteAdminClub);
