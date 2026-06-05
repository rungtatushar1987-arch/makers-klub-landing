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
  const { events, rsvpd, toggleRsvp, connections, addConnection, loading } = useKlub()

  const [tab, setTab]                     = useState<'upcoming' | 'past'>('upcoming')
  const [attendees, setAttendees]         = useState<Record<string, Attendee[]>>({})
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  const [connectingUser, setConnectingUser] = useState<string | null>(null)
  const [editingAttendee, setEditingAttendee] = useState<string | null>(null)
  const [pendingConn, setPendingConn]     = useState<PendingConn>({ action_tags: [], notes: '', remind_followup: false })

  const myConnectionIds = new Set(connections.map(c => c.connected_clerk_user_id))
  const now = new Date()
  const upcoming = events.filter(e => new Date(e.date) >= now)
  const past     = events.filter(e => new Date(e.date) < now).reverse()
  const shown    = tab === 'upcoming' ? upcoming : past

  async function loadAttendees(event: Event) {
    if (expandedEvent === event.id) { setExpandedEvent(null); return }
    if (attendees[event.id]) { setExpandedEvent(event.id); return }
    const { data: rsvpData } = await supabase
      .from('event_rsvps').select('clerk_user_id').eq('event_id', event.id).eq('status', 'going')
    if (!rsvpData) return
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
    setExpandedEvent(event.id)
  }

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

        {/* ── Tab switcher ── */}
        <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--hairline)', marginBottom: 24 }}>
          {(['upcoming', 'past'] as const).map(t => (
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
              {t === 'upcoming' ? `Upcoming (${upcoming.length})` : `Past (${past.length})`}
            </button>
          ))}
        </div>

        {shown.length === 0 && (
          <div className="mkw-empty">
            {tab === 'upcoming' ? 'No upcoming events.' : 'No past events yet.'}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shown.map((event) => {
            const going    = rsvpd.has(event.id)
            const expanded = expandedEvent === event.id
            const isPast   = new Date(event.date) < now
            const eventAttendees = attendees[event.id] || []
            const day = new Date(event.date).getDate()
            const mon = new Date(event.date).toLocaleString('en', { month: 'short' }).toUpperCase()
            const time = new Date(event.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
            const dateStr = new Date(event.date).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })

            return (
              <div key={event.id} style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                border: '1px solid var(--glass-border)',
                boxShadow: 'var(--glass-shadow), var(--glass-hi)',
                borderRadius: 'var(--r-sm)',
                overflow: 'hidden',
                opacity: isPast ? 0.7 : 1,
              }}>
                {/* ── Event row ── */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 20px' }}>
                  {/* Date block */}
                  <div style={{
                    width: 50, height: 54, borderRadius: 10, flexShrink: 0,
                    background: isPast ? 'rgba(12,19,48,0.08)' : 'var(--mk-navy)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, lineHeight: 1, color: isPast ? 'var(--ink-3)' : '#fff' }}>
                      {day}
                    </div>
                    <div style={{ fontSize: 8, letterSpacing: 1.4, fontWeight: 700, color: isPast ? 'var(--ink-3)' : 'var(--mk-yellow)', marginTop: 2 }}>
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
                      {event.location} · {dateStr}{!isPast && ` · ${time}`}
                    </div>
                    {event.description && (
                      <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 5, lineHeight: 1.5, fontFamily: 'var(--font-body)' }}>
                        {event.description}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {isPast && (
                      <button className="mkw-row-action" onClick={() => loadAttendees(event)}>
                        {expanded ? 'Hide' : 'Who was there →'}
                      </button>
                    )}
                    {!isPast && (
                      <button
                        className={`mkw-row-action${going ? '' : ' primary'}`}
                        onClick={() => toggleRsvp(event)}
                      >
                        {going ? '✓ Going' : 'RSVP →'}
                      </button>
                    )}
                  </div>
                </div>

                {/* ── Attendees panel ── */}
                {expanded && (
                  <div style={{ borderTop: '1px solid var(--hairline)', padding: '18px 20px' }}>
                    <div style={{
                      fontFamily: 'var(--font-display)', fontSize: 10, letterSpacing: 1.8,
                      textTransform: 'uppercase', color: 'var(--ink-3)', fontWeight: 700, marginBottom: 14,
                    }}>
                      People at this event · {eventAttendees.length}
                    </div>

                    {eventAttendees.length === 0 ? (
                      <p style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>No other attendees found.</p>
                    ) : (
                      <div className="mkw-rows">
                        {eventAttendees.map((attendee, j) => {
                          const isEditing = editingAttendee === attendee.clerk_user_id
                          const c = av(j)
                          return (
                            <div key={attendee.clerk_user_id}>
                              <div className="mkw-row">
                                <div className="mkw-row-av" style={{ background: c.bg, color: c.fg }}>
                                  {getInitials(attendee.profile?.full_name)}
                                </div>
                                <div className="mkw-row-main">
                                  <div className="mkw-row-name">{attendee.profile?.full_name || 'Member'}</div>
                                  <div className="mkw-row-meta">
                                    {attendee.profile?.role_category
                                      ? attendee.profile.role_category.charAt(0).toUpperCase() + attendee.profile.role_category.slice(1)
                                      : 'Maker'}
                                    {attendee.profile?.bio ? ` · ${attendee.profile.bio}` : ''}
                                  </div>
                                </div>
                                {attendee.profile?.linkedin_url && (
                                  <a href={attendee.profile.linkedin_url} target="_blank" rel="noreferrer" className="mkw-row-action">LinkedIn</a>
                                )}
                                {attendee.connected ? (
                                  <span className="mkw-chip-tag green" style={{ padding: '7px 14px', fontSize: 12 }}>Connected ✓</span>
                                ) : isEditing ? (
                                  <button className="mkw-row-action" onClick={() => setEditingAttendee(null)}>Cancel</button>
                                ) : (
                                  <button className="mkw-row-action primary" onClick={() => setEditingAttendee(attendee.clerk_user_id)}>Say Hi →</button>
                                )}
                              </div>

                              {/* ── Connect form ── */}
                              {isEditing && (
                                <div style={{
                                  margin: '4px 0 10px 56px',
                                  background: 'var(--glass-bg)',
                                  backdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                                  WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                                  border: '1px solid var(--glass-border)',
                                  boxShadow: 'var(--glass-shadow), var(--glass-hi)',
                                  borderRadius: 'var(--r-sm)',
                                  padding: 18,
                                  display: 'flex', flexDirection: 'column', gap: 14,
                                }}>
                                  <div>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Note</div>
                                    <textarea
                                      className="mkw-form-textarea" rows={2}
                                      placeholder="How did you meet? What did you talk about?"
                                      value={pendingConn.notes}
                                      onChange={e => setPendingConn(prev => ({ ...prev, notes: e.target.value }))}
                                      style={{ fontSize: 13 }}
                                    />
                                  </div>
                                  <div>
                                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Action items</div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                      {ACTION_TAGS.map(tag => {
                                        const selected = pendingConn.action_tags.includes(tag)
                                        return (
                                          <button key={tag} onClick={() => togglePendingTag(tag)} style={{
                                            padding: '7px 14px', borderRadius: 999, cursor: 'pointer',
                                            fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
                                            border: `1px solid ${selected ? 'var(--mk-navy)' : 'var(--hairline-strong)'}`,
                                            background: selected ? 'var(--mk-navy)' : 'transparent',
                                            color: selected ? '#fff' : 'var(--ink-2)',
                                            transition: 'all 0.12s',
                                          }}>{tag}</button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                                      <input type="checkbox" checked={pendingConn.remind_followup}
                                        onChange={e => setPendingConn(prev => ({ ...prev, remind_followup: e.target.checked }))}
                                        style={{ accentColor: 'var(--mk-yellow)', width: 15, height: 15 }} />
                                      Remind me to follow up
                                    </label>
                                    <button
                                      className="mk-btn mk-btn-primary mk-btn-sm"
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
      </div>
    </>
  )
}
