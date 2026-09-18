import './Membership.css'

const TALLY_FORM_URL = 'https://tally.so/r/Pde8pd'

const TIERS = [
  {
    key: 'early-bird',
    name: 'Early Bird',
    tagline: 'Beta launch pricing',
    price: '€20',
    rows: [
      { title: 'Members-Only Events', desc: 'Exclusive access to in-person and virtual sessions.' },
      { title: 'Weekly Peer Feedback Calls', desc: 'Share problems, get feedback, and seek opinions from the group.' },
      { title: 'Monthly Expert AMAs', desc: 'LinkedIn growth, German bureaucracy, and more.' },
      { title: 'Resource Library and Tool Picks', desc: 'Our own recommendations, plus members-only discounts.' },
    ],
  },
  {
    key: 'full',
    name: 'Full Membership',
    tagline: 'Standard pricing',
    price: '€50',
    premium: true,
    rows: [
      { title: 'Everything in Early Bird', desc: 'All events, calls, resources, and discounts.' },
      { title: 'Members-Only Events', desc: 'Exclusive access to in-person and virtual sessions.' },
      { title: 'Weekly Peer Feedback Calls', desc: 'Share problems, get feedback, and seek opinions from the group.' },
      { title: 'Monthly Expert AMAs', desc: 'LinkedIn growth, German bureaucracy, and more.' },
    ],
  },
]

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
          {TIERS.map((tier) => (
            <div className={`sc-tier-card${tier.premium ? ' premium' : ''}`} key={tier.key}>
              <div className="sc-tier-top">
                <div>
                  <div className="sc-tier-name">{tier.name}</div>
                  <div className="sc-tier-tagline">{tier.tagline}</div>
                </div>
                <div className="sc-tier-price">
                  {tier.price}
                  <span>/ month</span>
                </div>
              </div>
              <div className="sc-tier-list">
                {tier.rows.map((row) => (
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
          ))}
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
