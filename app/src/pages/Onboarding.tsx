import { useMemo } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useKlub } from '../KlubContext'
import type { Event, Profile } from '../supabase'
import './Onboarding.css'

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const h = Math.floor(diff / 3600000)
  const d = Math.floor(diff / 86400000)
  if (h < 1) return 'just now'
  if (h < 24) return `${h}h ago`
  if (d === 1) return 'yesterday'
  return `${d}d ago`
}

function getInitials(name?: string | null): string {
  if (!name) return '?'
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
}

export default function Onboarding() {
  const { user } = useUser()
  const { events, rsvpd, toggleRsvp, allRsvps, allProfiles } = useKlub()

  const firstName = user?.firstName || 'there'
  const now = new Date()
  const upcoming = events.filter(e => new Date(e.date) >= now).slice(0, 4)
  const profilePct = user?.firstName && user?.lastName ? 25 : 10

  // Community members — up to 8, exclude self
  const communityMembers = useMemo(() => {
    return allProfiles.filter(p => p.clerk_user_id !== user?.id).slice(0, 8)
  }, [allProfiles, user?.id])

  // Activity feed — recent RSVPs for upcoming events, exclude self
  const activityFeed = useMemo(() => {
    const now = Date.now()
    const upcomingIds = new Set(events.filter(e => new Date(e.date).getTime() > now).map(e => e.id))
    const eventMap: Record<string, string> = {}
    events.forEach(e => { eventMap[e.id] = e.title })
    return allRsvps
      .filter(r => r.profile && r.clerk_user_id !== user?.id && upcomingIds.has(r.event_id))
      .slice(0, 5)
      .map(r => ({ profile: r.profile!, eventTitle: eventMap[r.event_id] || 'an event', createdAt: r.created_at }))
  }, [allRsvps, events, user?.id])

  // RSVP count per event
  const rsvpCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    allRsvps.forEach(r => { counts[r.event_id] = (counts[r.event_id] || 0) + 1 })
    return counts
  }, [allRsvps])

  const EventCard = ({ event }: { event: Event }) => {
    const going = rsvpd.has(event.id)
    const d = new Date(event.date)
    const count = rsvpCounts[event.id] || 0
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
            {count > 0 && <span className="onb-going-pill">{count} going</span>}
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

          {/* Who's in the Klub */}
          {communityMembers.length > 0 && (
            <div className="onb-card">
              <div className="onb-card-label">Who's in the Klub</div>
              <div className="onb-card-title" style={{ marginBottom: 12 }}>
                {communityMembers.length}+ members in Berlin
              </div>
              <div className="onb-member-strip">
                {communityMembers.map(m => (
                  <div key={m.clerk_user_id} className="onb-member-chip">
                    <div className="onb-member-av" style={{ background: m.avatar_color || '#0f1e3d' }}>
                      {getInitials(m.full_name)}
                    </div>
                    <div className="onb-member-info">
                      <span className="onb-member-name">{m.full_name?.split(' ')[0] || '?'}</span>
                      {m.role_category && <span className="onb-member-role">{m.role_category}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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

          {/* Activity feed */}
          {activityFeed.length > 0 && (
            <div className="onb-card">
              <div className="onb-card-label">Community activity</div>
              <div className="onb-activity-list">
                {activityFeed.map((item, i) => (
                  <div key={i} className="onb-activity-item">
                    <div className="onb-activity-av" style={{ background: item.profile.avatar_color || '#0f1e3d' }}>
                      {getInitials(item.profile.full_name)}
                    </div>
                    <div className="onb-activity-text">
                      <strong>{item.profile.full_name?.split(' ')[0] || 'Someone'}</strong>
                      {' '}is going to{' '}
                      <span className="onb-activity-event">{item.eventTitle}</span>
                    </div>
                    <span className="onb-activity-age">{timeAgo(item.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                <div className="onb-comm-num">{allProfiles.length > 0 ? `${allProfiles.length}+` : '47+'}</div>
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
