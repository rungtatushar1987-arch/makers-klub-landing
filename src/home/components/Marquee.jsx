import { Fragment } from 'react'
import './Marquee.css'
import { MARQUEE_NEWS } from '../content'

export default function Marquee() {
  const words = Array.from({ length: 8 }, () => MARQUEE_NEWS).flat()
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
