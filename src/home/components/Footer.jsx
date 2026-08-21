import './Footer.css'

export default function Footer() {
  return (
    <footer className="sc-footer">
      <a href="/" className="sc-footer-logo">
        <img src="/logo.png" alt="The Solopreneurs Club" />
        <span className="sc-footer-logo-text">Solopreneurs Club</span>
      </a>
      <p className="sc-footer-text">© 2026 The Solopreneurs Club. Berlin, Germany.</p>
      <div className="sc-footer-links">
        <a href="/impressum.html">Impressum</a>
        <a href="/datenschutz.html">Datenschutz</a>
        <a href="https://www.instagram.com/themakersklub" target="_blank" rel="noopener noreferrer">Instagram</a>
        <a href="https://www.linkedin.com/company/themakersklub" target="_blank" rel="noopener noreferrer">LinkedIn</a>
      </div>
    </footer>
  )
}
