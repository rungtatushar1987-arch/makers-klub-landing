import './Hero.css'

export default function Hero() {
  return (
    <section className="sc-hero on-navy">
      <div className="sc-hero-bg" />
      <div className="sc-hero-content">
        <div className="sc-hero-badge">
          <span className="sc-hero-badge-dot"></span>
          For the Bold &amp; Independent
        </div>
        <h1>
          The Solopreneurs
          <br />
          Club
        </h1>
        <p className="sc-hero-sub-label">A club built for</p>
        <div className="sc-hero-typed">OPERATORS</div>
        <p className="sc-hero-desc">
          Real collaborators. No corporate networking theater. Just people who run their own show,
          building and growing together — one session at a time.
        </p>
        <div className="sc-hero-actions">
          <a href="#join" className="btn-solid">Become a Member →</a>
          <a href="#events" className="btn-ghost">See Upcoming Sessions</a>
        </div>
        <div className="sc-hero-scroll">
          Scroll
          <div className="sc-hero-scroll-arrow">↓</div>
        </div>
      </div>
    </section>
  )
}
