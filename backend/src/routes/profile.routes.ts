import { Router } from 'express';
import { getMyProfile } from '../controllers/profile.controller.js';

export const profileRoutes = Router();

profileRoutes.get('/me', getMyProfile);
