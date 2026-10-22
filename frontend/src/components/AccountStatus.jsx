import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { apiRequest } from '../lib/api'

export default function AccountStatus() {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setProfile(null)
    setError('')
    if (!session) return
    const controller = new AbortController()
    apiRequest('/profile/me', { signal: controller.signal })
      .then(setProfile)
      .catch(err => { if (!controller.signal.aborted) setError(err.message) })
    return () => controller.abort()
  }, [session])

  if (!session) return null
  return (
    <aside className="border-b-2 border-ink bg-sun px-5 py-3 font-mono text-sm" aria-live="polite">
      {error || (profile ? `Signed in as ${profile.full_name || profile.email}` : 'Loading your profile…')}
      <a href="#/profile" className="ml-4 underline">My profile</a>
      <button className="ml-4 underline" onClick={async () => {
        const { error: signOutError } = await supabase.auth.signOut()
        if (signOutError) setError(signOutError.message)
      }}>Sign out</button>
    </aside>
  )
}
