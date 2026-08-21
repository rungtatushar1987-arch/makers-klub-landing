import { useEffect } from 'react'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Marquee from './components/Marquee'
import WhySection from './components/WhySection'
import EventsEmbed from './components/EventsEmbed'
import Network from './components/Network'
import Membership from './components/Membership'
import Footer from './components/Footer'

export default function App() {
  useEffect(() => {
    function scrollToHash() {
      const hash = window.location.hash.slice(1)
      if (!hash) return
      const el = document.getElementById(hash)
      if (el) el.scrollIntoView()
    }

    const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve()
    fontsReady.then(() => requestAnimationFrame(scrollToHash))
  }, [])

  return (
    <>
      <Nav />
      <Hero />
      <Marquee />
      <WhySection />
      <EventsEmbed />
      <Network />
      <Membership />
      <Footer />
    </>
  )
}
