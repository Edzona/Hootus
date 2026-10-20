import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { listingsRoutes } from './listings.routes.js';
import { feedRoutes } from './feed.routes.js';
import { profileRoutes } from './profile.routes.js';
import { authRoutes } from './auth.routes.js';
import { requireAuth } from '../middleware/auth.js';

export const routes = Router();
const protectedRoutes = Router();

// Public route register.
routes.use(healthRoutes);
routes.use('/auth', authRoutes);

// Shared auth shell: register student-facing modules here.
protectedRoutes.use(requireAuth);
protectedRoutes.use('/listings', listingsRoutes);
protectedRoutes.use('/feed', feedRoutes);
protectedRoutes.use('/profile', profileRoutes);
routes.use(protectedRoutes);
