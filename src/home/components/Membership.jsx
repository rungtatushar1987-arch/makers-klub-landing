import './Membership.css'

export default function Membership() {
  return (
    <section className="sc-membership">
      <div className="sc-membership-inner">
        <div className="sc-mast-label">
          <span className="sc-mast-eyebrow">Membership</span>
        </div>
        <div className="sc-membership-row">
          <h2 className="h-xl">Join the Club</h2>
          <a href="/community/join" className="btn-solid sc-membership-cta">Apply to Join →</a>
        </div>
      </div>
    </section>
  )
}
