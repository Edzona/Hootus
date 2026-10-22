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
import Profile from './components/Profile'
import Campus from './components/campus/Campus'
import { supabase, signInCallbackPending } from './lib/supabase'
import { createDashboardRedirect } from './lib/authRedirect'

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash)

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

  if (hash.startsWith('#/profile')) return <Profile />

  if (/^#\/(dashboard|clubs|events|activity|friends|saved)(\/|$)/.test(hash)) return <Campus hash={hash} />

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
