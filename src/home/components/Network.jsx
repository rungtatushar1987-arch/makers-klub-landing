import './Network.css'

const MEMBERS = [
  { initial: 'A', name: 'Alessandro Tarshahani', role: 'Founder, ALETRA Hub' },
  { initial: 'N', name: 'Nupur Vartak', role: 'Art Director' },
  { initial: 'A', name: 'Ale Ponce', role: 'Freelance Brand Designer' },
  { initial: 'C', name: 'Cat Johnson', role: 'Freelance UI/UX Designer' },
]

export default function Network() {
  return (
    <section className="sc-network">
      <div className="sc-network-head">
        <p className="eyebrow">Our Network</p>
        <h2 className="h-xl">
          People you'll
          <br />
          actually meet
        </h2>
        <p className="body-copy">Members growing their business together and helping each other succeed.</p>
      </div>

      <div className="sc-member-grid">
        {MEMBERS.map((m) => (
          <div className="sc-member-card" key={m.name}>
            <div className="sc-member-photo">{m.initial}</div>
            <div className="sc-member-info">
              <div className="sc-member-name">{m.name}</div>
              <div className="sc-member-role">{m.role}</div>
              <a href="#" className="sc-member-connect">Connect</a>
            </div>
          </div>
        ))}
      </div>

      <div className="sc-network-more">
        <a href="#join" className="link-underline sc-network-more-link">View All Members →</a>
      </div>
    </section>
  )
}
