import './Hero.css'
import { CTA_URL, CTA_LABEL, HERO_SUBHEAD } from '../content'

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

        <p className="sc-hero-desc">{HERO_SUBHEAD}</p>

        <div className="sc-hero-actions">
          <a href={CTA_URL} target="_blank" rel="noopener noreferrer" className="btn-solid">
            {CTA_LABEL} →
          </a>
          <a href="#about" className="link-underline sc-hero-link">Learn more →</a>
        </div>

        <p className="sc-hero-note">Free to join. Paid tiers from €19.99/month.</p>
      </div>

      <div className="sc-hero-scroll">
        <div className="sc-hero-scroll-arrow">↓</div>
        Scroll
      </div>
    </section>
  )
}
