import { useEffect } from 'react'
import Nav from './components/Nav'
import Hero from './components/Hero'
import Marquee from './components/Marquee'
import FitCheck from './components/FitCheck'
import EventsEmbed from './components/EventsEmbed'
import Membership from './components/Membership'
import Footer from './components/Footer'
import Stats from './components/Stats'
import About from './components/About'
import Newsletter from './components/Newsletter'
import Testimonials from './components/Testimonials'
import Partners from './components/Partners'
import Faq from './components/Faq'
import FinalCta from './components/FinalCta'
import Contact from './components/Contact'

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

    // Fade-up on scroll: reveal each block once its top enters the lower part of the viewport.
    // Classes are added here (not in markup) so no-JS visitors see everything.
    let pending = Array.from(
      document.querySelectorAll('section > div[class$="-inner"], .sc-hero-content')
    ).filter((el) => el.getBoundingClientRect().top >= window.innerHeight)
    pending.forEach((el) => el.classList.add('fade-up'))

    const reveal = () => {
      const line = window.innerHeight * 0.92
      pending = pending.filter((el) => {
        if (el.getBoundingClientRect().top > line) return true
        el.classList.add('in')
        return false
      })
      if (!pending.length) window.removeEventListener('scroll', reveal)
    }
    reveal()
    window.addEventListener('scroll', reveal, { passive: true })
    window.addEventListener('resize', reveal)
    return () => {
      window.removeEventListener('scroll', reveal)
      window.removeEventListener('resize', reveal)
    }
  }, [])

  return (
    <>
      <Nav />
      <Hero />
      <Stats />
      <About />
      <Marquee />
      <EventsEmbed />
      <Membership />
      <FitCheck />
      <Newsletter />
      <Testimonials />
      <Partners />
      <Faq />
      <FinalCta />
      <Contact />
      <Footer />
    </>
  )
}
