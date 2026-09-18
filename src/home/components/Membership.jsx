import './Membership.css'

const TALLY_FORM_URL = 'https://tally.so/r/Pde8pd'

const TIER = {
  name: 'Membership',
  tagline: 'Standard pricing',
  price: '€50',
  rows: [
    { title: 'Members-Only Events', desc: 'Exclusive access to in-person and virtual sessions.' },
    { title: 'Weekly Peer Feedback Calls', desc: 'Share problems, get feedback, and seek opinions from the group.' },
    { title: 'Monthly Expert AMAs', desc: 'LinkedIn growth, German bureaucracy, and more.' },
    { title: 'Resource Library and Tool Picks', desc: 'Our own recommendations, plus members-only discounts.' },
  ],
}

export default function Membership() {
  return (
    <section className="sc-membership" id="membership">
      <div className="sc-membership-inner">
        <div className="sc-mast-label">
          <span className="sc-mast-eyebrow">Beta Membership</span>
        </div>
        <h2 className="h-xl sc-membership-heading">Join the Beta Community</h2>
        <p className="sc-membership-desc">
          Exclusive members-only events, weekly peer feedback calls, monthly expert AMAs on
          things like LinkedIn growth and navigating German bureaucracy, a resource library, our
          own tool recommendations, and members-only discounts.
        </p>

        <div className="sc-tier-grid">
          <div className="sc-tier-card">
            <div className="sc-tier-top">
              <div>
                <div className="sc-tier-name">{TIER.name}</div>
                <div className="sc-tier-tagline">{TIER.tagline}</div>
              </div>
              <div className="sc-tier-price">
                {TIER.price}
                <span>/ month</span>
              </div>
            </div>
            <div className="sc-tier-list">
              {TIER.rows.map((row) => (
                <div className="sc-tier-row" key={row.title}>
                  <div className="sc-tier-dot"></div>
                  <div className="sc-tier-row-text">
                    <strong>{row.title}</strong>
                    <p>{row.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <a
          href={TALLY_FORM_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-solid sc-membership-cta"
        >
          Apply to Join →
        </a>
      </div>
    </section>
  )
}
