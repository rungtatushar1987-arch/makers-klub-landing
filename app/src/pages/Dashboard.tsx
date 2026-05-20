import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { supabase, type Event, type Profile, ACTION_TAGS, getInitials, getAvatarColor } from '../supabase'

type Connection = {
  id: string
  connected_clerk_user_id: string
  event_name: string
  notes: string
  action_tags: string[]
  remind_followup: boolean
  created_at: string
  profile?: Profile
}

export default function Dashboard() {
  const { user } = useUser()
  const [connections, setConnections] = useState<Connection[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [rsvpd, setRsvpd] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [editingConn, setEditingConn] = useState<string | null>(null)
  const [savingConn, setSavingConn] = useState<string | null>(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const firstName = user?.firstName || 'there'
  const now = new Date()

  const upcoming = events.filter(e => new Date(e.date) >= now)
  const attended = events.filter(e => new Date(e.date) < now && rsvpd.has(e.id))
  const registeredUpcoming = upcoming.filter(e => rsvpd.has(e.id))
  const recommendedUpcoming = upcoming.filter(e => !rsvpd.has(e.id))
  const pendingConnections = connections.filter(c => c.action_tags?.length > 0)

  useEffect(() => {
    async function load() {
      const [{ data: connsData }, { data: eventsData }, { data: rsvpData }] = await Promise.all([
        supabase.from('connections').select('*').eq('clerk_user_id', user?.id).order('created_at', { ascending: false }),
        supabase.from('events').select('*').order('date'),
        supabase.from('event_rsvps').select('event_id').eq('clerk_user_id', user?.id)
      ])

      if (eventsData) setEvents(eventsData)
      if (rsvpData) setRsvpd(new Set(rsvpData.map((r: { event_id: string }) => r.event_id)))

      if (connsData) {
        const ids = connsData.map((c: Connection) => c.connected_clerk_user_id)
        if (ids.length > 0) {
          const { data: profilesData } = await supabase.from('profiles').select('*').in('clerk_user_id', ids)
          const profileMap = new Map((profilesData || []).map((p: Profile) => [p.clerk_user_id, p]))
          setConnections(connsData.map((c: Connection) => ({
            ...c,
            action_tags: c.action_tags || [],
            remind_followup: c.remind_followup || false,
            profile: profileMap.get(c.connected_clerk_user_id)
          })))
        } else {
          setConnections([])
        }
      }
      setLoading(false)
    }
    if (user) load()
  }, [user])

  async function saveConnection(conn: Connection) {
    setSavingConn(conn.id)
    await supabase.from('connections').update({
      notes: conn.notes,
      action_tags: conn.action_tags,
      remind_followup: conn.remind_followup
    }).eq('id', conn.id)
    setSavingConn(null)
    setEditingConn(null)
  }

  function updateConn(id: string, patch: Partial<Connection>) {
    setConnections(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
  }

  function toggleTag(conn: Connection, tag: string) {
    const tags = conn.action_tags.includes(tag)
      ? conn.action_tags.filter(t => t !== tag)
      : [...conn.action_tags, tag]
    updateConn(conn.id, { action_tags: tags })
  }

  async function clearTag(conn: Connection, tag: string) {
    const tags = conn.action_tags.filter(t => t !== tag)
    updateConn(conn.id, { action_tags: tags })
    await supabase.from('connections').update({ action_tags: tags }).eq('id', conn.id)
  }

  async function toggleRsvp(event: Event) {
    if (event.luma_url) { window.open(event.luma_url, '_blank'); return }
    const going = rsvpd.has(event.id)
    if (going) {
      await supabase.from('event_rsvps').delete().eq('clerk_user_id', user?.id).eq('event_id', event.id)
      setRsvpd(prev => { const s = new Set(prev); s.delete(event.id); return s })
    } else {
      await supabase.from('event_rsvps').insert({ clerk_user_id: user?.id, event_id: event.id, status: 'going' })
      setRsvpd(prev => new Set([...prev, event.id]))
    }
  }

  if (loading) return <div className="mkw-loading">Loading…</div>

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
          <a href="/app/profile" className="mk-btn mk-btn-ghost">My brief</a>
        </div>
      </div>

      <div className="mkw-home-grid">
        <div className="mkw-home-left">

          {/* 1. Stats bar */}
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

          {/* 2. Recent connections */}
          <div className="mkw-card">
            <div className="mkw-h3">
              <span>Recent connections</span>
              <a href="/app/network">See all →</a>
            </div>
            {connections.length === 0 ? (
              <div style={{ padding: '20px 0', textAlign: 'center' }}>
                <p style={{ fontSize: 14, color: 'var(--fg-3)', marginBottom: 12 }}>No connections yet. Come to an event.</p>
                <a href="/app/events" className="mk-btn mk-btn-navy mk-btn-sm">See events →</a>
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

          {/* 3. Pending actions */}
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

          {/* 4. Events attended */}
          <div className="mkw-card">
            <div className="mkw-h3">
              <span>Events</span>
              <a href="/app/events">See all →</a>
            </div>

            {/* Registered upcoming */}
            {registeredUpcoming.length > 0 && (
              <>
                <div style={{ fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: 'var(--mk-ochre)', fontWeight: 700, marginBottom: 10 }}>
                  Registered
                </div>
                <div className="mkw-rows" style={{ marginBottom: 20 }}>
                  {registeredUpcoming.map(event => <EventRow key={event.id} event={event} />)}
                </div>
              </>
            )}

            {/* Recommended upcoming */}
            {recommendedUpcoming.length > 0 && (
              <>
                <div style={{ fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: 'var(--fg-3)', fontWeight: 700, marginBottom: 10 }}>
                  Recommended
                </div>
                <div className="mkw-rows" style={{ marginBottom: 20 }}>
                  {recommendedUpcoming.slice(0, 3).map(event => <EventRow key={event.id} event={event} />)}
                </div>
              </>
            )}

            {/* Attended past */}
            {attended.length > 0 && (
              <>
                <div style={{ fontSize: 10, letterSpacing: 1.8, textTransform: 'uppercase', color: 'var(--fg-3)', fontWeight: 700, marginBottom: 10 }}>
                  Attended
                </div>
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

        {/* Right column — all upcoming MK events */}
        <div className="mkw-home-right">
          <div className="mkw-card mkw-card-cream" style={{ position: 'sticky', top: 28 }}>
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
