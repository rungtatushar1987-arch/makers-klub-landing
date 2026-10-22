import './About.css'
import { ABOUT } from '../content'

export default function About() {
  return (
    <section className="sc-about" id="about">
      <div className="sc-about-inner">
        <div className="sc-about-copy">
          <div className="sc-mast-label">
            <span className="sc-mast-eyebrow">{ABOUT.eyebrow}</span>
          </div>
          <h2 className="h-xl sc-about-statement">{ABOUT.statement}</h2>
          {ABOUT.paragraphs.map((p) => (
            <p className="body-copy sc-about-p" key={p.slice(0, 24)}>{p}</p>
          ))}
          <a href="#membership" className="link-underline">See membership →</a>
        </div>
        <img className="sc-about-photo" src={ABOUT.image} alt={ABOUT.imageAlt} loading="lazy" />
      </div>
    </section>
  )
}
