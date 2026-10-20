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

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash)

  useEffect(() => {
    const onHashChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  if (hash.startsWith('#/profile')) return <Profile />

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
