import './FinalCta.css'
import { CTA_URL, CTA_LABEL, FINAL_CTA } from '../content'

export default function FinalCta() {
  return (
    <section className="sc-final" style={{ backgroundImage: `url(${FINAL_CTA.image})` }}>
      <div className="sc-final-inner">
        <h2>{FINAL_CTA.title}</h2>
        <a href={CTA_URL} target="_blank" rel="noopener noreferrer" className="btn-solid">
          {CTA_LABEL} →
        </a>
        <p>{FINAL_CTA.note}</p>
      </div>
    </section>
  )
}
