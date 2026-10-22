import { getSupabase } from './supabase'

const baseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function apiRequest(path, { method = 'GET', body, signal, authenticated = true } = {}) {
  let session
  if (authenticated) {
    const result = await getSupabase().auth.getSession()
    if (result.error) throw result.error
    session = result.data.session
    if (!session) throw new Error('Please sign in first.')
  }
  let response
  try {
    response = await fetch(`${baseUrl}/api${path}`, {
    method,
    signal,
    headers: {
      ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new Error('Cannot reach Hootus. Please check your connection and try again.')
  }
  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const error = new Error(payload?.error?.message || 'Hootus is temporarily unavailable. Please try again.')
    error.code = payload?.error?.code
    error.status = response.status
    throw error
  }
  if (!payload) throw new Error('Hootus returned an unexpected response. Please try again.')
  return payload.data
}
