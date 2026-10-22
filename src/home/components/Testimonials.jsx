import './Testimonials.css'
import { TESTIMONIALS } from '../content'

export default function Testimonials() {
  if (!TESTIMONIALS.length) return null
  return (
    <section className="sc-testi">
      <div className="sc-testi-inner">
        <div className="sc-mast">
          <div>
            <div className="sc-mast-label"><span className="sc-mast-eyebrow">MEMBERS</span></div>
            <h2 className="h-xl">What members <em>say</em></h2>
          </div>
        </div>
        <div className="sc-testi-grid">
          {TESTIMONIALS.map((t) => (
            <figure className="sc-testi-card" key={t.name}>
              <blockquote>“{t.quote}”</blockquote>
              <figcaption><strong>{t.name}</strong><span>{t.role}</span></figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  )
}
