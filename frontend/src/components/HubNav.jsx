import { useEffect, useState } from 'react'
import { Wordmark } from './Logo'
import { supabase } from '../lib/supabase'

const tabs = [
  { id: 'community', label: 'Community', href: '#/dashboard' },
  { id: 'marketplace', label: 'Marketplace', href: '#/marketplace' },
  { id: 'real-estate', label: 'Real estate', href: '#/real-estate' },
]

const accent = {
  community: 'border-cherry',
  marketplace: 'border-matcha',
  'real-estate': 'border-sky',
}

function activeFromHash(hash) {
  if (hash.startsWith('#/marketplace')) return 'marketplace'
  if (hash.startsWith('#/real-estate')) return 'real-estate'
  return 'community'
}

export default function HubNav({ hash, unreadCount = 0 }) {
  const active = activeFromHash(hash)
  const [signedIn, setSignedIn] = useState(false)

  useEffect(() => {
    if (!supabase) return
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setSignedIn(Boolean(data.session))
    }).catch(() => {})
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setSignedIn(Boolean(session))
    })
    return () => { mounted = false; subscription.unsubscribe() }
  }, [])

  async function signOut() {
    await supabase?.auth.signOut()
    window.location.hash = '/signup'
  }

  return (
    <header className="w-full border-b-2 border-ink bg-paper">
      <nav className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8" aria-label="HUS hub">
        <a href="#/dashboard" aria-label="HUS home">
          <Wordmark />
        </a>
        <div className="flex items-center gap-3">
          <ul className="flex items-center gap-1">
            {tabs.map((tab) => {
              const isActive = active === tab.id
              return (
                <li key={tab.id}>
                  <a
                    href={tab.href}
                    className={`block border-b-4 px-4 py-2 font-mono text-xs uppercase tracking-widest ${isActive ? `bg-ink text-paper ${accent[active]}` : 'border-transparent text-ink hover:bg-ink/5'}`}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {tab.label}
                    {tab.id === 'community' && unreadCount > 0 && (
                      <span className="ml-1.5 inline-block rounded-full bg-cherry px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                        {unreadCount}
                      </span>
                    )}
                  </a>
                </li>
              )
            })}
          </ul>
          {signedIn && (
            <button
              type="button"
              onClick={signOut}
              className="border border-ink/25 bg-white px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-ink/75 transition hover:border-ink hover:text-ink"
            >
              Sign out
            </button>
          )}
        </div>
      </nav>
    </header>
  )
}
