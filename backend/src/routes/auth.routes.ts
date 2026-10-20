import { Router } from 'express';
import { signin, signinSchema, signup, signupSchema } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';

export const authRoutes = Router();

authRoutes.post('/signup', validate(signupSchema), signup);
authRoutes.post('/signin', validate(signinSchema), signin);
