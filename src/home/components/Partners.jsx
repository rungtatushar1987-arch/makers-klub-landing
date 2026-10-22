import './Testimonials.css'
import { PARTNERS } from '../content'

export default function Partners() {
  if (!PARTNERS.logos.length) return null
  return (
    <section className="sc-partners" aria-label="Partners">
      <div className="sc-partners-inner">
        <div className="sc-partners-row">
          {PARTNERS.logos.map((l) => (
            <a key={l.name} href={l.url} target="_blank" rel="noopener noreferrer">
              <img src={l.src} alt={l.name} loading="lazy" />
            </a>
          ))}
        </div>
        <a href={PARTNERS.href} className="link-underline">Partner with us →</a>
      </div>
    </section>
  )
}
