import './Nav.css'

export default function Nav() {
  return (
    <nav className="sc-nav">
      <a href="/" className="sc-nav-logo">
        <img src="/logo.png" alt="The Solopreneurs Club" />
        <span className="sc-nav-logo-text">Solopreneurs Club</span>
      </a>
      <div className="sc-nav-right">
        <a href="#join" className="sc-nav-cta">Join</a>
        <div className="sc-nav-burger" aria-hidden="true">
          <span></span>
          <span></span>
        </div>
      </div>
    </nav>
  )
}
