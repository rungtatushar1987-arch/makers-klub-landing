import './Nav.css'
import { CTA_URL, CTA_LABEL } from '../content'

export default function Nav() {
  return (
    <nav className="sc-nav">
      <a href="/" className="sc-nav-logo">
        <img src="/logo.png" alt="The Solopreneurs Club" />
        <span className="sc-nav-logo-text">Solopreneurs Club</span>
      </a>
      <div className="sc-nav-right">
        <a href={CTA_URL} target="_blank" rel="noopener noreferrer" className="sc-nav-cta">
          {CTA_LABEL}
        </a>
      </div>
    </nav>
  )
}
