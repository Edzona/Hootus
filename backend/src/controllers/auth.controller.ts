import { ErrorCode } from '../types/errorCode.js';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { createPublicClient } from '../config/supabase.js';
import { HttpError } from '../helpers/errors.js';

const email = z.string().trim().toLowerCase().pipe(z.email().regex(/^[a-z0-9._%+-]+@temple\.edu$/));
export const signinSchema = z.strictObject({ email });
export const signupSchema = signinSchema.extend({
  name: z.string().trim().min(1).max(150),
  studentId: z.string().regex(/^\d{9}$/),
});

function authError(error: { status?: number; code?: string }): never {
  if (error.status === 429 || error.code?.includes('rate_limit')) {
    throw new HttpError(429, ErrorCode.AuthRateLimited, 'Please wait a minute before requesting another sign-in code.');
  }
  throw new HttpError(502, ErrorCode.AuthRequestFailed,
    'We could not send your sign-in code. Please check your details and try again, or sign in if you already have an account.');
}

export const signup: RequestHandler = async (_req, res) => {
  const body = res.locals.body as z.infer<typeof signupSchema>;
  const { error } = await createPublicClient().auth.signInWithOtp({
    email: body.email,
    options: {
      data: { full_name: body.name, student_id: body.studentId },
    },
  });
  // Existing emails receive a normal sign-in code. Unique constraints reject
  // duplicate student IDs; never include account details in the error response.
  if (error) authError(error);
  res.status(202).json({ data: { message: 'Check your Temple email for a sign-in code.' } });
};

export const signin: RequestHandler = async (_req, res) => {
  const body = res.locals.body as z.infer<typeof signinSchema>;
  const { error } = await createPublicClient().auth.signInWithOtp({
    email: body.email,
    options: { shouldCreateUser: false },
  });
  // Keep account existence private on the sign-in endpoint.
  if (error && error.code !== 'otp_disabled' && error.code !== 'user_not_found') authError(error);
  res.status(202).json({ data: { message: 'If you have an account, check your Temple email for a sign-in code.' } });
};
