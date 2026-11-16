import { useEffect, useState } from 'react'
import { Wordmark } from './Logo'
import { supabase } from '../lib/supabase'
import { apiRequest } from '../lib/api'
import ProfileEditor from './ProfileEditor'
import ProfilePhoto from './ProfilePhoto'
import SoldHistory from './SoldHistory'

const roles = { student: 'Student', club_leader: 'Club leader', partner: 'Partner', admin: 'Admin' }

export default function Profile({ embedded = false, onProfileChange }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [attempt, setAttempt] = useState(0)
  const [userId, setUserId] = useState(undefined)
  const [section, setSection] = useState('about')

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

  function handleSaved(next) {
    setProfile(next)
    onProfileChange?.(next)
  }

  const initials = (profile?.full_name || 'TUJ Student').split(/\s+/)
    .filter(part => /^[\p{L}\p{N}]/u.test(part)).slice(0, 2).map(part => part[0]).join('')

  const content = (
    <div className="space-y-5 px-5 py-5">
      {loading ? <p role="status" className="p-4 font-mono text-sm text-ink/60">Loading your profile…</p>
        : error ? (
          <div role="alert" className="rounded-2xl border border-[#ebe7e4] bg-white p-6">
            <p>{error}</p>
            <button className="mt-4 mr-6 underline" onClick={() => setAttempt(attempt + 1)}>Try again</button>
            <a href="#/signup" className="underline">Go to sign in</a>
          </div>
        ) : profile && (
          <>
            <section className="overflow-hidden rounded-2xl border border-[#ebe7e4] bg-white">
              <div className="flex h-24 items-start justify-between bg-gradient-to-r from-[#f8f3f4] via-[#fdf7ea] to-[#f4f7f5] px-5 py-3">
                <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-ink/50">TUJ · TOKYO</span>
                {profile.role === 'admin' && (
                  <a href="#/admin" className="rounded-full border border-[#ebe7e4] bg-white px-3 py-1 font-mono text-xs text-ink hover:border-ink/40">
                    Admin desk →
                  </a>
                )}
              </div>
              <div className="px-6 pb-6 pt-5">
                <div className="flex flex-wrap items-center gap-5">
                  <div className="shrink-0">
                    <ProfilePhoto profile={profile} initials={initials} onSaved={handleSaved} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="break-words font-display text-2xl font-bold tracking-tight text-ink">
                        {profile.full_name || 'TUJ Student'}
                      </h1>
                      <span className="rounded-full bg-[#f5f2ef] px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider text-ink/70">
                        {roles[profile.role] || profile.role}
                      </span>
                    </div>
                    <p className="mt-1 font-mono text-xs text-ink/55">
                      {profile.email} · Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                    </p>
                    <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">
                      {profile.bio || 'No bio yet — add one below.'}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <div className="feed-tabs" role="tablist" aria-label="Profile sections">
              {[['about', 'About & Edit'], ['sold', 'Sold History']].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={section === id}
                  className={section === id ? 'active' : ''}
                  onClick={() => setSection(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {section === 'about' ? (
              <ProfileEditor profile={profile} onSaved={handleSaved} />
            ) : (
              <SoldHistory />
            )}
          </>
        )}
    </div>
  )

  if (embedded) return content

  return (
    <div className="grain min-h-screen bg-paper">
      <header className="border-b-2 border-ink">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 md:px-8">
          <a href="#top" aria-label="HUS home"><Wordmark /></a>
          <a href="#/dashboard" className="link-underline font-mono text-xs uppercase tracking-widest">← Back to campus</a>
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-12 md:px-8">
        {content}
      </main>
    </div>
  )
}
