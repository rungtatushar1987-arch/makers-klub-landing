import { Fragment } from 'react'
import './Marquee.css'

const WORDS = ['FOUNDERS', 'CREATIVES', 'FREELANCERS', 'CONSULTANTS', 'DESIGNERS', 'COACHES']

export default function Marquee() {
  const words = [...WORDS, ...WORDS]
  return (
    <div className="sc-marquee">
      <div className="sc-marquee-track">
        {words.map((word, i) => (
          <Fragment key={i}>
            <span>{word}</span>
            <span className="sc-marquee-dot">·</span>
          </Fragment>
        ))}
      </div>
    </div>
  )
}
