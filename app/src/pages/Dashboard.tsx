import { useUser } from '@clerk/clerk-react'
import { useKlub } from '../KlubContext'
import { type Event, getInitials, getAvatarColor, AVATAR_COLORS } from '../supabase'
import { CommunityStatsCard, RecommendedPeopleCard } from '../components/CommunitySidebarCards'
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
  const { connections, events, rsvpd, loading, clearTag, isOnboarding, allProfiles, totalMembers } = useKlub()

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const firstName = user?.firstName || 'there'
  const now = new Date()

  const upcoming = events.filter(e => new Date(e.date) >= now)
  const attended = events.filter(e => new Date(e.date) < now && rsvpd.has(e.id))
  const eventsAttended = new Set(connections.map(c => c.event_name).filter(Boolean)).size
  const eventsRun = events.filter(e => new Date(e.date) < now).length
  const registeredUpcoming = upcoming.filter(e => rsvpd.has(e.id))
  const recommendedUpcoming = upcoming.filter(e => !rsvpd.has(e.id))
  const pendingConnections = connections.filter(c => c.action_tags?.length > 0)
  const followUpCount = connections.filter(c => c.remind_followup).length
  const recommendedPeople = allProfiles.filter(p => p.clerk_user_id !== user?.id).slice(0, 8)

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
                <div className="num" style={{ color: followUpCount > 0 ? 'var(--mk-yellow-deep)' : undefined }}>
                  {followUpCount}
                </div>
                <div className="delta">{followUpCount > 0 ? 'Waiting' : 'All clear'}</div>
              </div>
            </div>

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

            <CommunityStatsCard totalMembers={totalMembers} eventsRun={eventsRun} />

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

            {/* Follow-ups */}
            <div className="mkw-card">
              <div className="mkw-h3">
                <span>Follow-ups</span>
                {pendingConnections.length > 0 && (
                  <span style={{ fontSize: 11, color: 'var(--mk-yellow-deep)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>
                    {pendingConnections.length} waiting
                  </span>
                )}
              </div>
              {pendingConnections.length === 0 ? (
                <div style={{ padding: '16px 0', textAlign: 'center' }}>
                  <p style={{ fontSize: 14, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>
                    No pending follow-ups — you're all caught up.
                  </p>
                </div>
              ) : (
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
              )}
            </div>

            <RecommendedPeopleCard members={recommendedPeople} />

          </div>

        </div>
      </div>
    </>
  )
}
