import { useEffect, useState } from 'react'
import './Nav.css'
import { CTA_URL, CTA_LABEL, NAV_LINKS } from '../content'

export default function Nav() {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState('')

  // Scroll-spy: the active link is the last section whose top has passed the upper third of the viewport.
  useEffect(() => {
    const onScroll = () => {
      const line = window.innerHeight * 0.33
      let current = ''
      NAV_LINKS.forEach((l) => {
        const el = document.getElementById(l.id)
        if (el && el.getBoundingClientRect().top <= line) current = l.id
      })
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <nav className="sc-nav" data-open={open}>
      <a href="/" className="sc-nav-logo">
        <img src="/logo.png" alt="The Solopreneurs Club" />
        <span className="sc-nav-logo-text">Solopreneurs Club</span>
      </a>

      <div className="sc-nav-links" id="sc-nav-menu">
        {NAV_LINKS.map((l) => (
          <a
            key={l.id}
            href={`#${l.id}`}
            className="sc-nav-link"
            data-active={active === l.id}
            onClick={() => setOpen(false)}
          >
            {l.label}
          </a>
        ))}
        <a
          href={CTA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="sc-nav-cta sc-nav-cta-menu"
        >
          {CTA_LABEL}
        </a>
      </div>

      <div className="sc-nav-right">
        <a href={CTA_URL} target="_blank" rel="noopener noreferrer" className="sc-nav-cta">
          {CTA_LABEL}
        </a>
        <button
          type="button"
          className="sc-nav-burger"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="sc-nav-menu"
          onClick={() => setOpen((o) => !o)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
    </nav>
  )
}
