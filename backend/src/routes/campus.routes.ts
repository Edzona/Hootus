import { Router } from 'express';
import { pageSchema } from '../helpers/validation.js';
import { validate } from '../middleware/validate.js';
import { requireRole } from '../middleware/auth.js';
import { UserRole } from '../types/domain.js';
import {
  getCampus, setCampusAction, publishCampusPost, publishCampusEvent,
  campusActionParams, campusActionBody, campusClubParams, campusPostBody, campusEventBody,
} from '../controllers/campus.controller.js';

export const campusRoutes = Router();

campusRoutes.get('/', validate(pageSchema, 'query'), getCampus);
campusRoutes.put('/actions/:action/:id', validate(campusActionParams, 'params'), validate(campusActionBody), setCampusAction);
campusRoutes.post('/clubs/:clubId/posts', requireRole([UserRole.ClubLeader, UserRole.Admin]),
  validate(campusClubParams, 'params'), validate(campusPostBody), publishCampusPost);
campusRoutes.post('/clubs/:clubId/events', requireRole([UserRole.ClubLeader, UserRole.Admin]),
  validate(campusClubParams, 'params'), validate(campusEventBody), publishCampusEvent);
