import './FitCheck.css'
import { FIT_CHECK } from '../content'

export default function FitCheck() {
  const { eyebrow, join, skip } = FIT_CHECK

  return (
    <section className="sc-fit">
      <div className="sc-fit-inner">
        <div className="sc-mast">
          <div>
            <div className="sc-mast-label">
              <span className="sc-mast-eyebrow">{eyebrow}</span>
            </div>
            <h2 className="h-xl sc-fit-heading">
              Is this <em>for you</em>?
            </h2>
          </div>
        </div>

        <div className="sc-fit-grid">
          <div className="sc-fit-card sc-fit-card-join">
            <h3>{join.title}</h3>
            <ul>
              {join.items.map((item) => (
                <li key={item}>
                  <span className="sc-fit-emoji">👉</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="sc-fit-card sc-fit-card-skip">
            <h3>{skip.title}</h3>
            <ul>
              {skip.items.map((item) => (
                <li key={item}>
                  <span className="sc-fit-emoji">👉</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
