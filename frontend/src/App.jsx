import { useEffect, useState } from 'react'
import Nav from './components/Nav'
import SignUp from './components/SignUp'
import Hero from './components/Hero'
import Ticker from './components/Ticker'
import Feeds from './components/Feeds'
import Community from './components/Community'
import WhyHus from './components/WhyHus'
import HowItWorks from './components/HowItWorks'
import FinalCta from './components/FinalCta'
import Footer from './components/Footer'
import AccountStatus from './components/AccountStatus'
import Admin from './components/Admin'
import Moderation from './components/Moderation'
import Campus from './components/campus/Campus'
import HubNav from './components/HubNav'
import Marketplace from './components/Marketplace'
import RealEstate from './components/RealEstate'
import { supabase, signInCallbackPending } from './lib/supabase'
import { createDashboardRedirect } from './lib/authRedirect'
import useNotifications from './lib/useNotifications'

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash)
  const notif = useNotifications(hash)

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  useEffect(() => {
    if (!supabase) return
    const redirect = createDashboardRedirect({
      callbackPending: signInCallbackPending,
      getHash: () => window.location.hash,
      navigate: (nextHash) => { window.location.hash = nextHash },
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange(redirect)
    return () => subscription.unsubscribe()
  }, [])

  const toast = notif.toast && (
    <div
      className="fixed bottom-6 right-6 z-50 flex w-[min(420px,calc(100vw-32px))] items-start justify-between gap-4 border-2 border-ink bg-sun px-5 py-4 text-ink shadow-hard"
      role="status"
      aria-live="polite"
    >
      <div className="min-w-0">
        <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-ink/70">New activity</p>
        <p className="mt-1 text-sm font-bold leading-snug text-ink">{notif.toast.text}</p>
        {notif.toast.href && (
          <a
            href={notif.toast.href}
            className="mt-2.5 inline-block border-2 border-ink bg-white px-3 py-1 font-mono text-xs font-bold uppercase tracking-wider text-ink hover:bg-paper"
            onClick={notif.dismissToast}
          >
            View activity →
          </a>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss notification"
        onClick={notif.dismissToast}
        className="shrink-0 font-mono text-xl font-bold leading-none text-ink/70 hover:text-ink"
      >
        ×
      </button>
    </div>
  )

  if (hash.startsWith('#/admin')) return <>{<Admin />}{toast}</>
  if (hash.startsWith('#/moderation')) return <><Moderation />{toast}</>

  if (hash.startsWith('#/marketplace')) return <><HubNav hash={hash} unreadCount={notif.unreadCount} /><Marketplace />{toast}</>
  if (hash.startsWith('#/real-estate')) return <><HubNav hash={hash} unreadCount={notif.unreadCount} /><RealEstate />{toast}</>

  if (/^#\/(dashboard|clubs|events|activity|saved|profile|club-studio)(\/|$)/.test(hash)) {
    return <><HubNav hash={hash} unreadCount={notif.unreadCount} /><Campus hash={hash} notif={notif} />{toast}</>
  }

  if (hash.startsWith('#/signup')) {
    return <><AccountStatus /><SignUp /></>
  }

  return (
    <div className="grain relative min-h-screen overflow-x-clip">
      <AccountStatus />
      <Nav />
      <main>
        <Hero />
        <Ticker />
        <Feeds />
        <Community />
        <WhyHus />
        <HowItWorks />
        <FinalCta />
      </main>
      <Footer />
    </div>
  )
}
