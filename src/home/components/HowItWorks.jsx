import './HowItWorks.css'
import { HOW_IT_WORKS } from '../content'

export default function HowItWorks() {
  return (
    <section className="sc-how" id="how-it-works">
      <div className="sc-how-inner">
        <div className="sc-mast">
          <div>
            <div className="sc-mast-label">
              <span className="sc-mast-eyebrow">{HOW_IT_WORKS.eyebrow}</span>
            </div>
            <h2 className="h-xl sc-how-heading">
              Foundation first. Then <em>the room</em>. Then referrals.
            </h2>
          </div>
        </div>

        <div className="sc-how-grid">
          {HOW_IT_WORKS.cards.map((card) => (
            <div className="sc-how-card" key={card.number}>
              <div className="sc-how-number">{card.number}</div>
              <h3>{card.title}</h3>
              <div className="sc-how-caption">{card.caption}</div>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
