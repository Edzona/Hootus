import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

// Reserved for token verification and trusted administrative operations.
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth });

// Auth-only clients: browser roles have no application-table privileges.
export function createPublicClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth,
  });
}
