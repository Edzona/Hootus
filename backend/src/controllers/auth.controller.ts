import { ErrorCode } from '../types/errorCode.js';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { env } from '../config/env.js';
import { createPublicClient, supabase } from '../config/supabase.js';
import { databaseError, HttpError } from '../helpers/errors.js';
import { UserRole } from '../types/domain.js';

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

async function checkStudentId(studentId: string, email: string) {
  const { data, error } = await supabase.from('profiles')
    .select('email').eq('student_id', studentId).maybeSingle();
  if (error) databaseError(error);
  if (data && data.email.toLowerCase() !== email) {
    throw new HttpError(409, ErrorCode.StudentIdInUse,
      'This student ID is already registered. Sign in with your original Temple email.');
  }
}

async function checkEmail(email: string) {
  const { data, error } = await supabase.from('profiles')
    .select('id').eq('email', email).maybeSingle();
  if (error) databaseError(error);
  if (data) {
    throw new HttpError(409, ErrorCode.EmailInUse,
      'This email is already registered. Sign in instead of creating another account.');
  }
}

function authError(error: { status?: number; code?: string }): never {
  if (error.status === 429 || error.code?.includes('rate_limit')) {
    throw new HttpError(429, ErrorCode.AuthRateLimited, 'Please wait a minute before requesting another sign-in link.');
  }
  throw new HttpError(502, ErrorCode.AuthRequestFailed,
    'We could not send your sign-in link. Please try again, or sign in if you already have an account.');
}

export const signup: RequestHandler = async (_req, res) => {
  const body = res.locals.body as z.infer<typeof signupSchema>;
  checkRedirect(body.redirectTo);
  await checkEmail(body.email);
  await checkStudentId(body.studentId, body.email);
  const { error } = await createPublicClient().auth.signInWithOtp({
    email: body.email,
    options: {
      emailRedirectTo: body.redirectTo,
      data: { full_name: body.name, student_id: body.studentId },
    },
  });
  if (error) {
    // The unique DB constraint remains authoritative if two signups race.
    await checkStudentId(body.studentId, body.email);
    await checkEmail(body.email);
    authError(error);
  }
  // Auth may reuse a user if another request registered the email concurrently.
  const { data: profile, error: profileError } = await supabase.from('profiles')
    .select('student_id').eq('email', body.email).maybeSingle();
  if (profileError) databaseError(profileError);
  if (profile && profile.student_id !== body.studentId) {
    throw new HttpError(409, ErrorCode.EmailInUse, 'This email is already registered. Sign in instead.');
  }
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

export const testSignin: RequestHandler = async (req, res) => {
  if (env.NODE_ENV !== 'development' || process.env.VERCEL
    || env.ENABLE_TEST_SIGNIN !== 'true'
    || !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(env.SUPABASE_URL).hostname)
    || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress ?? '')) {
    throw new HttpError(404, ErrorCode.NotFound, 'Endpoint not found.');
  }
  // Fixed seed identity, not an email supplied by the caller. No stored password.
  const { data: seeded, error: userError } = await supabase.auth.admin.getUserById(
    '00000000-0000-4000-8000-000000000001',
  );
  if (userError || !seeded.user || seeded.user.email !== 'hootus-demo@temple.edu'
    || seeded.user.app_metadata.hootus_local_test !== true) {
    throw new HttpError(503, ErrorCode.TestAccountMissing, 'Apply supabase/seed.sql to your local database first.');
  }
  const { data: profile, error: profileError } = await supabase.from('profiles')
    .select('role').eq('auth_user_id', seeded.user.id).single();
  if (profileError) databaseError(profileError);
  if (profile?.role !== UserRole.Student) {
    throw new HttpError(403, ErrorCode.TestAccountRequired, 'Use a dedicated local test student account.');
  }
  const link = await supabase.auth.admin.generateLink({ type: 'magiclink', email: seeded.user.email });
  if (link.error || !link.data.properties) {
    throw new HttpError(503, ErrorCode.TestSigninFailed, 'The local test account is unavailable.');
  }
  const { data, error } = await createPublicClient().auth.verifyOtp({
    token_hash: link.data.properties.hashed_token, type: 'email',
  });
  if (error || !data.session) throw new HttpError(503, ErrorCode.TestSigninFailed, 'The local test account is unavailable.');
  res.json({ data: { access_token: data.session.access_token, refresh_token: data.session.refresh_token } });
};
