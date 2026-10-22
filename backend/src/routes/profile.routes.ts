import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { getMyProfile, profileUpdateSchema, updateMyProfile } from '../controllers/profile.controller.js';

export const profileRoutes = Router();

profileRoutes.get('/me', getMyProfile);
profileRoutes.patch('/me', validate(profileUpdateSchema), updateMyProfile);
