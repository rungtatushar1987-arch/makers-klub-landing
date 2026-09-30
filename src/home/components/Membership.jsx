import { useState } from 'react'
import './Membership.css'
import {
  CTA_URL,
  CTA_LABEL,
  FOUNDING_OPEN,
  FOUNDING_SPOTS_LEFT,
  FOUNDING_SPOTS_TOTAL,
  FOUNDING_DEADLINE,
} from '../content'

const PLANS = {
  monthly: { label: 'Monthly', price: '€49.99', unit: '/ month', caption: 'Billed monthly' },
  yearly: { label: 'Yearly', price: '€499.99', unit: '/ year', caption: 'Billed yearly' },
}

const INCLUDED = [
  'Foundation video library',
  'Private Slack with 24-hour weekday answers',
  'Monthly live session',
  'Expert AMAs twice a month',
  'Berlin meetups',
  'Resource library',
  "Referrals once you've done the work",
]

export default function Membership() {
  const [billing, setBilling] = useState('monthly')
  const plan = PLANS[billing]

  return (
    <section className="sc-membership" id="membership">
      <div className="sc-membership-inner">
        <div className="sc-mast-label">
          <span className="sc-mast-eyebrow">Membership</span>
        </div>
        <h2 className="h-xl sc-membership-heading">
          One plan. <em>Everything</em> included.
        </h2>

        {FOUNDING_OPEN && (
          <div className="sc-founding-banner">
            Founding members pay €20/month for as long as they stay. {FOUNDING_SPOTS_LEFT} of{' '}
            {FOUNDING_SPOTS_TOTAL} spots left, until {FOUNDING_DEADLINE}.
          </div>
        )}

        <div className="sc-tier-grid">
          <div className="sc-tier-card">
            <div className="sc-tier-top">
              <div>
                <div className="sc-tier-name">Membership</div>
                <div className="sc-tier-tagline">{plan.caption}</div>
              </div>
              <div className="sc-tier-price-col">
                <div className="sc-plan-toggle" role="radiogroup" aria-label="Billing period">
                  {Object.entries(PLANS).map(([key, p]) => (
                    <button
                      key={key}
                      type="button"
                      role="radio"
                      aria-checked={billing === key}
                      className="sc-plan-toggle-btn"
                      data-active={billing === key}
                      onClick={() => setBilling(key)}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="sc-tier-price">
                  {plan.price}
                  <span>{plan.unit}</span>
                </div>
              </div>
            </div>

            <p className="sc-tier-session-note">
              The monthly live session alone costs non-members €40.
            </p>

            <ul className="sc-tier-included">
              {INCLUDED.map((item) => (
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
              className="btn-solid sc-membership-cta"
            >
              {CTA_LABEL} →
            </a>
            <p className="sc-tier-fine-print">€49.99/month or €499.99/year.</p>
          </div>
        </div>
      </div>
    </section>
  )
}
