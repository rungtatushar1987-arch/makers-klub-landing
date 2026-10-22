import { useState } from 'react'
import './Faq.css'
import { FAQ } from '../content'

export default function Faq() {
  const [openIdx, setOpenIdx] = useState(0)
  return (
    <section className="sc-faq" id="faq">
      <div className="sc-faq-inner">
        <div className="sc-mast">
          <div>
            <div className="sc-mast-label"><span className="sc-mast-eyebrow">FAQ</span></div>
            <h2 className="h-xl">Good <em>questions</em></h2>
          </div>
        </div>
        <div className="sc-faq-list">
          {FAQ.map((item, i) => {
            const isOpen = openIdx === i
            return (
              <div className="sc-faq-item" data-open={isOpen} key={item.q}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`sc-faq-a-${i}`}
                    id={`sc-faq-q-${i}`}
                    onClick={() => setOpenIdx(isOpen ? -1 : i)}
                  >
                    <span>{item.q}</span>
                    <span className="sc-faq-icon" aria-hidden="true" />
                  </button>
                </h3>
                <div className="sc-faq-answer" id={`sc-faq-a-${i}`} role="region" aria-labelledby={`sc-faq-q-${i}`}>
                  <p>{item.a}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
