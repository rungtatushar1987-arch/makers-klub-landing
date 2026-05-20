import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { supabase, type Event, type Profile, ACTION_TAGS, getInitials, getAvatarColor } from '../supabase'

type Attendee = {
  clerk_user_id: string
  profile?: Profile
  connected: boolean
}

type Connection = {
  id: string
  connected_clerk_user_id: string
  event_name: string
  notes: string
  action_tags: string[]
  remind_followup: boolean
}

export default function Events() {
  const { user } = useUser()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const [events, setEvents] = useState<Event[]>([])
  const [rsvpd, setRsvpd] = useState<Set<string>>(new Set())
  const [myConnectionIds, setMyConnectionIds] = useState<Set<string>>(new Set())
  const [attendees, setAttendees] = useState<Record<string, Attendee[]>>({})
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [connectingUser, setConnectingUser] = useState<string | null>(null)

  // Connection edit state
  const [editingAttendee, setEditingAttendee] = useState<string | null>(null)
  const [pendingConn, setPendingConn] = useState<Partial<Connection>>({})
  const [savingConn, setSavingConn] = useState(false)

  const now = new Date()
  const upcoming = events.filter(e => new Date(e.date) >= now)
  const past = events.filter(e => new Date(e.date) < now).reverse()
  const shown = tab === 'upcoming' ? upcoming : past

  useEffect(() => {
    async function load() {
      const [{ data: eventsData }, { data: rsvpData }, { data: connsData }] = await Promise.all([
        supabase.from('events').select('*').order('date'),
        supabase.from('event_rsvps').select('event_id').eq('clerk_user_id', user?.id),
        supabase.from('connections').select('connected_clerk_user_id').eq('clerk_user_id', user?.id)
      ])
      if (eventsData) setEvents(eventsData)
      if (rsvpData) setRsvpd(new Set(rsvpData.map((r: { event_id: string }) => r.event_id)))
      if (connsData) setMyConnectionIds(new Set(connsData.map((c: { connected_clerk_user_id: string }) => c.connected_clerk_user_id)))
      setLoading(false)
    }
    if (user) load()
  }, [user])

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
      [event.id]: ids.map(id => ({
        clerk_user_id: id,
        profile: profileMap.get(id),
        connected: myConnectionIds.has(id)
      }))
    }))
    setExpandedEvent(event.id)
  }

  async function connectAttendee(attendee: Attendee, eventTitle: string) {
    setConnectingUser(attendee.clerk_user_id)
    const { data } = await supabase.from('connections').insert({
      clerk_user_id: user?.id,
      connected_clerk_user_id: attendee.clerk_user_id,
      event_name: eventTitle,
      action_tags: pendingConn.action_tags || [],
      notes: pendingConn.notes || '',
      remind_followup: pendingConn.remind_followup || false
    }).select().single()

    if (data) {
      setMyConnectionIds(prev => new Set([...prev, attendee.clerk_user_id]))
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
    setPendingConn({})
  }

  function startConnect(attendee: Attendee) {
    setEditingAttendee(attendee.clerk_user_id)
    setPendingConn({ action_tags: [], notes: '', remind_followup: false })
  }

  function togglePendingTag(tag: string) {
    setPendingConn(prev => {
      const tags = prev.action_tags || []
      return {
        ...prev,
        action_tags: tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]
      }
    })
  }

  if (loading) return <div className="mkw-loading">Loading…</div>

  return (
    <div>
      <div className="mkw-pagehead">
        <div>
          <div className="eyebrow">Berlin · Makers Klub</div>
          <h1>Events</h1>
          <p className="sub">Show up, meet people, grow your network.</p>
        </div>
        <div className="actions">
          <a
            href="https://luma.com/calendar/cal-GBRc6zCvxA5bqnz"
            target="_blank"
            rel="noreferrer"
            className="mk-btn mk-btn-ochre"
          >
            Full calendar →
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid var(--border-1)', marginBottom: 24 }}>
        {(['upcoming', 'past'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
              color: tab === t ? 'var(--mk-navy)' : 'var(--fg-3)',
              padding: '10px 16px',
              borderBottom: tab === t ? '2px solid var(--mk-navy)' : '2px solid transparent',
              marginBottom: -1, transition: 'color 0.12s',
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {shown.map((event) => {
          const going = rsvpd.has(event.id)
          const expanded = expandedEvent === event.id
          const isPast = new Date(event.date) < now
          const eventAttendees = attendees[event.id] || []

          return (
            <div key={event.id} style={{
              background: 'var(--mk-white)',
              border: '1px solid var(--border-1)',
              borderRadius: 14, overflow: 'hidden'
            }}>
              {/* Event row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 22px' }}>
                {/* Date block */}
                <div style={{
                  width: 52, height: 56, borderRadius: 10, flexShrink: 0,
                  background: isPast ? 'var(--mk-cream-2)' : 'var(--mk-navy)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, lineHeight: 1, color: isPast ? 'var(--fg-3)' : '#fff' }}>
                    {new Date(event.date).getDate()}
                  </div>
                  <div style={{ fontSize: 9, letterSpacing: 1.5, fontWeight: 700, color: isPast ? 'var(--fg-3)' : 'var(--mk-ochre)', marginTop: 2 }}>
                    {new Date(event.date).toLocaleString('en', { month: 'short' }).toUpperCase()}
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: isPast ? 'var(--fg-2)' : 'var(--mk-navy)' }}>
                      {event.title}
                    </span>
                    {going && <span className="mkw-tag green">Going</span>}
                    {event.type && <span className="mkw-tag muted">{event.type}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)' }}>
                    {event.location} · {new Date(event.date).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(event.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })}
                  </div>
                  {event.description && (
                    <div style={{ fontSize: 13, color: 'var(--fg-2)', marginTop: 4, lineHeight: 1.5 }}>{event.description}</div>
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
                      className={`mkw-row-action ${going ? '' : 'primary'}`}
                      onClick={() => toggleRsvp(event)}
                      style={going ? { color: '#1e7a3f' } : {}}
                    >
                      {going ? '✓ Going' : 'RSVP →'}
                    </button>
                  )}
                </div>
              </div>

              {/* Attendee list */}
              {expanded && (
                <div style={{ borderTop: '1px solid var(--border-1)', padding: '20px 22px' }}>
                  <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 16 }}>
                    People at this event · {eventAttendees.length}
                  </p>

                  {eventAttendees.length === 0 ? (
                    <p style={{ fontSize: 13, color: 'var(--fg-3)' }}>No other attendees found.</p>
                  ) : (
                    <div className="mkw-rows">
                      {eventAttendees.map((attendee, j) => {
                        const isEditing = editingAttendee === attendee.clerk_user_id
                        return (
                          <div key={attendee.clerk_user_id}>
                            <div className="mkw-row">
                              <div className="mkw-row-av" style={{ background: getAvatarColor(j), color: j === 2 ? '#fff' : '#0f1e3d' }}>
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
                                <span className="mkw-tag green" style={{ padding: '7px 14px', fontSize: 12 }}>Connected ✓</span>
                              ) : isEditing ? (
                                <button className="mkw-row-action" onClick={() => { setEditingAttendee(null); setPendingConn({}) }}>
                                  Cancel
                                </button>
                              ) : (
                                <button className="mkw-row-action primary" onClick={() => startConnect(attendee)}>
                                  Say Hi →
                                </button>
                              )}
                            </div>

                            {/* Inline connect panel */}
                            {isEditing && (
                              <div style={{
                                margin: '4px 0 12px 56px',
                                background: 'var(--mk-cream)',
                                border: '1px solid var(--border-1)',
                                borderRadius: 12, padding: 18,
                                display: 'flex', flexDirection: 'column', gap: 14
                              }}>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 8 }}>Note</div>
                                  <textarea
                                    className="mkw-form-textarea"
                                    rows={2}
                                    placeholder="How did you meet? What did you talk about?"
                                    value={pendingConn.notes || ''}
                                    onChange={e => setPendingConn(prev => ({ ...prev, notes: e.target.value }))}
                                    style={{ fontSize: 13 }}
                                  />
                                </div>
                                <div>
                                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 8 }}>Action items</div>
                                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {ACTION_TAGS.map(tag => {
                                      const selected = (pendingConn.action_tags || []).includes(tag)
                                      return (
                                        <button
                                          key={tag}
                                          onClick={() => togglePendingTag(tag)}
                                          style={{
                                            padding: '7px 14px', borderRadius: 999,
                                            border: `1.5px solid ${selected ? 'var(--mk-navy)' : 'var(--border-1)'}`,
                                            background: selected ? 'var(--mk-navy)' : 'var(--mk-white)',
                                            color: selected ? '#fff' : 'var(--fg-2)',
                                            fontSize: 12, fontWeight: 500, cursor: 'pointer',
                                            fontFamily: 'var(--font-body)', transition: 'all 0.12s'
                                          }}
                                        >
                                          {tag}
                                        </button>
                                      )
                                    })}
                                  </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg-2)', cursor: 'pointer', fontWeight: 500 }}>
                                    <input
                                      type="checkbox"
                                      checked={pendingConn.remind_followup || false}
                                      onChange={e => setPendingConn(prev => ({ ...prev, remind_followup: e.target.checked }))}
                                      style={{ accentColor: 'var(--mk-ochre)', width: 15, height: 15 }}
                                    />
                                    Remind me to follow up
                                  </label>
                                  <button
                                    className="mk-btn mk-btn-ochre mk-btn-sm"
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
  )
}
