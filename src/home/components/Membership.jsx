import './Membership.css'

export default function Membership() {
  return (
    <section className="sc-membership">
      <div className="sc-membership-head">
        <p className="eyebrow">Membership</p>
        <h2 className="h-xl">Join the Club</h2>
      </div>

      <a href="/community/join" className="btn-solid sc-membership-cta">Apply to Join →</a>
    </section>
  )
}
