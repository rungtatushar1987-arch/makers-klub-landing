import { useUser } from '@clerk/clerk-react'
import { useKlub } from '../KlubContext'
import { type Event, ACTION_TAGS, getInitials, getAvatarColor } from '../supabase'
import Onboarding from './Onboarding'

export default function Dashboard() {
  const { user } = useUser()
  const { connections, events, rsvpd, loading, toggleRsvp, clearTag } = useKlub()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const firstName = user?.firstName || 'there'
  const now = new Date()

  const upcoming = events.filter(e => new Date(e.date) >= now)
  const attended = events.filter(e => new Date(e.date) < now && rsvpd.has(e.id))
  const registeredUpcoming = upcoming.filter(e => rsvpd.has(e.id))
  const recommendedUpcoming = upcoming.filter(e => !rsvpd.has(e.id))
  const pendingConnections = connections.filter(c => c.action_tags?.length > 0)

  if (loading) return <div className="mkw-loading">Loading…</div>

  const isOnboarding = connections.length === 0 && attended.length === 0
  if (isOnboarding) return <Onboarding />

  const EventRow = ({ event, dim = false }: { event: Event, dim?: boolean }) => {
    const going = rsvpd.has(event.id)
    const isPast = new Date(event.date) < now
    return (
      <div className="mkw-row" style={{ opacity: dim ? 0.6 : 1 }}>
        <div style={{
          width: 44, height: 48, borderRadius: 10, flexShrink: 0,
          background: isPast ? 'var(--mk-cream-2)' : 'var(--mk-navy)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
        }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, lineHeight: 1, color: isPast ? 'var(--fg-3)' : '#fff' }}>
            {new Date(event.date).getDate()}
          </div>
          <div style={{ fontSize: 8, letterSpacing: 1.2, fontWeight: 700, color: isPast ? 'var(--fg-3)' : 'var(--mk-ochre)', marginTop: 2 }}>
            {new Date(event.date).toLocaleString('en', { month: 'short' }).toUpperCase()}
          </div>
        </div>
        <div className="mkw-row-main">
          <div className="mkw-row-name">
            {event.title}
            {going && <span className="mkw-tag green">Going</span>}
          </div>
          <div className="mkw-row-meta">
            {event.location} · {new Date(event.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
        </div>
        {!isPast && (
          <button
            className={`mkw-row-action ${going ? '' : 'primary'}`}
            onClick={() => toggleRsvp(event)}
          >
            {going ? '✓ Going' : 'RSVP →'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="mkw-pagehead">
        <div>
          <div className="eyebrow">{new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })}</div>
          <h1>Good {greeting}, <em>{firstName}.</em></h1>
        </div>
        <div className="actions">
          <a href="/profile" className="mk-btn mk-btn-ghost">My brief</a>
        </div>
      </div>

      <div className="mkw-home-grid">
        <div className="mkw-home-left">

          <div className="mkw-stats">
            <div className="mkw-stat">
              <div className="lbl">Connections</div>
              <div className="num">{connections.length}</div>
              <div className="delta">People you've met</div>
            </div>
            <div className="mkw-stat">
              <div className="lbl">Events attended</div>
              <div className="num">{attended.length}</div>
              <div className="delta">Sessions so far</div>
            </div>
            <div className="mkw-stat">
              <div className="lbl">Pending actions</div>
              <div className="num" style={{ color: pendingConnections.length > 0 ? 'var(--mk-ochre)' : undefined }}>
                {pendingConnections.length}
              </div>
              <div className="delta">{pendingConnections.length > 0 ? 'Follow-ups waiting' : 'All clear'}</div>
            </div>
          </div>

          <div className="mkw-card">
            <div className="mkw-h3">
              <span>Recent connections</span>
              <a href="/network">See all →</a>
            </div>
            {connections.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--fg-3)', marginBottom: 12 }}>No connections yet. Come to an event.</p>
                <a href="/events" className="mk-btn mk-btn-navy mk-btn-sm">See events →</a>
              </div>
            ) : (
              <div className="mkw-rows">
                {connections.slice(0, 5).map((conn, i) => (
                  <div key={conn.id} className="mkw-row">
                    <div className="mkw-row-av" style={{ background: getAvatarColor(i), color: i === 2 ? '#fff' : '#0f1e3d' }}>
                      {getInitials(conn.profile?.full_name)}
                    </div>
                    <div className="mkw-row-main">
                      <div className="mkw-row-name">{conn.profile?.full_name || 'Member'}</div>
                      <div className="mkw-row-meta">
                        {conn.profile?.role_category && `${conn.profile.role_category.charAt(0).toUpperCase() + conn.profile.role_category.slice(1)}`}
                        {conn.event_name ? ` · ${conn.event_name}` : ''}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--fg-3)', flexShrink: 0 }}>
                      {new Date(conn.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {pendingConnections.length > 0 && (
            <div className="mkw-card">
              <div className="mkw-h3">
                <span>Pending actions</span>
                <span style={{ fontSize: 11, color: 'var(--mk-ochre)', fontWeight: 700 }}>{pendingConnections.length} follow-up{pendingConnections.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="mkw-rows">
                {pendingConnections.map((conn, i) => (
                  <div key={conn.id} className="mkw-row">
                    <div className="mkw-row-av" style={{ background: getAvatarColor(i), color: i === 2 ? '#fff' : '#0f1e3d' }}>
                      {getInitials(conn.profile?.full_name)}
                    </div>
                    <div className="mkw-row-main">
                      <div className="mkw-row-name">{conn.profile?.full_name || 'Member'}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                        {conn.action_tags.map(tag => (
                          <span key={tag} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: 'rgba(244,168,51,0.15)', color: '#8a5d10',
                            fontSize: 11, fontWeight: 700, padding: '3px 10px',
                            borderRadius: 999, letterSpacing: 0.3
                          }}>
                            {tag}
                            <button
                              onClick={() => clearTag(conn, tag)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a5d10', fontSize: 13, padding: 0, lineHeight: 1, opacity: 0.7 }}
                            >×</button>
                          </span>
                        ))}
                      </div>
                    </div>
                    {conn.profile?.linkedin_url && (
                      <a href={conn.profile.linkedin_url} target="_blank" rel="noreferrer" className="mkw-row-action">LinkedIn</a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mkw-card">
            <div className="mkw-h3">
              <span>Events</span>
              <a href="/events">See all →</a>
            </div>

            {registeredUpcoming.length > 0 && (
              <>
                <div style={{ fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: 'var(--mk-ochre)', fontWeight: 700, marginBottom: 10 }}>Registered</div>
                <div className="mkw-rows" style={{ marginBottom: 20 }}>
                  {registeredUpcoming.map(event => <EventRow key={event.id} event={event} />)}
                </div>
              </>
            )}

            {recommendedUpcoming.length > 0 && (
              <>
                <div style={{ fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: 'var(--fg-3)', fontWeight: 700, marginBottom: 10 }}>Recommended</div>
                <div className="mkw-rows" style={{ marginBottom: 20 }}>
                  {recommendedUpcoming.slice(0, 3).map(event => <EventRow key={event.id} event={event} />)}
                </div>
              </>
            )}

            {attended.length > 0 && (
              <>
                <div style={{ fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: 'var(--fg-3)', fontWeight: 700, marginBottom: 10 }}>Attended</div>
                <div className="mkw-rows">
                  {attended.map(event => <EventRow key={event.id} event={event} dim />)}
                </div>
              </>
            )}

            {registeredUpcoming.length === 0 && recommendedUpcoming.length === 0 && attended.length === 0 && (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--fg-3)' }}>No events yet.</p>
              </div>
            )}
          </div>
        </div>

        <div className="mkw-home-right">
          <div className="mkw-card mkw-card-cream">
            <div className="mkw-h3" style={{ marginBottom: 16 }}>
              <span>All upcoming events</span>
            </div>
            {upcoming.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--fg-3)' }}>No upcoming events.</p>
            ) : (
              <div className="mkw-rows">
                {upcoming.map(event => {
                  const going = rsvpd.has(event.id)
                  return (
                    <div key={event.id} className="mkw-row">
                      <div style={{
                        width: 40, height: 44, borderRadius: 8, flexShrink: 0,
                        background: 'var(--mk-navy)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                      }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, lineHeight: 1, color: '#fff' }}>
                          {new Date(event.date).getDate()}
                        </div>
                        <div style={{ fontSize: 7, letterSpacing: 1.2, fontWeight: 700, color: 'var(--mk-ochre)', marginTop: 2 }}>
                          {new Date(event.date).toLocaleString('en', { month: 'short' }).toUpperCase()}
                        </div>
                      </div>
                      <div className="mkw-row-main">
                        <div className="mkw-row-name" style={{ fontSize: 13 }}>
                          {event.title}
                          {going && <span className="mkw-tag green">Going</span>}
                        </div>
                        <div className="mkw-row-meta">{event.location}</div>
                      </div>
                      <button
                        className={`mkw-row-action ${going ? '' : 'primary'}`}
                        style={{ fontSize: 11, padding: '5px 10px' }}
                        onClick={() => toggleRsvp(event)}
                      >
                        {going ? '✓' : 'RSVP'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border-1)' }}>
              <a
                href="https://luma.com/calendar/cal-GBRc6zCvxA5bqnz"
                target="_blank"
                rel="noreferrer"
                className="mk-btn mk-btn-navy mk-btn-sm"
                style={{ width: '100%', justifyContent: 'center' }}
              >
                Full calendar →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
