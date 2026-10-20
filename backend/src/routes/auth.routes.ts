import { Router } from 'express';
import { signin, signinSchema, signup, signupSchema, testSignin } from '../controllers/auth.controller.js';
import { validate } from '../middleware/validate.js';

export const authRoutes = Router();

authRoutes.post('/signup', validate(signupSchema), signup);
authRoutes.post('/signin', validate(signinSchema), signin);
authRoutes.post('/test-signin', testSignin);
