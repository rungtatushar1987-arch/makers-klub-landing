import './Membership.css'

const TALLY_FORM_URL = 'https://tally.so/r/Pde8pd'

export default function Membership() {
  return (
    <section className="sc-membership on-navy" id="membership">
      <div className="sc-membership-inner">
        <div className="sc-mast-label">
          <span className="sc-mast-eyebrow">Membership</span>
        </div>
        <h2 className="h-xl">Join the Club</h2>

        <div className="sc-membership-action">
          <p className="sc-membership-desc">
            Tell us a bit about yourself. We review every application personally — approved
            members hear back within a few days.
          </p>

          <a
            href={TALLY_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-solid sc-membership-cta"
          >
            Apply to Join →
          </a>
        </div>
      </div>
    </section>
  )
}
