import Nav from './components/Nav'
import Hero from './components/Hero'
import Ticker from './components/Ticker'
import Feeds from './components/Feeds'
import Community from './components/Community'
import WhyHus from './components/WhyHus'
import HowItWorks from './components/HowItWorks'
import FinalCta from './components/FinalCta'
import Footer from './components/Footer'

export default function App() {
  return (
    <div className="grain relative min-h-screen overflow-x-clip">
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
