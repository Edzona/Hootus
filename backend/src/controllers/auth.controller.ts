import { ErrorCode } from '../types/errorCode.js';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { createPublicClient } from '../config/supabase.js';
import { HttpError } from '../helpers/errors.js';

const email = z.email().trim().toLowerCase().regex(/^[a-z0-9._%+-]+@temple\.edu$/);
export const signinSchema = z.strictObject({ email, redirectTo: z.url() });
export const signupSchema = signinSchema.extend({
  name: z.string().trim().min(1).max(150),
  studentId: z.string().regex(/^\d{9}$/),
});

function checkRedirect(redirectTo: string) {
  if (!env.CORS_ORIGINS.includes(redirectTo)) {
    throw new HttpError(400, ErrorCode.InvalidRedirect, 'The sign-in return address is not allowed.');
  }
}

function authError(error: { status?: number; code?: string }): never {
  if (error.status === 429 || error.code?.includes('rate_limit')) {
    throw new HttpError(429, ErrorCode.AuthRateLimited, 'Please wait a minute before requesting another sign-in link.');
  }
  throw new HttpError(502, ErrorCode.AuthRequestFailed,
    'We could not send your sign-in link. Please check your details and try again, or sign in if you already have an account.');
}

export const signup: RequestHandler = async (_req, res) => {
  const body = res.locals.body as z.infer<typeof signupSchema>;
  checkRedirect(body.redirectTo);
  const { error } = await createPublicClient().auth.signInWithOtp({
    email: body.email,
    options: {
      emailRedirectTo: body.redirectTo,
      data: { full_name: body.name, student_id: body.studentId },
    },
  });
  // Never reveal whether an email or student ID is already registered. Existing
  // emails receive a normal sign-in link; unique constraints reject other duplicates.
  if (error) authError(error);
  res.status(202).json({ data: { message: 'Check your Temple email for a sign-in link.' } });
};

export const signin: RequestHandler = async (_req, res) => {
  const body = res.locals.body as z.infer<typeof signinSchema>;
  checkRedirect(body.redirectTo);
  const { error } = await createPublicClient().auth.signInWithOtp({
    email: body.email,
    options: { shouldCreateUser: false, emailRedirectTo: body.redirectTo },
  });
  // Keep account existence private on the sign-in endpoint.
  if (error && error.code !== 'otp_disabled' && error.code !== 'user_not_found') authError(error);
  res.status(202).json({ data: { message: 'If you have an account, check your Temple email for a sign-in link.' } });
};
