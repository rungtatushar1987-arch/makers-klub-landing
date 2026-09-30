import './Credibility.css'
import { CREDIBILITY } from '../content'

export default function Credibility() {
  const { eyebrow, experts, tools, network } = CREDIBILITY
  const cards = [experts, tools, network]

  return (
    <section className="sc-cred">
      <div className="sc-cred-inner">
        <div className="sc-mast">
          <div>
            <div className="sc-mast-label">
              <span className="sc-mast-eyebrow">{eyebrow}</span>
            </div>
            <h2 className="h-xl sc-cred-heading">
              The people and <em>network</em> behind you
            </h2>
          </div>
        </div>

        <div className="sc-cred-grid">
          {cards.map((card) => (
            <div className="sc-cred-card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
