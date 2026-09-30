import './WhatsIncluded.css'
import { WHATS_INCLUDED } from '../content'

export default function WhatsIncluded() {
  return (
    <section className="sc-included">
      <div className="sc-included-inner">
        <div className="sc-mast">
          <div>
            <div className="sc-mast-label">
              <span className="sc-mast-eyebrow">{WHATS_INCLUDED.eyebrow}</span>
            </div>
            <h2 className="h-xl sc-included-heading">
              Everything in the <em>membership</em>
            </h2>
          </div>
        </div>

        <div className="sc-included-list">
          {WHATS_INCLUDED.rows.map((row) => (
            <div className="sc-included-row" key={row.name}>
              <div className="sc-included-row-top">
                <strong>{row.name}</strong>
                <span className="sc-included-cadence">{row.cadence}</span>
              </div>
              <p>{row.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
