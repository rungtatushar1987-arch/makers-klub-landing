import './WhySection.css'

const ITEMS = [
  {
    num: '01',
    title: 'Building alone gets lonely',
    problem: 'No team, no colleagues, no one to talk it through with. The isolation is real.',
    solution: "You're grouped with 5 freelancers every month. A real support group, not a group chat.",
  },
  {
    num: '02',
    title: 'No idea where to start',
    problem: 'Freelancing or running a business with no playbook — every step feels like guesswork.',
    solution: 'A resource library built from what actually works, not generic advice.',
  },
  {
    num: '03',
    title: "Can't find clients",
    problem: "You know your craft. You don't know marketing, GTM, or how to get in front of the right people.",
    solution: 'Monthly mentorship calls with experienced pros in marketing, GTM, and content.',
  },
]

export default function WhySection() {
  return (
    <section className="sc-why">
      <div className="sc-why-inner">
        <div className="sc-mast">
          <div>
            <div className="sc-mast-label">
              <span className="sc-mast-eyebrow">Built for solo builders</span>
            </div>
            <h2 className="h-xl sc-why-heading">
              Going solo shouldn't mean <em>doing it alone</em>
            </h2>
          </div>
          <p className="sc-mast-aside">
            Three real problems every solo builder runs into. Here's what we actually do about
            each one.
          </p>
        </div>

        <div className="sc-why-grid">
          {ITEMS.map((item) => (
            <div className="sc-why-card" key={item.num}>
              <span className="sc-index sc-why-num">N°{item.num}</span>
              <h3>{item.title}</h3>
              <p className="sc-why-problem">{item.problem}</p>
              <div className="sc-why-fix">
                <span className="sc-mast-eyebrow">Our fix</span>
                <p>{item.solution}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
