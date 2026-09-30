import './WhySection.css'

const ITEMS = [
  {
    problem: 'Your rates are a guess.',
    fix: "Work out your minimum rate with the pricing module and calculator, then get help raising it from people who've done it.",
  },
  {
    problem: '"Send me a proposal." Then silence.',
    fix: 'The pitching module covers the call and the follow-up. Post the real email in Slack and get feedback within 24 hours on weekdays.',
  },
  {
    problem: 'The Finanzamt only writes in German.',
    fix: 'The Germany admin module and checklist cover registration, invoicing and contracts. Bring the rest to the tax advisor AMA.',
  },
]

export default function WhySection() {
  return (
    <section className="sc-why">
      <div className="sc-why-inner">
        <div className="sc-mast">
          <div>
            <div className="sc-mast-label">
              <span className="sc-mast-eyebrow">1 to 3 years in</span>
            </div>
            <h2 className="h-xl sc-why-heading">
              You've got your first clients. Now build the <em>business</em> around them.
            </h2>
          </div>
        </div>

        <div className="sc-why-grid">
          {ITEMS.map((item) => (
            <div className="sc-why-card" key={item.problem}>
              <h3>{item.problem}</h3>
              <div className="sc-why-fix">
                <span className="sc-mast-eyebrow">Our fix</span>
                <p>{item.fix}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
