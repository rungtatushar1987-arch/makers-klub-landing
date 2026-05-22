import { useUser } from '@clerk/clerk-react'
import { useKlub } from '../KlubContext'
import type { Event } from '../supabase'
import './Onboarding.css'

export default function Onboarding() {
  const { user } = useUser()
  const { events, rsvpd, toggleRsvp } = useKlub()

  const firstName = user?.firstName || 'there'
  const now = new Date()
  const upcoming = events.filter(e => new Date(e.date) >= now).slice(0, 4)

  const profilePct = user?.firstName && user?.lastName ? 25 : 10

  const EventCard = ({ event }: { event: Event }) => {
    const going = rsvpd.has(event.id)
    const d = new Date(event.date)
    return (
      <div className="onb-event-card">
        <div className="onb-event-date">
          <div className="onb-event-day">{d.getDate()}</div>
          <div className="onb-event-mon">{d.toLocaleString('en', { month: 'short' }).toUpperCase()}</div>
        </div>
        <div className="onb-event-info">
          <div className="onb-event-title">{event.title}</div>
          <div className="onb-event-meta">
            {event.location} · {d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
        </div>
        <button
          className={`mk-btn ${going ? 'mk-btn-ghost' : 'mk-btn-ochre'} mk-btn-sm`}
          onClick={() => toggleRsvp(event)}
        >
          {going ? '✓ Going' : 'RSVP →'}
        </button>
      </div>
    )
  }

  return (
    <div className="onb-wrap">

      {/* Hero */}
      <div className="onb-hero">
        <div className="onb-hero-eyebrow">Welcome to Makers Klub</div>
        <h1 className="onb-hero-title">
          Good to have you,<br /><em>{firstName}.</em>
        </h1>
        <p className="onb-hero-sub">
          You're now part of Berlin's creative community. Start by showing up to an event — that's where everything begins.
        </p>
      </div>

      <div className="onb-grid">
        <div className="onb-main">

          {/* Profile completion */}
          <div className="onb-card onb-card-profile">
            <div className="onb-card-head">
              <div>
                <div className="onb-card-label">Your profile</div>
                <div className="onb-card-title">Complete your brief</div>
              </div>
              <div className="onb-pct">{profilePct}%</div>
            </div>
            <div className="onb-progress-bar">
              <div className="onb-progress-fill" style={{ width: `${profilePct}%` }} />
            </div>
            <p className="onb-card-body">
              Add your role, bio, and links so other members know who you are before they meet you.
            </p>
            <a href="/profile" className="mk-btn mk-btn-navy mk-btn-sm">Complete your profile →</a>
          </div>

          {/* Events */}
          <div className="onb-card">
            <div className="onb-card-label">Step 1</div>
            <div className="onb-card-title">Come to an event</div>
            <p className="onb-card-body">
              Every connection you'll make on this platform starts at a real event. Pick one and show up.
            </p>
            {upcoming.length > 0 ? (
              <div className="onb-events">
                {upcoming.map(e => <EventCard key={e.id} event={e} />)}
              </div>
            ) : (
              <p style={{ fontSize: 13, color: 'var(--fg-3)' }}>No upcoming events right now — check back soon.</p>
            )}
            <a
              href="https://lu.ma/makersklub"
              target="_blank"
              rel="noreferrer"
              className="mk-btn mk-btn-ghost mk-btn-sm"
              style={{ marginTop: 16 }}
            >
              Full calendar →
            </a>
          </div>

          {/* Locked: Network */}
          <div className="onb-card onb-card-locked">
            <div className="onb-lock-badge">🔒 Locked</div>
            <div className="onb-card-title">Your Network</div>
            <p className="onb-card-body">
              Connect with people you meet at events. Your network unlocks after your first connection.
            </p>
            <div className="onb-blur-preview">
              {['Brand Designer', 'Motion Director', 'Creative Lead', 'Copywriter'].map(role => (
                <div key={role} className="onb-blur-pill">{role}</div>
              ))}
            </div>
            <div className="onb-lock-hint">Attend an event → add a connection → unlock your network</div>
          </div>

        </div>

        {/* Right column */}
        <div className="onb-side">

          {/* Steps checklist */}
          <div className="onb-card onb-card-steps">
            <div className="onb-card-label">Getting started</div>
            <div className="onb-steps">
              <div className={`onb-step ${user?.firstName ? 'done' : ''}`}>
                <div className="onb-step-ic">{user?.firstName ? '✓' : '1'}</div>
                <div>
                  <div className="onb-step-title">Create your account</div>
                  <div className="onb-step-sub">You're in.</div>
                </div>
              </div>
              <div className="onb-step">
                <div className="onb-step-ic">2</div>
                <div>
                  <div className="onb-step-title">Complete your profile</div>
                  <div className="onb-step-sub">Add bio, role, and links</div>
                </div>
              </div>
              <div className="onb-step">
                <div className="onb-step-ic">3</div>
                <div>
                  <div className="onb-step-title">RSVP to an event</div>
                  <div className="onb-step-sub">Your first Makers Klub session</div>
                </div>
              </div>
              <div className="onb-step">
                <div className="onb-step-ic">4</div>
                <div>
                  <div className="onb-step-title">Add your first connection</div>
                  <div className="onb-step-sub">Unlock your network</div>
                </div>
              </div>
            </div>
          </div>

          {/* Community stats */}
          <div className="onb-card onb-card-community">
            <div className="onb-card-label">The community</div>
            <div className="onb-community-stats">
              <div className="onb-comm-stat">
                <div className="onb-comm-num">47+</div>
                <div className="onb-comm-lbl">Members</div>
              </div>
              <div className="onb-comm-stat">
                <div className="onb-comm-num">12</div>
                <div className="onb-comm-lbl">Events run</div>
              </div>
              <div className="onb-comm-stat">
                <div className="onb-comm-num">Berlin</div>
                <div className="onb-comm-lbl">Based in</div>
              </div>
            </div>
            <p className="onb-community-note">
              Designers, art directors, founders, motion directors, copywriters — all in the same room.
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
