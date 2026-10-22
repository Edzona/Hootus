import { createClient } from '@supabase/supabase-js'
import { hasSignInCallback } from './authRedirect'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

// Capture this before Auth consumes and clears the email-link callback URL.
export const signInCallbackPending = hasSignInCallback(window.location.href)

// Keep the landing page usable before the developer configures authentication.
export const supabase = url && key ? createClient(url, key) : null

export function getSupabase() {
  if (!supabase) throw new Error('Sign-in is not configured yet. Please try again later.')
  return supabase
}
