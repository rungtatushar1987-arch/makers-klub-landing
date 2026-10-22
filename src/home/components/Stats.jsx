import './Stats.css'
import { STATS } from '../content'

export default function Stats() {
  if (!STATS.length) return null
  return (
    <section className="sc-stats" aria-label="The club in numbers">
      <div className="sc-stats-inner">
        {STATS.map((s) => (
          <div className="sc-stat" key={s.label}>
            <div className="sc-stat-value">{s.value}</div>
            <div className="sc-stat-label">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}
