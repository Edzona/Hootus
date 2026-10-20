import { createClient } from '@supabase/supabase-js';
import { env } from './env.js';

const auth = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

// Auth-only clients: browser roles have no application-table privileges.
export function createPublicClient() {
  return createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
    auth,
  });
}

// Shared client for verifying user tokens; needs no elevated privileges.
export const supabase = createPublicClient();
