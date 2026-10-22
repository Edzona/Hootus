import { Router } from 'express';

export const healthRoutes = Router();

// Liveness only; does not claim the database is reachable.
healthRoutes.get('/health', (_req, res) => res.json({ status: 'ok' }));
