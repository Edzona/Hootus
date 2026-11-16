import { Router } from 'express';
import { runDigest, unsubscribeDigest, unsubscribeQuerySchema } from '../controllers/digest.controller.js';
import { validate } from '../middleware/validate.js';

export const digestRoutes = Router();

digestRoutes.get('/send', runDigest);
digestRoutes.post('/send', runDigest);
digestRoutes.get('/unsubscribe', validate(unsubscribeQuerySchema, 'query'), unsubscribeDigest);
