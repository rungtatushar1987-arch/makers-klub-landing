import './Membership.css'

const TALLY_EMBED_SRC = 'https://tally.so/embed/Pde8pd?alignLeft=1&hideTitle=1&transparentBackground=1'

export default function Membership() {
  return (
    <section className="sc-membership" id="membership">
      <div className="sc-membership-inner">
        <div className="sc-mast-label">
          <span className="sc-mast-eyebrow">Membership</span>
        </div>
        <h2 className="h-xl sc-membership-heading">Join the Club</h2>
        <p className="body-copy sc-membership-desc">
          Tell us a bit about yourself. We review every application personally — approved members
          hear back within a few days.
        </p>

        <div className="sc-membership-panel">
          <span className="sc-mast-eyebrow sc-membership-panel-label">Apply to Join</span>
          <iframe
            src={TALLY_EMBED_SRC}
            loading="lazy"
            width="100%"
            height="420"
            frameBorder="0"
            marginHeight="0"
            marginWidth="0"
            title="Apply to Join"
          />
        </div>
      </div>
    </section>
  )
}
