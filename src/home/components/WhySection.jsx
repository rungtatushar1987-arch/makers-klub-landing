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
    <section className="sc-why on-navy">
      <div className="sc-why-inner">
        <div className="sc-why-head">
          <p className="eyebrow">Built for solo builders</p>
          <h2 className="h-xl">
            Going solo
            <br />
            shouldn't mean <em>doing it alone</em>
          </h2>
          <p className="body-copy">
            Three real problems every solo builder runs into. Here's what we actually do about each one.
          </p>
        </div>
        <div className="sc-why-grid">
          {ITEMS.map((item) => (
            <div className="sc-why-item" key={item.num}>
              <div className="sc-why-bg" />
              <div className="sc-why-num">{item.num}</div>
              <h3>{item.title}</h3>
              <p className="sc-why-problem">{item.problem}</p>
              <p className="sc-why-solution">
                <span>Our fix —</span> {item.solution}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
