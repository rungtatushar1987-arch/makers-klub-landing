import { useEffect, useState } from 'react'
import './Hero.css'

const TYPED_WORDS = ['Freelancers', 'Solopreneurs']
const TYPE_SPEED = 90
const DELETE_SPEED = 50
const PAUSE_AFTER_TYPE = 1400
const PAUSE_AFTER_DELETE = 300

function useTypewriter(words) {
  const [text, setText] = useState('')
  const [wordIndex, setWordIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentWord = words[wordIndex]

    if (!isDeleting && text === currentWord) {
      const timeout = setTimeout(() => setIsDeleting(true), PAUSE_AFTER_TYPE)
      return () => clearTimeout(timeout)
    }

    if (isDeleting && text === '') {
      const timeout = setTimeout(() => {
        setIsDeleting(false)
        setWordIndex((wordIndex + 1) % words.length)
      }, PAUSE_AFTER_DELETE)
      return () => clearTimeout(timeout)
    }

    const timeout = setTimeout(() => {
      setText(currentWord.slice(0, text.length + (isDeleting ? -1 : 1)))
    }, isDeleting ? DELETE_SPEED : TYPE_SPEED)
    return () => clearTimeout(timeout)
  }, [text, isDeleting, wordIndex, words])

  return text
}

export default function Hero() {
  const typed = useTypewriter(TYPED_WORDS)

  return (
    <section className="sc-hero on-navy">
      <div className="sc-hero-bg" />
      <div className="sc-hero-content">
        <div className="sc-hero-badge">
          <span className="sc-hero-badge-dot"></span>
          For the Bold &amp; Independent
        </div>
        <h1>
          The Solopreneurs
          <br />
          Club
        </h1>
        <p className="sc-hero-sub-label">A community built for</p>
        <div className="sc-hero-typed">{typed}</div>
        <p className="sc-hero-desc">
          Real collaborators. No corporate networking theater. Just people who run their own show,
          building and growing together — one session at a time.
        </p>
        <div className="sc-hero-actions">
          <a href="#join" className="btn-solid">Become a Member →</a>
          <a href="#events" className="btn-ghost">See Upcoming Sessions</a>
        </div>
        <div className="sc-hero-scroll">
          Scroll
          <div className="sc-hero-scroll-arrow">↓</div>
        </div>
      </div>
    </section>
  )
}
