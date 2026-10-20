import { useState } from 'react'
import './Membership.css'
import { CTA_URL, CTA_LABEL, TIERS, TIERS_FINE_PRINT, BUSINESS_TIER } from '../content'

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
          <div className="sc-business-copy">
            <div className="sc-tier-name">{BUSINESS_TIER.name}</div>
            <div className="sc-tier-tagline">{BUSINESS_TIER.tagline}</div>
            <p className="sc-business-note">{BUSINESS_TIER.note}</p>
            <a href={BUSINESS_TIER.ctaUrl} className="btn-solid sc-business-cta">
              {BUSINESS_TIER.cta} →
            </a>
          </div>
          <ul className="sc-business-list">
            {BUSINESS_TIER.included.map((item) => (
              <li key={item}>
                <span className="sc-fit-emoji">👉</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
