import { useState } from 'react'
import './Membership.css'
import { CTA_URL, CTA_LABEL, TIERS, TIERS_FINE_PRINT, BUSINESS_TIER, CONTACT } from '../content'

export default function Membership() {
  const [billing, setBilling] = useState('monthly')

  return (
    <section className="sc-membership" id="membership">
      <div className="sc-membership-inner">
        <div className="sc-mast-label">
          <span className="sc-mast-eyebrow">Membership</span>
        </div>
        <h2 className="h-xl sc-membership-heading">
          Pick the level that <em>fits</em> you.
        </h2>

        <div className="sc-plan-toggle sc-plan-toggle-standalone" role="radiogroup" aria-label="Billing period">
          {['monthly', 'yearly'].map((key) => (
            <button
              key={key}
              type="button"
              role="radio"
              aria-checked={billing === key}
              className="sc-plan-toggle-btn"
              data-active={billing === key}
              onClick={() => setBilling(key)}
            >
              {key === 'monthly' ? 'Monthly' : 'Yearly'}
            </button>
          ))}
        </div>

        <div className="sc-tier-grid">
          {TIERS.map((tier) => (
            <div key={tier.key} className="sc-tier-card" data-highlight={tier.highlight}>
              {tier.highlight && <div className="sc-tier-badge">Most popular</div>}
              <div className="sc-tier-top">
                <div>
                  <div className="sc-tier-name">{tier.name}</div>
                  <div className="sc-tier-tagline">{tier.tagline}</div>
                </div>
              </div>

              <div className="sc-tier-price">
                {billing === 'monthly' ? tier.monthly : tier.yearly}
                <span>{tier.monthly === '€0' ? 'forever' : billing === 'monthly' ? '/ month' : '/ year'}</span>
              </div>

              <ul className="sc-tier-included">
                {tier.included.map((item) => (
                  <li key={item}>
                    <span className="sc-fit-emoji">👉</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>

              <a
                href={CTA_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={tier.highlight ? 'btn-solid sc-membership-cta' : 'sc-membership-cta sc-membership-cta-outline'}
              >
                {tier.name === 'Free' ? 'Join Free' : CTA_LABEL} →
              </a>
            </div>
          ))}
        </div>
        <p className="sc-tier-fine-print">{TIERS_FINE_PRINT}</p>

        <div className="sc-business-card">
          <div className="sc-business-image">
            <img src={BUSINESS_TIER.image} alt={BUSINESS_TIER.imageAlt} />
          </div>
          <div className="sc-business-copy">
            <div className="sc-mast-label"><span className="sc-mast-eyebrow">{BUSINESS_TIER.eyebrow}</span></div>
            <h3 className="sc-business-title">{BUSINESS_TIER.name}</h3>
            <p className="body-copy">{BUSINESS_TIER.tagline}</p>
            <ul className="sc-business-list">
              {BUSINESS_TIER.included.map((item) => (
                <li key={item}>
                  <span className="sc-fit-emoji">👉</span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="sc-business-note">{BUSINESS_TIER.note}</p>
            <div className="sc-business-person">
              <div className="sc-business-name">{CONTACT.founder.name}</div>
              <div className="sc-business-role">{CONTACT.founder.role}, The Solopreneurs Club</div>
            </div>
            <div className="sc-business-links">
              <a href={BUSINESS_TIER.ctaUrl}>
                <span className="sc-business-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7 8 6 8-6" /></svg>
                </span>
                {BUSINESS_TIER.cta} →
              </a>
              <a href={CONTACT.linkedin} target="_blank" rel="noopener noreferrer">
                <span className="sc-business-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4v11.5H3V9.75Zm6.5 0h3.8v1.6h.05c.55-1 1.9-1.95 3.9-1.95 4.1 0 4.75 2.7 4.75 6.2v5.65h-4v-5c0-1.2 0-2.75-1.7-2.75s-1.95 1.3-1.95 2.65v5.1h-4V9.75Z" /></svg>
                </span>
                Connect on LinkedIn →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
