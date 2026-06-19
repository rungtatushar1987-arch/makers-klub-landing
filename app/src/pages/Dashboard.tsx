import { useUser } from '@clerk/clerk-react'
import { useKlub } from '../KlubContext'
import { type Event, getInitials, getAvatarColor, AVATAR_COLORS } from '../supabase'
import Onboarding from './Onboarding'

// Avatar color map from design tokens — cycles through brand palette
const AV_COLORS = [
  { bg: '#fcb813', fg: '#0a1340' },  // yellow
  { bg: '#7a4ed8', fg: '#ffffff' },  // violet
  { bg: '#3b6dd9', fg: '#ffffff' },  // blue
  { bg: '#0a1340', fg: '#ffffff' },  // navy
  { bg: '#a587f0', fg: '#0a1340' },  // soft violet
]
function avColor(i: number) { return AV_COLORS[i % AV_COLORS.length] }

export default function Dashboard() {
  const { user } = useUser()
  const { connections, events, rsvpd, loading, clearTag } = useKlub()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const firstName = user?.firstName || 'there'
  const now = new Date()

  const upcoming = events.filter(e => new Date(e.date) >= now)
  const attended = events.filter(e => new Date(e.date) < now && rsvpd.has(e.id))
  const eventsAttended = new Set(connections.map(c => c.event_name).filter(Boolean)).size
  const registeredUpcoming = upcoming.filter(e => rsvpd.has(e.id))
  const recommendedUpcoming = upcoming.filter(e => !rsvpd.has(e.id))
  const pendingConnections = connections.filter(c => c.action_tags?.length > 0)

  if (loading) return (
    <div className="mkw-loading" style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-display)' }}>
      Loading…
    </div>
  )

  const isOnboarding = connections.length === 0 && attended.length === 0
  if (isOnboarding) return (
    <div className="mkw-main-body mkw-main-body--onboarding" style={{ padding: '0 36px 64px 40px' }}>
      <Onboarding />
    </div>
  )

  // ── Event row component ──
  const EventRow = ({ event, compact = false }: { event: Event, compact?: boolean }) => {
    const going = rsvpd.has(event.id)
    const isPast = new Date(event.date) < now
    const day = new Date(event.date).getDate()
    const mon = new Date(event.date).toLocaleString('en', { month: 'short' }).toUpperCase()
    const time = new Date(event.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })

    return (
      <div className="mkw-row" style={{ opacity: isPast ? 0.55 : 1 }}>
        {/* Date block */}
        <div style={{
          width: compact ? 40 : 44, height: compact ? 44 : 48,
          borderRadius: 10, flexShrink: 0,
          background: isPast ? 'rgba(12,19,48,0.06)' : 'var(--mk-navy)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: compact ? 15 : 17, lineHeight: 1,
            color: isPast ? 'var(--ink-3)' : '#fff',
          }}>{day}</div>
          <div style={{
            fontSize: 7, letterSpacing: 1.2, fontWeight: 700,
            color: isPast ? 'var(--ink-3)' : 'var(--mk-yellow)', marginTop: 2,
          }}>{mon}</div>
        </div>

        <div className="mkw-row-main">
          <div className="mkw-row-name" style={{ fontSize: compact ? 13 : 14 }}>
            {event.title}
            {going && <span className="mkw-chip-tag green">Going</span>}
          </div>
          <div className="mkw-row-meta">
            {event.location}{!isPast && ` · ${time}`}
          </div>
        </div>


      </div>
    )
  }

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
        <div className="mkw-home-grid">

          {/* ── LEFT COLUMN ── */}
          <div className="mkw-home-left">

            {/* Hero match card — violet→blue gradient */}
            <HeroMatchCard
              connections={connections}
              eventsAttended={eventsAttended}
              pendingCount={pendingConnections.length}
            />

            {/* Stats */}
            <div className="mkw-stats">
              <div className="mkw-stat">
                <div className="lbl">Connections</div>
                <div className="num">{connections.length}</div>
                <div className="delta">People you've met</div>
              </div>
              <div className="mkw-stat">
                <div className="lbl">Events</div>
                <div className="num">{eventsAttended}</div>
                <div className="delta">Sessions attended</div>
              </div>
              <div className="mkw-stat">
                <div className="lbl">Follow-ups</div>
                <div className="num" style={{ color: pendingConnections.length > 0 ? 'var(--mk-yellow-deep)' : undefined }}>
                  {pendingConnections.length}
                </div>
                <div className="delta">{pendingConnections.length > 0 ? 'Waiting' : 'All clear'}</div>
              </div>
            </div>

            {/* Recent connections */}
            <div className="mkw-card">
              <div className="mkw-h3">
                <span>Recent connections</span>
                <a href="/network">See all →</a>
              </div>
              {connections.length === 0 ? (
                <div style={{ padding: '16px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: 'var(--ink-3)', marginBottom: 12, fontFamily: 'var(--font-body)' }}>
                    No connections yet. Come to an event.
                  </p>
                  <a href="/events" className="mk-btn mk-btn-navy mk-btn-sm">See events →</a>
                </div>
              ) : (
                <div className="mkw-rows">
                  {connections.slice(0, 5).map((conn, i) => {
                    const av = avColor(i)
                    return (
                      <div key={conn.id} className="mkw-row">
                        <div className="mkw-row-av" style={{ background: av.bg, color: av.fg }}>
                          {getInitials(conn.profile?.full_name)}
                        </div>
                        <div className="mkw-row-main">
                          <div className="mkw-row-name">{conn.profile?.full_name || 'Member'}</div>
                          <div className="mkw-row-meta">
                            {conn.profile?.role_category
                              ? conn.profile.role_category.charAt(0).toUpperCase() + conn.profile.role_category.slice(1)
                              : ''}
                            {conn.event_name ? ` · ${conn.event_name}` : ''}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--ink-3)', flexShrink: 0, fontFamily: 'var(--font-body)' }}>
                          {new Date(conn.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Pending follow-ups */}
            {pendingConnections.length > 0 && (
              <div className="mkw-card">
                <div className="mkw-h3">
                  <span>Pending follow-ups</span>
                  <span style={{ fontSize: 11, color: 'var(--mk-yellow-deep)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                    {pendingConnections.length} waiting
                  </span>
                </div>
                <div className="mkw-rows">
                  {pendingConnections.map((conn, i) => {
                    const av = avColor(i)
                    return (
                      <div key={conn.id} className="mkw-row">
                        <div className="mkw-row-av" style={{ background: av.bg, color: av.fg }}>
                          {getInitials(conn.profile?.full_name)}
                        </div>
                        <div className="mkw-row-main">
                          <div className="mkw-row-name">{conn.profile?.full_name || 'Member'}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5 }}>
                            {conn.action_tags.map(tag => (
                              <span key={tag} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4,
                                background: 'rgba(252,184,19,0.18)', color: 'var(--mk-yellow-deep)',
                                fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                                padding: '3px 10px', borderRadius: 999,
                              }}>
                                {tag}
                                <button
                                  onClick={() => clearTag(conn, tag)}
                                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mk-yellow-deep)', fontSize: 13, padding: 0, lineHeight: 1, opacity: 0.7 }}
                                >×</button>
                              </span>
                            ))}
                          </div>
                        </div>
                        {conn.profile?.linkedin_url && (
                          <a href={conn.profile.linkedin_url} target="_blank" rel="noreferrer" className="mkw-row-action">
                            LinkedIn
                          </a>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Events */}
            <div className="mkw-card">
              <div className="mkw-h3">
                <span>Events</span>
                <a href="/events">See all →</a>
              </div>

              {registeredUpcoming.length > 0 && (
                <>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: 'var(--mk-yellow-deep)', fontWeight: 700, marginBottom: 10 }}>
                    Registered
                  </div>
                  <div className="mkw-rows" style={{ marginBottom: 20 }}>
                    {registeredUpcoming.map(e => <EventRow key={e.id} event={e} />)}
                  </div>
                </>
              )}

              {recommendedUpcoming.length > 0 && (
                <>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 700, marginBottom: 10 }}>
                    Recommended
                  </div>
                  <div className="mkw-rows" style={{ marginBottom: 20 }}>
                    {recommendedUpcoming.slice(0, 3).map(e => <EventRow key={e.id} event={e} />)}
                  </div>
                </>
              )}

              {attended.length > 0 && (
                <>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 700, marginBottom: 10 }}>
                    Attended
                  </div>
                  <div className="mkw-rows">
                    {attended.map(e => <EventRow key={e.id} event={e} />)}
                  </div>
                </>
              )}

              {registeredUpcoming.length === 0 && recommendedUpcoming.length === 0 && attended.length === 0 && (
                <div style={{ padding: '16px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>No events yet.</p>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT RAIL ── */}
          <div className="mkw-home-right">
            <div className="mkw-card">
              <div className="mkw-h3" style={{ marginBottom: 16 }}>
                <span>Upcoming events</span>
              </div>
              {upcoming.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>No upcoming events.</p>
              ) : (
                <div className="mkw-rows">
                  {upcoming.map(e => <EventRow key={e.id} event={e} compact />)}
                </div>
              )}
              <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--hairline)' }}>
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
    </>
  )
}

// ── Hero match card ─────────────────────────────────────────────────────────
// Violet→blue gradient card. If the member has connections, shows a real
// avatar stack; otherwise shows placeholder state.
function HeroMatchCard({
  connections,
  eventsAttended,
  pendingCount,
}: {
  connections: ReturnType<typeof useKlub>['connections']
  eventsAttended: number
  pendingCount: number
}) {
  const month = new Date().toLocaleDateString('en', { month: 'long' }).toUpperCase()
  const hasGroup = connections.length > 0

  const stackColors = [
    { bg: '#fcb813', fg: '#0a1340' },
    { bg: '#7a4ed8', fg: '#ffffff' },
    { bg: '#3b6dd9', fg: '#ffffff' },
    { bg: '#a587f0', fg: '#0a1340' },
  ]

  // Use real connection initials if available
  const stackPeople = hasGroup
    ? connections.slice(0, 4).map((c, i) => ({
        initial: getInitials(c.profile?.full_name),
        ...stackColors[i % stackColors.length],
      }))
    : stackColors.map((c, i) => ({ initial: ['T', 'S', 'J', 'M'][i], ...c }))

  return (
    <div style={{
      borderRadius: 22, padding: '24px 24px 20px',
      position: 'relative', overflow: 'hidden', color: '#fff',
      background: 'linear-gradient(140deg, rgba(122,78,216,0.92) 0%, rgba(59,109,217,0.90) 100%)',
      boxShadow: '0 18px 44px rgba(80,60,200,0.30), inset 0 1px 0 rgba(255,255,255,0.20)',
      border: '1px solid rgba(255,255,255,0.18)',
    }}>
      {/* Yellow glow blob */}
      <div style={{
        position: 'absolute', right: -60, top: -70,
        width: 220, height: 220, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(252,184,19,0.50), transparent 70%)',
        pointerEvents: 'none',
      }} />

      {/* Eyebrow */}
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
        letterSpacing: '1.8px', textTransform: 'uppercase',
        color: 'var(--mk-yellow)', marginBottom: 10, position: 'relative',
      }}>
        {month} MATCH · GROUP OF {Math.min(stackPeople.length + 1, 4)}
      </div>

      {/* Headline */}
      <h2 style={{
        fontFamily: 'var(--font-display)', fontWeight: 700,
        fontSize: 26, lineHeight: 1.1, letterSpacing: '-0.6px',
        marginBottom: 8, position: 'relative', color: '#fff',
      }}>
        You're matched with{' '}
        <em style={{ fontStyle: 'normal', color: 'var(--mk-yellow)' }}>
          {hasGroup ? `${Math.min(connections.length, 3)} maker${connections.length > 1 ? 's' : ''}` : 'your group'}
        </em>
      </h2>

      {/* Meta */}
      <p style={{
        fontSize: 13, color: 'rgba(255,255,255,0.80)',
        marginBottom: 18, position: 'relative', fontFamily: 'var(--font-body)',
      }}>
        {hasGroup
          ? `${eventsAttended} session${eventsAttended !== 1 ? 's' : ''} attended · ${connections.length} connection${connections.length !== 1 ? 's' : ''} made`
          : 'Join your first event to meet your group.'}
      </p>

      {/* Avatar stack + CTA */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, position: 'relative' }}>
        <div style={{ display: 'flex' }}>
          {stackPeople.map((p, i) => (
            <div key={i} style={{
              width: 32, height: 32, borderRadius: '50%',
              background: p.bg, color: p.fg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
              border: '2px solid rgba(255,255,255,0.75)',
              marginLeft: i === 0 ? 0 : -8,
            }}>
              {p.initial}
            </div>
          ))}
        </div>
        <a
          href={hasGroup ? '/network' : '/events'}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 7,
            background: 'var(--mk-yellow)', color: 'var(--mk-navy)',
            padding: '10px 18px', borderRadius: 999,
            fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
            border: 'none', cursor: 'pointer', textDecoration: 'none',
            boxShadow: '0 8px 20px rgba(252,184,19,0.40)',
          }}
        >
          {hasGroup ? 'View network →' : 'See events →'}
        </a>
      </div>
    </div>
  )
}
