import { useEffect, useRef, useState } from 'react'
import './Replays.css'
import { REPLAYS, CTA_URL } from '../content'

export default function Replays() {
  const { items, eyebrow, title, note, gate } = REPLAYS
  const trackRef = useRef(null)
  const [active, setActive] = useState(null)

  useEffect(() => {
    if (!active) return
    const onKey = (e) => e.key === 'Escape' && setActive(null)
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [active])

  if (!items.length) return null

  const scrollBy = (dir) => {
    const t = trackRef.current
    if (!t) return
    const card = t.querySelector('.sc-replay-card')
    t.scrollBy({ left: dir * ((card ? card.offsetWidth : 300) + 24), behavior: 'smooth' })
  }

  return (
    <section className="sc-replays" id="replays">
      <div className="sc-replays-inner">
        <div className="sc-mast">
          <div>
            <div className="sc-mast-label"><span className="sc-mast-eyebrow">{eyebrow}</span></div>
            <h2 className="h-xl sc-replays-title">{title}</h2>
          </div>
          <div className="sc-replay-arrows">
            <button type="button" aria-label="Previous" onClick={() => scrollBy(-1)}>←</button>
            <button type="button" aria-label="Next" onClick={() => scrollBy(1)}>→</button>
          </div>
        </div>
        <p className="sc-replays-note">{note}</p>

        <div className="sc-replay-track" ref={trackRef} tabIndex={0} aria-label="Past workshops and webinars">
          {items.map((it, i) => (
            <article className="sc-replay-card" key={i}>
              <button type="button" className="sc-replay-thumb" onClick={() => setActive(it)} aria-label={`Watch ${it.title}`}>
                {it.image && <img src={it.image} alt="" loading="lazy" />}
                <span className="sc-replay-kind" data-kind={it.kind}>{it.kind}</span>
                <span className="sc-replay-play" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
                </span>
              </button>
              <div className="sc-replay-body">
                <h3 className="sc-replay-name">{it.title}</h3>
                <p className="sc-replay-meta">{it.where}</p>
                <p className="sc-replay-meta">{it.date} · {it.duration}</p>
                <button type="button" className="link-underline sc-replay-watch" onClick={() => setActive(it)}>Watch →</button>
              </div>
            </article>
          ))}
        </div>
      </div>

      {active && (
        <div className="sc-gate" onClick={() => setActive(null)}>
          <div className="sc-gate-dialog" role="dialog" aria-modal="true" aria-labelledby="sc-gate-title" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="sc-gate-close" aria-label="Close" onClick={() => setActive(null)}>×</button>
            <div className="sc-mast-label"><span className="sc-mast-eyebrow">{active.kind}</span></div>
            <p className="sc-gate-session">{active.title}</p>
            <h3 id="sc-gate-title" className="sc-gate-title">{gate.title}</h3>
            <p className="sc-gate-body">{gate.body}</p>
            <div className="sc-gate-actions">
              <a href={CTA_URL} target="_blank" rel="noopener noreferrer" className="btn-solid">{gate.cta} →</a>
              <a href="#membership" className="link-underline" onClick={() => setActive(null)}>{gate.secondary}</a>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
