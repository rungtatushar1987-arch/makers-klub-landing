import './Hero.css'
import { CTA_URL, CTA_LABEL } from '../content'

export default function Hero() {
  return (
    <section className="sc-hero">
      <div className="sc-hero-bg" />
      <div className="sc-hero-content">
        <div className="sc-hero-badge">
          <span className="sc-hero-badge-dot"></span>
          For freelancers in Germany, year one and up
        </div>

        <h1>
          Where freelancers in Germany learn to run the <em>business side</em>.
        </h1>

        <p className="sc-hero-desc">
          A members-only club for freelancers in Germany past their first year. Fix your
          foundation first, then get daily coaching on real client work, a live session every
          month, expert AMAs and a Berlin network that recommends you when it counts.
        </p>

        <div className="sc-hero-actions">
          <a href={CTA_URL} target="_blank" rel="noopener noreferrer" className="btn-solid">
            {CTA_LABEL} →
          </a>
          <a href="#how-it-works" className="btn-ghost">See how it works</a>
        </div>

        <p className="sc-hero-note">€49.99/month.</p>
      </div>

      <div className="sc-hero-scroll">
        <div className="sc-hero-scroll-arrow">↓</div>
        Scroll
      </div>
    </section>
  )
}
