import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'
import { useKlub } from '../KlubContext'
import { calcProfileProgress, getInitials, type Event } from '../supabase'
import Onboarding from './Onboarding'
import './Dashboard.css'

function eventDuration(start: string, end?: string | null) {
  if (!end) return ''
  const mins = Math.round((new Date(end).getTime() - new Date(start).getTime()) / 60000)
  if (mins <= 0) return ''
  if (mins < 120) return `${mins} min`
  const h = mins / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hrs`
}

// "Today", "Tomorrow", "In 5 days" — calendar days, not 24h blocks.
function countdown(date: string) {
  const start = new Date(date)
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const day = new Date(start); day.setHours(0, 0, 0, 0)
  const days = Math.round((day.getTime() - today.getTime()) / 86400000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  if (days < 14) return `In ${days} days`
  return `In ${Math.round(days / 7)} weeks`
}

const fmtTime = (d: Date) => d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })

export default function Dashboard() {
  const { user } = useUser()
  const { connections, incomingRequests, events, myRsvps, allRsvps, profile, loading, isOnboarding } = useKlub()

  const firstName = user?.firstName || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  if (loading) return <div className="mkw-loading">Loading…</div>

  if (isOnboarding) return (
    <div className="mkw-main-body mkw-main-body--onboarding" style={{ padding: '0 36px 64px 40px' }}>
      <Onboarding />
    </div>
  )

  const now = new Date()
  const upcoming = events.filter(e => new Date(e.end_date || e.date) >= now).sort((a, b) => a.date.localeCompare(b.date))
  const isMine = (e: Event) => myRsvps[e.id] === 'going' || myRsvps[e.id] === 'waitlist'
  // Lead with an event the member is already in; otherwise the soonest one they could join.
  const next = upcoming.find(isMine) ?? upcoming[0]
  const later = upcoming.filter(e => e.id !== next?.id).slice(0, 4)

  const goingTo = (id: string) => allRsvps.filter(r => r.event_id === id && r.status === 'going')
  const followUps = connections.filter(c => c.remind_followup)
  const progress = calcProfileProgress(profile)

  const nextDate = next ? new Date(next.date) : null
  const nextStatus = next ? myRsvps[next.id] : undefined
  const nextGoing = next ? goingTo(next.id) : []
  const others = nextGoing.filter(r => r.clerk_user_id !== user?.id)
  const dur = next ? eventDuration(next.date, next.end_date) : ''

  return (
    <>
      <div className="mkw-pagehead">
        <div>
          <div className="eyebrow">{now.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1>Good {greeting}, <em>{firstName}.</em></h1>
        </div>
        <div className="actions">
          <Link to="/events" className="mk-btn mk-btn-primary mk-btn-sm">Browse events</Link>
        </div>
      </div>

      <div className="mkw-main-body hm">
        {/* ── Next up: the one thing to do ── */}
        {next && nextDate ? (
          <section className="hm-next" aria-labelledby="hm-next-h">
            <div className="hm-stub" aria-hidden="true">
              <b>{nextDate.getDate()}</b>
              <span>{nextDate.toLocaleString('en', { month: 'short' }).toUpperCase()}</span>
              <i>{nextDate.toLocaleString('en', { weekday: 'short' })}</i>
            </div>

            <div className="hm-next-main">
              <div className="hm-next-top">
                <span className="hm-eyebrow">{isMine(next) ? 'Your next event' : 'Next event'}</span>
                <span className="hm-count">{countdown(next.date)}</span>
                {nextStatus === 'going' && <span className="hm-badge hm-badge--ok">You're going</span>}
                {nextStatus === 'waitlist' && <span className="hm-badge">On the waitlist</span>}
              </div>
              <h2 id="hm-next-h">{next.title}</h2>
              <p className="hm-next-meta">
                {fmtTime(nextDate)}{dur ? ` · ${dur}` : ''}{next.location ? ` · ${next.location}` : ''}
              </p>

              {nextGoing.length > 0 && (
                <div className="hm-going">
                  <div className="hm-stack">
                    {others.slice(0, 5).map(r => (
                      <span key={r.clerk_user_id} className="hm-av" style={{ background: r.profile?.avatar_color || 'var(--mk-yellow)' }}>
                        {getInitials(r.profile?.full_name || '')}
                      </span>
                    ))}
                  </div>
                  <span>
                    {others.length === 0
                      ? 'Just you so far'
                      : nextStatus === 'going'
                        ? `You and ${others.length} ${others.length === 1 ? 'other' : 'others'} are going`
                        : `${nextGoing.length} going`}
                  </span>
                </div>
              )}

              <div className="hm-next-actions">
                <Link to={`/events?event=${next.id}`} className="mk-btn mk-btn-primary hm-next-cta">
                  {isMine(next) ? 'View event' : 'See details and register'}
                </Link>
                {isMine(next) && (
                  <Link to={`/events/${next.id}/room`} className="mk-btn hm-room-link">Open event room</Link>
                )}
              </div>
            </div>

            {next.image_url && <img className="hm-next-img" src={next.image_url} alt="" />}
          </section>
        ) : (
          <section className="hm-next hm-next--empty">
            <div className="hm-next-main">
              <span className="hm-eyebrow">Next event</span>
              <h2>No events scheduled yet</h2>
              <p className="hm-next-meta">New dates are added here as soon as they're announced.</p>
              <Link to="/events" className="mk-btn mk-btn-primary hm-next-cta">Past events</Link>
            </div>
          </section>
        )}

        <div className="hm-cols">
          {/* ── Left: people ── */}
          <div className="hm-col">
            {incomingRequests.length > 0 && (
              <section className="hm-card hm-card--alert">
                <div className="hm-head">
                  <h3>Connection requests <span className="hm-n">{incomingRequests.length}</span></h3>
                  <Link to="/network">Review</Link>
                </div>
                <p className="hm-sub">
                  {incomingRequests.slice(0, 2).map(r => r.profile?.full_name || 'A member').join(' and ')}
                  {incomingRequests.length > 2 ? ` and ${incomingRequests.length - 2} more` : ''} want to connect.
                </p>
              </section>
            )}

            <section className="hm-card">
              <div className="hm-head">
                <h3>Follow up {followUps.length > 0 && <span className="hm-n">{followUps.length}</span>}</h3>
                <Link to="/network">All connections</Link>
              </div>
              {followUps.length === 0 ? (
                <p className="hm-empty">
                  {connections.length === 0
                    ? 'Meet someone at an event and add them to your network. People you flag for a follow-up show up here.'
                    : `You're all caught up. ${connections.length} ${connections.length === 1 ? 'connection' : 'connections'} in your network.`}
                </p>
              ) : (
                <ul className="hm-list">
                  {followUps.slice(0, 5).map(c => (
                    <li key={c.id}>
                      <Link to="/network" className="hm-person">
                        <span className="hm-av hm-av--lg" style={{ background: c.profile?.avatar_color || 'var(--mk-yellow)' }}>
                          {getInitials(c.profile?.full_name || '')}
                        </span>
                        <span className="hm-person-main">
                          <b>{c.profile?.full_name || 'Member'}</b>
                          <span>{c.notes?.trim() || (c.event_name ? `Met at ${c.event_name}` : 'No note yet')}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {!progress.isComplete && (
              <section className="hm-card hm-profile">
                <div className="hm-head">
                  <h3>Finish your profile</h3>
                  <Link to="/profile">Continue</Link>
                </div>
                <div className="hm-bar" role="progressbar" aria-valuenow={progress.pct} aria-valuemin={0} aria-valuemax={100} aria-label="Profile completion">
                  <span style={{ width: `${progress.pct}%` }} />
                </div>
                <p className="hm-sub">{progress.fieldsLeft} {progress.fieldsLeft === 1 ? 'section' : 'sections'} left. Members find each other through what's on your profile.</p>
              </section>
            )}
          </div>

          {/* ── Right: what's after that ── */}
          <div className="hm-col">
            <section className="hm-card">
              <div className="hm-head">
                <h3>Coming up</h3>
                <Link to="/events">All events</Link>
              </div>
              {later.length === 0 ? (
                <p className="hm-empty">Nothing else scheduled. Check back soon.</p>
              ) : (
                <ul className="hm-list">
                  {later.map(ev => {
                    const d = new Date(ev.date)
                    const st = myRsvps[ev.id]
                    return (
                      <li key={ev.id}>
                        <Link to={`/events?event=${ev.id}`} className="hm-ev">
                          <span className="hm-ev-date">
                            <b>{d.getDate()}</b>
                            <span>{d.toLocaleString('en', { month: 'short' }).toUpperCase()}</span>
                          </span>
                          <span className="hm-ev-main">
                            <b>{ev.title}</b>
                            <span>{d.toLocaleDateString('en', { weekday: 'short' })} · {fmtTime(d)}{ev.location ? ` · ${ev.location}` : ''}</span>
                          </span>
                          {st === 'going' && <span className="hm-badge hm-badge--ok">Going</span>}
                          {st === 'waitlist' && <span className="hm-badge">Waitlist</span>}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  )
}
