import { useRef } from 'react'
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useKlub } from '../KlubContext'
import Onboarding from './Onboarding'

function eventDuration(start: string, end?: string | null) {
  if (!end) return ''
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  if (mins <= 0) return ''
  if (mins < 120) return `${mins} min`
  const h = mins / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hrs`
}

export default function Dashboard() {
  const { user } = useUser()
  const upcomingTrack = useRef<HTMLDivElement>(null)
  const { connections, events, loading, isOnboarding } = useKlub()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const firstName = user?.firstName || 'there'
  const now = new Date()

  const upcomingEvents = events.filter(e => new Date(e.date) >= now).sort((a, b) => a.date.localeCompare(b.date))
  const scrollUpcoming = (dir: number) => {
    const t = upcomingTrack.current
    if (!t) return
    const card = t.querySelector('.mkw-upcoming-card') as HTMLElement | null
    t.scrollBy({ left: dir * ((card ? card.offsetWidth : 260) + 18), behavior: 'smooth' })
  }

  const followUpCount = connections.filter(c => c.remind_followup).length

  if (loading) return (
    <div className="mkw-loading" style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-display)' }}>
      Loading…
    </div>
  )

  if (isOnboarding) return (
    <div className="mkw-main-body mkw-main-body--onboarding" style={{ padding: '0 36px 64px 40px' }}>
      <Onboarding />
    </div>
  )

  return (
    <>
      {/* ── Page head ── */}
      <div className="mkw-pagehead">
        <div>
          <div className="eyebrow">
            {new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })}
          </div>
          <h1>Good {greeting}, <em>{firstName}.</em></h1>
        </div>
        <div className="actions">
          <a href="/profile" className="mk-btn mk-btn-ghost mk-btn-sm">My Profile</a>
        </div>
      </div>

      {/* ── Main body ── */}
      <div className="mkw-main-body">
        <div className="mkw-home-left">

            {/* Stats */}
            <div className="mkw-stats mkw-stats--home">
              <div className="mkw-stat">
                <div className="lbl">Connections</div>
                <div className="num">{connections.length}</div>
                <div className="delta">People you've met</div>
              </div>
              <div className="mkw-stat">
                <div className="lbl">Follow-ups</div>
                <div className="num" style={{ color: followUpCount > 0 ? 'var(--mk-yellow-deep)' : undefined }}>
                  {followUpCount}
                </div>
                <div className="delta">{followUpCount > 0 ? 'Waiting' : 'All clear'}</div>
              </div>
            </div>

            {/* Upcoming events */}
            {upcomingEvents.length > 0 && (
              <div>
                <div className="mkw-upcoming-head">
                  <div className="mkw-h3" style={{ marginBottom: 0, flex: 1 }}>
                    <span>Upcoming events</span>
                    <Link to="/events">All events →</Link>
                  </div>
                  <div className="mkw-upcoming-arrows">
                    <button type="button" aria-label="Previous" onClick={() => scrollUpcoming(-1)}>←</button>
                    <button type="button" aria-label="Next" onClick={() => scrollUpcoming(1)}>→</button>
                  </div>
                </div>
                <div className="mkw-upcoming-track" ref={upcomingTrack} tabIndex={0} aria-label="Upcoming events">
                  {upcomingEvents.map(ev => {
                    const d = new Date(ev.date)
                    const dur = eventDuration(ev.date, ev.end_date)
                    return (
                      <Link key={ev.id} to={`/events?event=${ev.id}`} className="mkw-upcoming-card">
                        <div className="mkw-upcoming-thumb">
                          {ev.image_url && <img src={ev.image_url} alt="" loading="lazy" />}
                          {ev.type && <span className="mkw-upcoming-kind" data-kind={ev.type}>{ev.type}</span>}
                          <span className="mkw-upcoming-date">
                            <b>{d.getDate()}</b>
                            <span>{d.toLocaleString('en', { month: 'short' }).toUpperCase()}</span>
                          </span>
                        </div>
                        <div className="mkw-upcoming-body">
                          <h3 className="mkw-upcoming-name">{ev.title}</h3>
                          {ev.location && <p className="mkw-upcoming-meta">{ev.location}</p>}
                          <p className="mkw-upcoming-meta">
                            {d.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                            {dur ? ` · ${dur}` : ''}
                          </p>
                          <span className="mkw-upcoming-link">View details →</span>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </div>
            )}

        </div>
      </div>
    </>
  )
}
