import './Hub.css'

export default function Hub() {
  return (
    <section className="sc-hub on-navy">
      <div className="sc-hub-bg" />
      <div className="sc-hub-content">
        <p className="eyebrow">Where We Meet</p>
        <h2 className="h-xl">Our Hub</h2>
        <div className="sc-hub-city">
          <span className="sc-hub-pin">◎</span>
          <span className="sc-hub-city-name">Berlin</span>
        </div>
        <p className="sc-hub-venue">Denizen Eiswerk · Berlin Mitte</p>
        <p className="body-copy">
          Regular co-working sessions and networking events at our venue partner. Real rooms, real
          conversations, no Zoom fatigue.
        </p>
        <p className="sc-hub-note">More cities on the roadmap</p>
      </div>
    </section>
  )
}
