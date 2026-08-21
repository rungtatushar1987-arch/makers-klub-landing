import './Membership.css'

const TIERS = [
  {
    key: 'lite',
    name: 'Lite',
    tagline: 'Start your journey',
    price: '€39',
    ctaClass: 'btn-ghost',
    rows: [
      { title: 'Monthly Co-working Day', desc: 'One curated session a month, matched to your brief.' },
      { title: '15% Workshop Discount', desc: 'On all paid workshops and events.' },
      { title: 'Free Networking Events', desc: 'Open access to community mixers.' },
      { title: 'Newsletter Feature', desc: 'Get your work in front of the network.' },
    ],
  },
  {
    key: 'premium',
    name: 'Premium',
    tagline: 'For serious operators',
    price: '€149',
    ctaClass: 'btn-solid',
    rows: [
      { title: 'Everything in Lite', desc: 'All co-working, discounts, and events.' },
      { title: '50% Workshop Discount', desc: 'Deeper discount across all workshops.' },
      { title: 'Gig-Matching Access', desc: 'Ongoing access to our matching channel.' },
      { title: 'Monthly Expert Check-in', desc: 'Plus full member feature across newsletter, site, and events.' },
    ],
  },
]

export default function Membership() {
  return (
    <section className="sc-membership">
      <div className="sc-membership-head">
        <p className="eyebrow">Membership</p>
        <h2 className="h-xl">Join the Club</h2>
      </div>

      <div className="sc-tier-grid">
        {TIERS.map((tier) => (
          <div className={`sc-tier-card${tier.key === 'premium' ? ' premium' : ''}`} key={tier.key}>
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
            <a href="#join" className={`${tier.ctaClass} sc-tier-cta`}>
              Join {tier.name} →
            </a>
          </div>
        ))}
      </div>
    </section>
  )
}
