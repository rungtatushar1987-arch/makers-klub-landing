import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useKlub } from '../KlubContext'
import { supabase, type Event, type Profile, ACTION_TAGS, getInitials } from '../supabase'

// Aurora Glass avatar palette
const AV_COLORS = [
  { bg: '#fcb813', fg: '#0a1340' },
  { bg: '#7a4ed8', fg: '#ffffff' },
  { bg: '#3b6dd9', fg: '#ffffff' },
  { bg: '#0a1340', fg: '#ffffff' },
  { bg: '#a587f0', fg: '#0a1340' },
]
const av = (i: number) => AV_COLORS[i % AV_COLORS.length]

type Attendee = { clerk_user_id: string; profile?: Profile; connected: boolean }
type PendingConn = { action_tags: string[]; notes: string; remind_followup: boolean }

export default function Events() {
  const { user } = useUser()
  const { events, rsvpd, connections, addConnection, loading } = useKlub()

  const [tab, setTab]                       = useState<'upcoming' | 'recommended'>('upcoming')
  const [modalEvent, setModalEvent]         = useState<Event | null>(null)
  const [attendees, setAttendees]           = useState<Record<string, Attendee[]>>({})
  const [expandedPast, setExpandedPast]     = useState<string | null>(null)
  const [loadingPast, setLoadingPast]       = useState<string | null>(null)
  const [connectingUser, setConnectingUser] = useState<string | null>(null)
  const [editingAttendee, setEditingAttendee] = useState<string | null>(null)
  const [pendingConn, setPendingConn]       = useState<PendingConn>({ action_tags: [], notes: '', remind_followup: false })

  const myConnectionIds = new Set(connections.map(c => c.connected_clerk_user_id))
  const now = new Date()
  const upcoming      = events.filter(e => new Date(e.date) >= now)
  const past          = events.filter(e => new Date(e.date) < now).reverse()
  const recommended   = upcoming.filter(e => !rsvpd.has(e.id))
  const shown         = tab === 'upcoming' ? upcoming : recommended

  // ── Load attendees for a past event side card ──
  async function togglePastAttendees(event: Event) {
    if (expandedPast === event.id) { setExpandedPast(null); return }
    if (attendees[event.id]) { setExpandedPast(event.id); return }
    setLoadingPast(event.id)
    const { data: rsvpData } = await supabase
      .from('event_rsvps').select('clerk_user_id').eq('event_id', event.id).eq('status', 'going')
    if (rsvpData) {
      const ids = (rsvpData as { clerk_user_id: string }[])
        .map(r => r.clerk_user_id).filter(id => id !== user?.id)
      const { data: profilesData } = ids.length > 0
        ? await supabase.from('profiles').select('*').in('clerk_user_id', ids)
        : { data: [] }
      const profileMap = new Map((profilesData || []).map((p: Profile) => [p.clerk_user_id, p]))
      setAttendees(prev => ({
        ...prev,
        [event.id]: ids.map(id => ({ clerk_user_id: id, profile: profileMap.get(id), connected: myConnectionIds.has(id) }))
      }))
    }
    setLoadingPast(null)
    setExpandedPast(event.id)
  }

  // ── Connect an attendee ──
  async function connectAttendee(attendee: Attendee, eventTitle: string) {
    setConnectingUser(attendee.clerk_user_id)
    const { data } = await supabase.from('connections').insert({
      clerk_user_id: user?.id,
      connected_clerk_user_id: attendee.clerk_user_id,
      event_name: eventTitle,
      action_tags: pendingConn.action_tags,
      notes: pendingConn.notes,
      remind_followup: pendingConn.remind_followup
    }).select().single()
    if (data) {
      addConnection({ ...data, profile: attendee.profile })
      setAttendees(prev => {
        const updated = { ...prev }
        Object.keys(updated).forEach(eid => {
          updated[eid] = updated[eid].map(a =>
            a.clerk_user_id === attendee.clerk_user_id ? { ...a, connected: true } : a
          )
        })
        return updated
      })
    }
    setConnectingUser(null)
    setEditingAttendee(null)
    setPendingConn({ action_tags: [], notes: '', remind_followup: false })
  }

  function togglePendingTag(tag: string) {
    setPendingConn(prev => ({
      ...prev,
      action_tags: prev.action_tags.includes(tag)
        ? prev.action_tags.filter(t => t !== tag)
        : [...prev.action_tags, tag]
    }))
  }

  if (loading) return <div className="mkw-loading">Loading…</div>

  return (
    <>
      {/* ── Page head ── */}
      <div className="mkw-pagehead">
        <div>
          <div className="eyebrow">Berlin · Makers Klub</div>
          <h1>Events</h1>
          <p className="sub">Show up, meet people, grow your network.</p>
        </div>
        <div className="actions">
          <a
            href="https://luma.com/calendar/cal-GBRc6zCvxA5bqnz"
            target="_blank" rel="noreferrer"
            className="mk-btn mk-btn-primary mk-btn-sm"
          >
            Full calendar →
          </a>
        </div>
      </div>

      <div className="mkw-main-body">
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, alignItems: 'start' }}>

          {/* ── LEFT: tab list ── */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Tab switcher */}
            <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--hairline)', marginBottom: 8 }}>
              {(['upcoming', 'recommended'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                    letterSpacing: '0.3px',
                    color: tab === t ? 'var(--ink-1)' : 'var(--ink-3)',
                    padding: '10px 18px',
                    borderBottom: tab === t ? '2px solid var(--mk-navy)' : '2px solid transparent',
                    marginBottom: -1, transition: 'color 0.15s',
                  }}
                >
                  {t === 'upcoming'
                    ? `Upcoming (${upcoming.length})`
                    : `Recommended (${recommended.length})`}
                </button>
              ))}
            </div>

            {shown.length === 0 && (
              <div className="mkw-empty">
                {tab === 'upcoming' ? 'No upcoming events.' : 'No recommended events.'}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {shown.map((event) => {
                const going  = rsvpd.has(event.id)
                const day    = new Date(event.date).getDate()
                const mon    = new Date(event.date).toLocaleString('en', { month: 'short' }).toUpperCase()
                const time   = new Date(event.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
                const dateStr = new Date(event.date).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })

                return (
                  <div
                    key={event.id}
                    onClick={() => setModalEvent(event)}
                    style={{
                      background: 'var(--glass-bg)',
                      backdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                      WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                      border: '1px solid var(--glass-border)',
                      boxShadow: 'var(--glass-shadow), var(--glass-hi)',
                      borderRadius: 'var(--r-sm)',
                      overflow: 'hidden',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.15s, transform 0.12s',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-1px)'
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 32px rgba(10,19,64,0.12), var(--glass-hi)'
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLDivElement).style.transform = ''
                      ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--glass-shadow), var(--glass-hi)'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
                      {/* Date block */}
                      <div style={{
                        width: 50, height: 54, borderRadius: 10, flexShrink: 0,
                        background: 'var(--mk-navy)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, lineHeight: 1, color: '#fff' }}>
                          {day}
                        </div>
                        <div style={{ fontSize: 8, letterSpacing: 1.4, fontWeight: 700, color: 'var(--mk-yellow)', marginTop: 2 }}>
                          {mon}
                        </div>
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                          <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink-1)' }}>
                            {event.title}
                          </span>
                          {going && <span className="mkw-chip-tag green">Going</span>}
                          {event.type && (
                            <span style={{
                              padding: '2px 9px', borderRadius: 999,
                              background: 'rgba(122,78,216,0.12)', color: 'var(--mk-violet)',
                              fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
                            }}>{event.type}</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>
                          {event.location} · {dateStr} · {time}
                        </div>
                        {event.description && (
                          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 4, fontFamily: 'var(--font-body)', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                            {event.description}
                          </div>
                        )}
                      </div>

                      {/* Chevron */}
                      <div style={{ color: 'var(--ink-3)', fontSize: 16, flexShrink: 0 }}>›</div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* ── RIGHT: past events rail ── */}
          <div style={{ minWidth: 0, display: 'flex', flexDirection: 'column', gap: 10, position: 'sticky', top: 0, alignSelf: 'start' }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1.8,
              textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 700,
              marginBottom: 12,
            }}>
              Past events
            </div>

            {past.length === 0 ? (
              <p style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>No past events yet.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {past.map((event) => {
                  const day    = new Date(event.date).getDate()
                  const mon    = new Date(event.date).toLocaleString('en', { month: 'short' }).toUpperCase()
                  const dateStr = new Date(event.date).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
                  const isExpanded = expandedPast === event.id
                  const eventAttendees = attendees[event.id] || []
                  const isLoading = loadingPast === event.id

                  return (
                    <div key={event.id} style={{
                      background: 'var(--glass-bg)',
                      backdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                      WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                      border: '1px solid var(--glass-border)',
                      boxShadow: 'var(--glass-shadow), var(--glass-hi)',
                      borderRadius: 'var(--r-sm)',
                      overflow: 'hidden',
                      opacity: 0.75,
                    }}>
                      {/* Card header */}
                      <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Date block */}
                        <div style={{
                          width: 40, height: 44, borderRadius: 8, flexShrink: 0,
                          background: 'rgba(12,19,48,0.08)',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, lineHeight: 1, color: 'var(--ink-3)' }}>{day}</div>
                          <div style={{ fontSize: 7, letterSpacing: 1.2, fontWeight: 700, color: 'var(--ink-3)', marginTop: 2 }}>{mon}</div>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--ink-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {event.title}
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-body)', marginTop: 2 }}>
                            {dateStr}
                          </div>
                        </div>
                      </div>

                      {/* Attendees toggle button */}
                      <div style={{ padding: '0 16px 14px' }}>
                        <button
                          onClick={() => togglePastAttendees(event)}
                          style={{
                            width: '100%', padding: '7px 12px',
                            background: isExpanded ? 'var(--mk-navy)' : 'rgba(12,19,48,0.06)',
                            color: isExpanded ? '#fff' : 'var(--ink-2)',
                            border: `1px solid ${isExpanded ? 'var(--mk-navy)' : 'var(--hairline-strong)'}`,
                            borderRadius: 'var(--r-sm)', cursor: 'pointer',
                            fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                            transition: 'all 0.15s',
                          }}
                        >
                          {isLoading ? 'Loading…' : isExpanded ? '▲ Hide attendees' : '👥 People who attended'}
                        </button>
                      </div>

                      {/* Attendees accordion */}
                      {isExpanded && (
                        <div style={{ borderTop: '1px solid var(--hairline)', padding: '14px 16px' }}>
                          {eventAttendees.length === 0 ? (
                            <p style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>No other attendees found.</p>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {eventAttendees.map((attendee, j) => {
                                const isEditing = editingAttendee === attendee.clerk_user_id
                                const c = av(j)
                                return (
                                  <div key={attendee.clerk_user_id}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <div style={{
                                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                                        background: c.bg, color: c.fg,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                                      }}>
                                        {getInitials(attendee.profile?.full_name)}
                                      </div>
                                      <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, color: 'var(--ink-1)' }}>
                                          {attendee.profile?.full_name || 'Member'}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>
                                          {attendee.profile?.role_category
                                            ? attendee.profile.role_category.charAt(0).toUpperCase() + attendee.profile.role_category.slice(1)
                                            : 'Maker'}
                                        </div>
                                      </div>
                                      {attendee.connected ? (
                                        <span className="mkw-chip-tag green" style={{ fontSize: 10, padding: '4px 10px' }}>Connected ✓</span>
                                      ) : isEditing ? (
                                        <button
                                          className="mkw-row-action"
                                          style={{ fontSize: 10, padding: '4px 10px' }}
                                          onClick={() => setEditingAttendee(null)}
                                        >Cancel</button>
                                      ) : (
                                        <button
                                          className="mkw-row-action primary"
                                          style={{ fontSize: 10, padding: '4px 10px' }}
                                          onClick={() => setEditingAttendee(attendee.clerk_user_id)}
                                        >Say Hi →</button>
                                      )}
                                    </div>

                                    {/* Connect form */}
                                    {isEditing && (
                                      <div style={{
                                        marginTop: 8, marginLeft: 40,
                                        background: 'var(--glass-bg)',
                                        border: '1px solid var(--glass-border)',
                                        borderRadius: 'var(--r-sm)', padding: 14,
                                        display: 'flex', flexDirection: 'column', gap: 12,
                                      }}>
                                        <textarea
                                          className="mkw-form-textarea" rows={2}
                                          placeholder="How did you meet? What did you talk about?"
                                          value={pendingConn.notes}
                                          onChange={e => setPendingConn(prev => ({ ...prev, notes: e.target.value }))}
                                          style={{ fontSize: 12 }}
                                        />
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                          {ACTION_TAGS.map(tag => {
                                            const selected = pendingConn.action_tags.includes(tag)
                                            return (
                                              <button key={tag} onClick={() => togglePendingTag(tag)} style={{
                                                padding: '5px 10px', borderRadius: 999, cursor: 'pointer',
                                                fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
                                                border: `1px solid ${selected ? 'var(--mk-navy)' : 'var(--hairline-strong)'}`,
                                                background: selected ? 'var(--mk-navy)' : 'transparent',
                                                color: selected ? '#fff' : 'var(--ink-2)',
                                                transition: 'all 0.12s',
                                              }}>{tag}</button>
                                            )
                                          })}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                                            <input type="checkbox" checked={pendingConn.remind_followup}
                                              onChange={e => setPendingConn(prev => ({ ...prev, remind_followup: e.target.checked }))}
                                              style={{ accentColor: 'var(--mk-yellow)', width: 13, height: 13 }} />
                                            Remind me
                                          </label>
                                          <button
                                            className="mk-btn mk-btn-primary mk-btn-sm"
                                            style={{ fontSize: 11, padding: '6px 12px' }}
                                            disabled={connectingUser === attendee.clerk_user_id}
                                            onClick={() => connectAttendee(attendee, event.title)}
                                          >
                                            {connectingUser === attendee.clerk_user_id ? 'Connecting…' : 'Connect →'}
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Event detail modal ── */}
      {modalEvent && (
        <EventModal
          event={modalEvent}
          going={rsvpd.has(modalEvent.id)}
          onClose={() => setModalEvent(null)}
        />
      )}
    </>
  )
}

// ── Event detail modal ────────────────────────────────────────────────────────
function EventModal({ event, going, onClose }: { event: Event; going: boolean; onClose: () => void }) {
  const dateStr  = new Date(event.date).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const time     = new Date(event.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
  const endTime  = event.end_date ? new Date(event.end_date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }) : null

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(10,19,64,0.45)',
          backdropFilter: 'blur(4px)',
          WebkitBackdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal panel */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', zIndex: 201,
        transform: 'translate(-50%, -50%)',
        width: 'min(520px, calc(100vw - 48px))',
        maxHeight: 'calc(100vh - 80px)',
        overflowY: 'auto',
        background: 'var(--surface)',
        backdropFilter: 'blur(20px) saturate(160%)',
        WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        border: '1px solid var(--glass-border)',
        borderRadius: 20,
        boxShadow: '0 32px 80px rgba(10,19,64,0.22), 0 0 0 1px rgba(255,255,255,0.5)',
        padding: 32,
      }}>
        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(12,19,48,0.08)', border: 'none',
            cursor: 'pointer', fontSize: 16, color: 'var(--ink-2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'var(--font-body)',
          }}
        >×</button>

        {/* Type badge */}
        {event.type && (
          <div style={{ marginBottom: 12 }}>
            <span style={{
              padding: '3px 11px', borderRadius: 999,
              background: 'rgba(122,78,216,0.12)', color: 'var(--mk-violet)',
              fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
            }}>{event.type}</span>
            {going && <span className="mkw-chip-tag green" style={{ marginLeft: 8 }}>Going</span>}
          </div>
        )}

        {/* Title */}
        <h2 style={{
          fontFamily: 'var(--font-display)', fontWeight: 800,
          fontSize: 24, letterSpacing: '-0.4px', lineHeight: 1.2,
          color: 'var(--ink-1)', marginBottom: 20,
        }}>{event.title}</h2>

        {/* Meta rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8, background: 'var(--mk-navy)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
            }}>📅</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{dateStr}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>
                {time}{endTime ? ` – ${endTime}` : ''}
              </div>
            </div>
          </div>

          {event.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 8, background: 'rgba(122,78,216,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0,
              }}>📍</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{event.location}</div>
                {event.address && (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>{event.address}</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Description */}
        {event.description && (
          <div style={{ marginBottom: 28 }}>
            <div style={{
              fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
              letterSpacing: 1.6, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10,
            }}>About this event</div>
            <p style={{
              fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7,
              fontFamily: 'var(--font-body)',
            }}>{event.description}</p>
          </div>
        )}

        {/* CTA */}
        <a
          href={event.luma_url || 'https://luma.com/calendar/cal-GBRc6zCvxA5bqnz'}
          target="_blank" rel="noreferrer"
          className="mk-btn mk-btn-primary"
          style={{ width: '100%', justifyContent: 'center' }}
        >
          Book on Luma →
        </a>
      </div>
    </>
  )
}
