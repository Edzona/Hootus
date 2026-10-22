import { useEffect, useState } from 'react'
import { Wordmark } from './Logo'
import { supabase } from '../lib/supabase'
import { apiRequest } from '../lib/api'
import ProfileEditor from './ProfileEditor'
import ProfilePhoto from './ProfilePhoto'

const roles = { student: 'Student', club_leader: 'Club leader', admin: 'Admin' }

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [userId, setUserId] = useState(undefined)

  useEffect(() => {
    if (!supabase) { window.location.hash = '/signup'; return }
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null)
      if (!session) {
        setProfile(null)
        window.location.hash = '/signup'
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    setProfile(null)
    setError('')
    if (!userId) { setLoading(userId === undefined); return }
    const controller = new AbortController()
    setLoading(true)
    apiRequest('/profile/me', { signal: controller.signal })
      .then(next => { if (!controller.signal.aborted) setProfile(next) })
      .catch(err => { if (!controller.signal.aborted) setError(err.message) })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt, userId])

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) setError(error.message)
    else window.location.hash = '/signup'
  }

  const initials = (profile?.full_name || 'TUJ Student').split(/\s+/)
    .filter(part => /^[\p{L}\p{N}]/u.test(part)).slice(0, 2).map(part => part[0]).join('')

  return (
    <div className="grain min-h-screen bg-paper">
      <header className="border-b-2 border-ink">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <a href="#top" aria-label="HUS home"><Wordmark /></a>
          <a href="#/dashboard" className="link-underline font-mono text-xs uppercase tracking-widest">← Back to campus</a>
        </nav>
      </header>
      <main className="mx-auto max-w-6xl px-5 py-12 md:px-8 md:py-20">
        <p className="eyebrow text-cherry">Your corner of campus</p>
        <h1 className="mt-4 font-display text-6xl font-extrabold tracking-tight md:text-8xl">
          My <span className="font-serif font-normal italic text-cherry">profile.</span>
        </h1>
        <p className="mt-5 max-w-xl text-lg text-ink/70">A familiar face in the flock. Your details, all in one place.</p>

        {loading ? <p role="status" className="mt-10 font-mono">Loading your profile…</p>
          : error ? (
            <div role="alert" className="mt-10 border-2 border-ink bg-white p-6 shadow-hard">
              <p>{error}</p>
              <button className="mt-4 mr-6 underline" onClick={() => setAttempt(attempt + 1)}>Try again</button>
              <a href="#/signup" className="underline">Go to sign in</a>
            </div>
          ) : profile && (
            <div className="mt-12 grid gap-8 md:grid-cols-[0.8fr_1.2fr]">
              <section className="border-2 border-ink bg-white shadow-hard">
                <div className="flex items-center justify-between border-b-2 border-ink bg-sun px-6 py-3">
                  <span className="eyebrow">Campus card</span>
                  <span className="font-mono text-xs">TUJ / TOKYO</span>
                </div>
                <div className="p-8">
                  <ProfilePhoto profile={profile} initials={initials} onSaved={setProfile} />
                  <h2 className="mt-6 break-words font-display text-3xl font-extrabold">{profile.full_name || 'TUJ Student'}</h2>
                  <span className="mt-3 inline-block border-2 border-ink bg-sky px-3 py-1 font-mono text-xs uppercase">
                    {roles[profile.role] || profile.role}
                  </span>
                  <p className="mt-6 whitespace-pre-wrap text-ink/70">{profile.bio || 'Your campus story is just getting started.'}</p>
                  <p className="mt-8 border-t-2 border-ink pt-4 font-mono text-xs uppercase tracking-wider">Temple email confirmed ✓</p>
                </div>
              </section>
              <section className="border-2 border-ink bg-white p-6 shadow-hard md:p-8">
                <p className="eyebrow">01 / Account details</p>
                <dl className="mt-6">
                  {[
                    ['Full name', profile.full_name || 'Not added'],
                    ['Temple email', profile.email],
                    ['Student ID', profile.student_id || 'Not added'],
                    ['Member since', new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })],
                  ].map(([label, value]) => (
                    <div key={label} className="border-b border-ink/20 py-5">
                      <dt className="eyebrow text-ink/60">{label}</dt>
                      <dd className="mt-2 break-words text-lg">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mt-5 text-sm text-ink/60">Your email and student ID are private account details.</p>
                <button className="btn-primary mt-8" onClick={signOut}>Sign out →</button>
              </section>
              <ProfileEditor profile={profile} onSaved={setProfile} />
            </div>
          )}
      </main>
    </div>
  )
}
