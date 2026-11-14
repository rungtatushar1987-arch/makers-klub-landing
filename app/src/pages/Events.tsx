import { useEffect, useState } from 'react'
import { useUser, useSession } from '@clerk/clerk-react'
import { useKlub, type RsvpStatus } from '../KlubContext'
import { getSupabaseClient, type Event, type Profile, ACTION_TAGS, getInitials } from '../supabase'
import './Events.css'

// Aurora Glass avatar palette
const AV_COLORS = [
  { bg: '#c5a059', fg: '#0a1340' },
  { bg: '#3b6dd9', fg: '#ffffff' },
  { bg: '#3b6dd9', fg: '#ffffff' },
  { bg: '#0a1340', fg: '#ffffff' },
  { bg: '#7ba0e8', fg: '#0a1340' },
]
const av = (i: number) => AV_COLORS[i % AV_COLORS.length]

type Attendee = { clerk_user_id: string; profile?: Profile; connected: boolean }
type LumaGuest = { name: string; role?: string | null; link?: string | null }
type LumaAttendance = { total: number; registered: number; checked_in: number; names: LumaGuest[] | null; names_visible: boolean }
type PendingConn = { action_tags: string[]; notes: string; remind_followup: boolean }

export default function Events() {
  const { user } = useUser()
  const { session } = useSession()
  const { events, myRsvps, allRsvps, connections, addConnection, loading } = useKlub()

  const [tab, setTab]                         = useState<'upcoming' | 'mine'>('upcoming')
  const [modalEvent, setModalEvent]           = useState<Event | null>(null)
  const [attendees, setAttendees]             = useState<Record<string, Attendee[]>>({})
  const [lumaInfo, setLumaInfo]         = useState<Record<string, LumaAttendance>>({})
  const [expandedPast, setExpandedPast]       = useState<string | null>(null)
  const [loadingPast, setLoadingPast]         = useState<string | null>(null)
  const [connectingUser, setConnectingUser]   = useState<string | null>(null)
  const [editingAttendee, setEditingAttendee] = useState<string | null>(null)
  const [pendingConn, setPendingConn]         = useState<PendingConn>({ action_tags: [], notes: '', remind_followup: false })

  const myConnectionIds = new Set(connections.map(c => c.connected_clerk_user_id))
  const now = new Date()
  const upcoming    = events.filter(e => new Date(e.date) >= now)
  const past        = events.filter(e => new Date(e.date) < now).reverse()
  const mine        = upcoming.filter(e => myRsvps[e.id] === 'going' || myRsvps[e.id] === 'waitlist')
  const shown       = tab === 'upcoming' ? upcoming : mine
  const goingCount  = (eventId: string) => allRsvps.filter(r => r.event_id === eventId && r.status === 'going').length

  async function togglePastAttendees(event: Event) {
    if (expandedPast === event.id) { setExpandedPast(null); return }
    if (attendees[event.id]) { setExpandedPast(event.id); return }
    setLoadingPast(event.id)
    const token = await session?.getToken()
    const db = getSupabaseClient(token)
    const { data: lumaData } = await db.rpc('luma_event_attendance', { p_event_id: event.id })
    if (lumaData) setLumaInfo(prev => ({ ...prev, [event.id]: lumaData as LumaAttendance }))
    const { data: rsvpData } = await db
      .from('event_rsvps').select('clerk_user_id').eq('event_id', event.id).eq('status', 'going')
    if (rsvpData) {
      const ids = (rsvpData as { clerk_user_id: string }[])
        .map(r => r.clerk_user_id).filter(id => id !== user?.id)
      const { data: profilesData } = ids.length > 0
        ? await db.from('profiles').select('*').in('clerk_user_id', ids)
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

  async function connectAttendee(attendee: Attendee, eventTitle: string, eventDate: string) {
    setConnectingUser(attendee.clerk_user_id)
    const token = await session?.getToken()
    const db = getSupabaseClient(token)
    const { data } = await db.from('connections').insert({
      clerk_user_id: user?.id,
      connected_clerk_user_id: attendee.clerk_user_id,
      event_name: eventTitle,
      event_date: eventDate,
      action_tags: pendingConn.action_tags,
      notes: pendingConn.notes,
      remind_followup: pendingConn.remind_followup,
      status: 'pending',
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
        <div className="ev-grid">

          <div className="ev-col-left">
            <div className="ev-tabs">
              {(['upcoming', 'mine'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`ev-tab${tab === t ? ' active' : ''}`}
                >
                  {t === 'upcoming'
                    ? `Upcoming (${upcoming.length})`
                    : `My events (${mine.length})`}
                </button>
              ))}
            </div>

            {shown.length === 0 && (
              <div className="mkw-empty">
                {tab === 'upcoming'
                  ? 'No upcoming events right now. New events are announced here first.'
                  : "You haven't registered for anything yet."}
              </div>
            )}

            <div className="ev-card-list">
              {shown.map((event) => {
                const status  = myRsvps[event.id] as RsvpStatus | undefined
                const taken   = goingCount(event.id)
                const spotsLeft = event.capacity ? Math.max(event.capacity - taken, 0) : null
                const day     = new Date(event.date).getDate()
                const mon     = new Date(event.date).toLocaleString('en', { month: 'short' }).toUpperCase()
                const time    = new Date(event.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
                const dateStr = new Date(event.date).toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'short' })

                return (
                  <div
                    key={event.id}
                    className="ev-card"
                    onClick={() => setModalEvent(event)}
                  >
                    <div className="ev-card-inner">
                      <div className="ev-date-block">
                        <span className="ev-day">{day}</span>
                        <span className="ev-mon">{mon}</span>
                      </div>
                      <div className="ev-card-info">
                        <div className="ev-card-title-row">
                          <span className="ev-card-title">{event.title}</span>
                          {status === 'going' && <span className="mkw-chip-tag green">Going</span>}
                          {status === 'waitlist' && <span className="mkw-chip-tag">Waitlist</span>}
                          {!status && spotsLeft === 0 && <span className="mkw-chip-tag">Full</span>}
                          {event.type && <span className="ev-type-badge">{event.type}</span>}
                        </div>
                        <div className="ev-card-meta">
                          {event.location} · {dateStr} · {time}
                          {spotsLeft !== null && spotsLeft > 0 && ` · ${spotsLeft} spot${spotsLeft === 1 ? '' : 's'} left`}
                        </div>
                      </div>
                      <span className="ev-card-chevron">›</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="ev-col-right">
            <div className="mkw-card">
              <div className="mkw-h3">
                <span>Past events</span>
              </div>

              {past.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>No past events yet.</p>
              ) : (
                <div className="mkw-rows">
                  {past.map((event) => {
                    const day        = new Date(event.date).getDate()
                    const mon        = new Date(event.date).toLocaleString('en', { month: 'short' }).toUpperCase()
                    const dateStr    = new Date(event.date).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })
                    const isExpanded     = expandedPast === event.id
                    const eventAttendees = attendees[event.id] || []
                    const isLoading      = loadingPast === event.id

                    return (
                      <div key={event.id}>
                        <div className="mkw-row" style={{ opacity: 0.65 }}>
                          <div style={{
                            width: 40, height: 44, borderRadius: 8, flexShrink: 0,
                            background: 'rgba(12,19,48,0.06)',
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, lineHeight: 1, color: 'var(--ink-3)' }}>{day}</div>
                            <div style={{ fontSize: 7, letterSpacing: 1.2, fontWeight: 700, color: 'var(--ink-3)', marginTop: 2 }}>{mon}</div>
                          </div>
                          <div className="mkw-row-main">
                            <div className="mkw-row-name" style={{ fontSize: 13 }}>{event.title}</div>
                            <div className="mkw-row-meta">{dateStr}</div>
                          </div>
                        </div>

                        <div style={{ paddingBottom: 4 }}>
                          <button
                            onClick={() => togglePastAttendees(event)}
                            className="mk-btn mk-btn-navy mk-btn-sm"
                            style={{ width: '100%', justifyContent: 'center' }}
                          >
                            {isLoading ? 'Loading…' : isExpanded ? '▲ Hide attendees' : '👥 People who attended'}
                          </button>
                        </div>

                        {isExpanded && (
                          <div className="ev-attendees-body">
                            {lumaInfo[event.id] && (
                              <p style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-display)', fontWeight: 600, margin: '0 0 10px' }}>
                                {lumaInfo[event.id].registered} registered{lumaInfo[event.id].checked_in > 0 ? ` · ${lumaInfo[event.id].checked_in} checked in` : ''}{eventAttendees.length > 0 ? ` · ${eventAttendees.length} on Makers Klub` : ''}
                              </p>
                            )}
                            {eventAttendees.length === 0 ? (
                              <p style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>
                                {lumaInfo[event.id]?.registered
                                  ? "None of them have joined Makers Klub yet. They'll show up here once they do."
                                  : 'No other attendees found.'}
                              </p>
                            ) : (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                {eventAttendees.map((attendee, j) => {
                                  const isEditing = editingAttendee === attendee.clerk_user_id
                                  const c = av(j)
                                  return (
                                    <div key={attendee.clerk_user_id}>
                                      <div className="mkw-row">
                                        <div className="mkw-row-av" style={{ background: c.bg, color: c.fg, width: 32, height: 32, borderRadius: '50%', fontSize: 11 }}>
                                          {getInitials(attendee.profile?.full_name)}
                                        </div>
                                        <div className="mkw-row-main">
                                          <div className="mkw-row-name" style={{ fontSize: 12 }}>
                                            {attendee.profile?.full_name || 'Member'}
                                          </div>
                                          <div className="mkw-row-meta">
                                            {attendee.profile?.role_category
                                              ? attendee.profile.role_category.charAt(0).toUpperCase() + attendee.profile.role_category.slice(1)
                                              : 'Maker'}
                                          </div>
                                        </div>
                                        {attendee.connected ? (
                                          <span className="mkw-chip-tag green" style={{ fontSize: 10, padding: '4px 10px' }}>Connected ✓</span>
                                        ) : isEditing ? (
                                          <button className="mkw-row-action" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => setEditingAttendee(null)}>Cancel</button>
                                        ) : (
                                          <button className="mkw-row-action primary" style={{ fontSize: 10, padding: '4px 10px' }} onClick={() => setEditingAttendee(attendee.clerk_user_id)}>Say Hi →</button>
                                        )}
                                      </div>

                                      {isEditing && (
                                        <div className="ev-connect-form">
                                          <textarea
                                            className="mkw-form-textarea"
                                            rows={2}
                                            placeholder="How did you meet? What did you talk about?"
                                            value={pendingConn.notes}
                                            onChange={e => setPendingConn(prev => ({ ...prev, notes: e.target.value }))}
                                            style={{ fontSize: 12 }}
                                          />
                                          <div className="ev-tag-row">
                                            {ACTION_TAGS.map(tag => {
                                              const selected = pendingConn.action_tags.includes(tag)
                                              return (
                                                <button key={tag} onClick={() => togglePendingTag(tag)} className={`ev-tag-btn${selected ? ' selected' : ''}`}>
                                                  {tag}
                                                </button>
                                              )
                                            })}
                                          </div>
                                          <div className="ev-connect-footer">
                                            <label className="ev-remind-label">
                                              <input
                                                type="checkbox"
                                                checked={pendingConn.remind_followup}
                                                onChange={e => setPendingConn(prev => ({ ...prev, remind_followup: e.target.checked }))}
                                                style={{ accentColor: 'var(--mk-yellow)', width: 13, height: 13 }}
                                              />
                                              Remind me
                                            </label>
                                            <button
                                              className="mk-btn mk-btn-primary mk-btn-sm"
                                              style={{ fontSize: 11, padding: '6px 12px' }}
                                              disabled={connectingUser === attendee.clerk_user_id}
                                              onClick={() => connectAttendee(attendee, event.title, event.date)}
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
                            {(lumaInfo[event.id]?.names?.length ?? 0) > 0 && (
                              <div style={{ marginTop: 12 }}>
                                <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Also on Luma</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {lumaInfo[event.id].names!.map((g, k) => {
                                    const c = av(k + 2)
                                    return (
                                      <div key={`${g.name}-${k}`} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div className="mkw-row-av" style={{ background: c.bg, color: c.fg, width: 26, height: 26, borderRadius: '50%', fontSize: 10 }}>{getInitials(g.name)}</div>
                                        <span style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, color: 'var(--ink-1)', flex: 1, minWidth: 0 }}>
                                          {g.name}
                                          {g.role && <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}> · {g.role}</span>}
                                        </span>
                                        {g.link && (
                                          <a href={g.link} target="_blank" rel="noreferrer" style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, color: 'var(--mk-violet)', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                                            {/linkedin\.com/i.test(g.link) ? 'LinkedIn ↗' : 'Website ↗'}
                                          </a>
                                        )}
                                      </div>
                                    )
                                  })}
                                </div>
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
      </div>

      {modalEvent && (
        <EventModal event={modalEvent} onClose={() => setModalEvent(null)} />
      )}
    </>
  )
}

function EventModal({ event, onClose }: { event: Event; onClose: () => void }) {
  const { user } = useUser()
  const { session } = useSession()
  const { myRsvps, allRsvps, registerForEvent, cancelRegistration } = useKlub()
  const [busy, setBusy]         = useState(false)
  const [notice, setNotice]     = useState<string | null>(null)
  const [people, setPeople]     = useState<Record<string, Profile>>({})

  const status    = myRsvps[event.id] as RsvpStatus | undefined
  const rows      = allRsvps.filter(r => r.event_id === event.id)
  const going     = rows.filter(r => r.status === 'going')
  const waitlist  = rows.filter(r => r.status === 'waitlist')
  const full      = !!event.capacity && going.length >= event.capacity
  const isPast    = new Date(event.end_date || event.date) < new Date()
  const external  = event.registration_mode === 'external'
  const waitPos   = status === 'waitlist' ? waitlist.findIndex(r => r.clerk_user_id === user?.id) + 1 : 0

  const dateStr = new Date(event.date).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const time    = new Date(event.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
  const endTime = event.end_date ? new Date(event.end_date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }) : null

  const goingKey = going.map(r => r.clerk_user_id).sort().join(',')
  useEffect(() => {
    const ids = going.map(r => r.clerk_user_id).filter(id => id !== user?.id && !people[id])
    if (ids.length === 0) return
    let cancelled = false
    ;(async () => {
      const token = await session?.getToken()
      const { data } = await getSupabaseClient(token).from('profiles').select('*').in('clerk_user_id', ids)
      if (!cancelled && data) setPeople(prev => ({ ...prev, ...Object.fromEntries((data as Profile[]).map(p => [p.clerk_user_id, p])) }))
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goingKey])

  async function handleRegister() {
    setBusy(true); setNotice(null)
    const result = await registerForEvent(event)
    if (result === 'going') setNotice("You're in. See you there!")
    else if (result === 'waitlist') setNotice("This event is full. You're on the waitlist and will move up if a spot opens.")
    else setNotice('Something went wrong. Please try again.')
    setBusy(false)
  }

  async function handleCancel() {
    setBusy(true); setNotice(null)
    const ok = await cancelRegistration(event)
    setNotice(ok ? (status === 'waitlist' ? 'You left the waitlist.' : 'Your registration is cancelled.') : 'Something went wrong. Please try again.')
    setBusy(false)
  }

  const attendeeNames = going.filter(r => r.clerk_user_id !== user?.id)

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(10,19,64,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', zIndex: 201,
        transform: 'translate(-50%, -50%)',
        width: 'min(520px, calc(100vw - 48px))',
        maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
        background: 'var(--surface)',
        backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        border: '1px solid var(--glass-border)', borderRadius: 20,
        boxShadow: '0 32px 80px rgba(10,19,64,0.22), 0 0 0 1px rgba(255,255,255,0.5)',
        padding: 32,
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', background: 'rgba(12,19,48,0.08)', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)' }}>×</button>
        <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {event.type && <span className="ev-type-badge">{event.type}</span>}
          {status === 'going' && <span className="mkw-chip-tag green">Going</span>}
          {status === 'waitlist' && <span className="mkw-chip-tag">Waitlist{waitPos ? ` #${waitPos}` : ''}</span>}
          {event.is_free === false && event.ticket_price != null && <span className="ev-type-badge">€{Number(event.ticket_price).toFixed(2)}</span>}
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.4px', lineHeight: 1.2, color: 'var(--ink-1)', marginBottom: 20 }}>{event.title}</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--mk-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>📅</div>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{dateStr}</div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>{time}{endTime ? ` – ${endTime}` : ''}</div>
            </div>
          </div>
          {event.location && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(59,109,217,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>📍</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{event.location}</div>
                {event.address && <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>{event.address}</div>}
              </div>
            </div>
          )}
          {!external && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(52,210,123,0.14)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>👥</div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>
                {going.length} going{event.capacity ? ` · ${Math.max(event.capacity - going.length, 0)} of ${event.capacity} spots left` : ''}
                {waitlist.length > 0 && <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}> · {waitlist.length} on waitlist</span>}
              </div>
            </div>
          )}
        </div>
        {event.description && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>About this event</div>
            <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7, fontFamily: 'var(--font-body)', whiteSpace: 'pre-line' }}>{event.description}</p>
          </div>
        )}

        {!external && attendeeNames.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>Who's going</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {attendeeNames.slice(0, 8).map((r, i) => {
                const p = people[r.clerk_user_id]
                const c = av(i)
                return (
                  <div key={r.clerk_user_id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 10, flexShrink: 0 }}>
                      {getInitials(p?.full_name)}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>
                      {p?.full_name || 'Member'}
                      {p?.role_category && <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}> · {p.role_category.charAt(0).toUpperCase() + p.role_category.slice(1)}</span>}
                    </div>
                  </div>
                )
              })}
              {attendeeNames.length > 8 && (
                <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>and {attendeeNames.length - 8} more</div>
              )}
            </div>
          </div>
        )}

        {notice && (
          <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 10, background: 'rgba(59,109,217,0.08)', fontSize: 13, color: 'var(--ink-2)', fontFamily: 'var(--font-body)' }}>{notice}</div>
        )}

        {isPast ? (
          <div style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-body)', textAlign: 'center' }}>This event has ended.</div>
        ) : external ? (
          <a href={event.luma_url || 'https://luma.com/calendar/cal-GBRc6zCvxA5bqnz'} target="_blank" rel="noreferrer" className="mk-btn mk-btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Register on Luma →</a>
        ) : status === 'going' || status === 'waitlist' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--ink-1)' }}>
              {status === 'going' ? "You're registered ✓" : `You're on the waitlist${waitPos ? ` (#${waitPos})` : ''}`}
            </div>
            <button className="mk-btn mk-btn-ghost" style={{ width: '100%', justifyContent: 'center' }} onClick={handleCancel} disabled={busy}>
              {busy ? '…' : status === 'going' ? 'Cancel registration' : 'Leave waitlist'}
            </button>
          </div>
        ) : (
          <button className="mk-btn mk-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleRegister} disabled={busy}>
            {busy ? '…' : full ? 'Join waitlist' : 'Register →'}
          </button>
        )}
      </div>
    </>
  )
}
