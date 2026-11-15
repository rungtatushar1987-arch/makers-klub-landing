import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useUser, useSession } from '@clerk/clerk-react'
import { useKlub, type RsvpStatus } from '../KlubContext'
import { getSupabaseClient, type Event, type Profile, ACTION_TAGS, MK_ADMIN_USER_IDS, getInitials } from '../supabase'
import './Events.css'

const AV_COLORS = [
  { bg: '#c5a059', fg: '#0a1340' },
  { bg: '#3b6dd9', fg: '#ffffff' },
  { bg: '#0a1340', fg: '#ffffff' },
  { bg: '#7ba0e8', fg: '#0a1340' },
]
const av = (i: number) => AV_COLORS[i % AV_COLORS.length]
const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : 'Maker')
const fmtTime = (d: Date) => d.toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
const endOf = (e: Event) => new Date(e.end_date || e.date)

type Tab = 'upcoming' | 'mine' | 'past'
type Attendee = { clerk_user_id: string; profile?: Profile; connected: boolean }
type LumaGuest = { name: string; role?: string | null; link?: string | null }
type LumaAttendance = { total: number; registered: number; checked_in: number; names: LumaGuest[] | null; names_visible: boolean }
type PendingConn = { action_tags: string[]; notes: string; remind_followup: boolean }

export default function Events() {
  const { events, myRsvps, allRsvps, loading } = useKlub()
  const [searchParams, setSearchParams] = useSearchParams()

  const now = new Date()
  const upcoming = events.filter(e => endOf(e) >= now)
  const past = events.filter(e => endOf(e) < now).sort((a, b) => b.date.localeCompare(a.date))
  const mine = upcoming.filter(e => myRsvps[e.id] === 'going' || myRsvps[e.id] === 'waitlist')

  const fromUrl = searchParams.get('event')
  const [tab, setTab] = useState<Tab>(() => {
    const e = events.find(x => x.id === fromUrl)
    return e && endOf(e) < new Date() ? 'past' : 'upcoming'
  })
  const [selectedId, setSelectedId] = useState<string | null>(fromUrl)
  const [sheetOpen, setSheetOpen] = useState(!!fromUrl)

  const lists: Record<Tab, Event[]> = { upcoming, mine, past }
  const shown = lists[tab]
  // Show the first row's details until the user picks another one.
  const selected = shown.find(e => e.id === selectedId) ?? events.find(e => e.id === selectedId && fromUrl === selectedId) ?? shown[0] ?? null

  // Deep links (?event=…) can arrive after events load.
  useEffect(() => {
    if (!fromUrl || loading) return
    const e = events.find(x => x.id === fromUrl)
    if (e) { setTab(endOf(e) < new Date() ? 'past' : 'upcoming'); setSelectedId(fromUrl); setSheetOpen(true) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, fromUrl])

  const goingCount = (id: string) => allRsvps.filter(r => r.event_id === id && r.status === 'going').length

  function pick(e: Event) {
    setSelectedId(e.id)
    setSheetOpen(true)
  }
  function closeSheet() {
    setSheetOpen(false)
    if (searchParams.has('event')) setSearchParams({}, { replace: true })
  }

  if (loading) return <div className="mkw-loading">Loading…</div>

  const TABS: { key: Tab; label: string; n: number }[] = [
    { key: 'upcoming', label: 'Upcoming', n: upcoming.length },
    { key: 'mine', label: 'My events', n: mine.length },
    { key: 'past', label: 'Past', n: past.length },
  ]
  const emptyText: Record<Tab, string> = {
    upcoming: 'No upcoming events right now. New events are announced here first.',
    mine: "You haven't registered for anything yet. Pick an event under Upcoming.",
    past: 'No past events yet.',
  }

  return (
    <>
      <div className="mkw-pagehead">
        <div>
          <div className="eyebrow">Berlin · Makers Klub</div>
          <h1>Events</h1>
          <p className="sub">Show up, meet people, grow your network.</p>
        </div>
        <div className="actions">
          <a href="https://luma.com/calendar/cal-GBRc6zCvxA5bqnz" target="_blank" rel="noreferrer" className="mk-btn mk-btn-primary mk-btn-sm">
            Full calendar →
          </a>
        </div>
      </div>

      <div className="mkw-main-body">
        <div className="ev-grid">
          {/* ── List ── */}
          <div className="ev-col-left">
            <div className="ev-tabs" role="group" aria-label="Event lists">
              {TABS.map(t => (
                <button key={t.key} type="button" aria-pressed={tab === t.key} className={`ev-tab${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
                  {t.label} <span>{t.n}</span>
                </button>
              ))}
            </div>

            {shown.length === 0 && <div className="mkw-empty">{emptyText[tab]}</div>}

            <ul className="ev-rows">
              {shown.map(event => {
                const status = myRsvps[event.id] as RsvpStatus | undefined
                const d = new Date(event.date)
                const isPastRow = tab === 'past'
                const taken = goingCount(event.id)
                const spotsLeft = event.capacity ? Math.max(event.capacity - taken, 0) : null
                const isSel = selected?.id === event.id
                return (
                  <li key={event.id}>
                    <button type="button" className={`ev-row${isSel ? ' selected' : ''}${isPastRow ? ' is-past' : ''}`} aria-current={isSel ? 'true' : undefined} onClick={() => pick(event)}>
                      <span className="ev-date-block">
                        <span className="ev-day">{d.getDate()}</span>
                        <span className="ev-mon">{d.toLocaleString('en', { month: 'short' }).toUpperCase()}</span>
                      </span>
                      <span className="ev-row-info">
                        <span className="ev-row-title">{event.title}</span>
                        <span className="ev-row-meta">
                          {isPastRow ? d.toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' }) : `${d.toLocaleDateString('en', { weekday: 'short' })} · ${fmtTime(d)}`}
                          {event.location ? ` · ${event.location}` : ''}
                          {!isPastRow && spotsLeft !== null && spotsLeft > 0 && <> · <b className={spotsLeft <= 5 ? 'ev-low' : ''}>{spotsLeft} left</b></>}
                        </span>
                      </span>
                      {status === 'going' && <span className="mkw-chip-tag green">Going</span>}
                      {status === 'waitlist' && <span className="mkw-chip-tag">Waitlist</span>}
                      {!isPastRow && !status && spotsLeft === 0 && <span className="mkw-chip-tag">Full</span>}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>

          {/* ── Details of the selected row ── */}
          <div className="ev-col-right">
            {selected ? (
              <EventDetail key={selected.id} event={selected} open={sheetOpen} onClose={closeSheet} />
            ) : (
              <div className="ev-detail-empty">Select an event to see its details.</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function EventDetail({ event, open, onClose }: { event: Event; open: boolean; onClose: () => void }) {
  const { user } = useUser()
  const { myRsvps, allRsvps, allProfiles, registerForEvent, cancelRegistration } = useKlub()
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)

  const status = myRsvps[event.id] as RsvpStatus | undefined
  const rows = allRsvps.filter(r => r.event_id === event.id)
  const going = rows.filter(r => r.status === 'going')
  const waitlist = rows.filter(r => r.status === 'waitlist')
  const full = !!event.capacity && going.length >= event.capacity
  const isPast = endOf(event) < new Date()
  const external = event.registration_mode === 'external'
  const waitPos = status === 'waitlist' ? waitlist.findIndex(r => r.clerk_user_id === user?.id) + 1 : 0
  const inRoom = status === 'going' || status === 'waitlist' || (!!user?.id && MK_ADMIN_USER_IDS.includes(user.id))
  const profileOf = useMemo(() => new Map(allProfiles.map(p => [p.clerk_user_id, p])), [allProfiles])
  const others = going.filter(r => r.clerk_user_id !== user?.id)

  const start = new Date(event.date)
  const dateStr = start.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const endTime = event.end_date ? fmtTime(new Date(event.end_date)) : null

  async function handleRegister() {
    setBusy(true); setNotice(null)
    const result = await registerForEvent(event)
    setNotice(result === 'going' ? "You're in. See you there!"
      : result === 'waitlist' ? "This event is full. You're on the waitlist and will move up if a spot opens."
      : 'Something went wrong. Please try again.')
    setBusy(false)
  }
  async function handleCancel() {
    setBusy(true); setNotice(null)
    const ok = await cancelRegistration(event)
    setNotice(ok ? (status === 'waitlist' ? 'You left the waitlist.' : 'Your registration is cancelled.') : 'Something went wrong. Please try again.')
    setBusy(false)
  }

  return (
    <aside className={`ev-detail${open ? ' open' : ''}`} aria-label="Event details">
      <button type="button" className="ev-detail-close" onClick={onClose} aria-label="Close details">×</button>

      <div className="ev-detail-chips">
        {event.type && <span className="ev-type-badge">{event.type}</span>}
        {isPast && <span className="ev-type-badge ev-type-badge--grey">Ended</span>}
        {status === 'going' && <span className="mkw-chip-tag green">Going</span>}
        {status === 'waitlist' && <span className="mkw-chip-tag">Waitlist{waitPos ? ` #${waitPos}` : ''}</span>}
        {event.is_free === false && event.ticket_price != null && <span className="ev-type-badge">€{Number(event.ticket_price).toFixed(2)}</span>}
      </div>
      <h2 className="ev-detail-title">{event.title}</h2>

      <dl className="ev-facts">
        <div><dt>When</dt><dd>{dateStr}<span>{fmtTime(start)}{endTime ? ` – ${endTime}` : ''}</span></dd></div>
        {event.location && <div><dt>Where</dt><dd>{event.location}{event.address && <span>{event.address}</span>}</dd></div>}
        {!external && !isPast && (
          <div><dt>Spots</dt><dd>{going.length} going{event.capacity ? ` · ${Math.max(event.capacity - going.length, 0)} of ${event.capacity} left` : ''}{waitlist.length > 0 && <span>{waitlist.length} on the waitlist</span>}</dd></div>
        )}
      </dl>

      {event.description && (
        <section className="ev-block">
          <h3>About this event</h3>
          <p className="ev-about">{event.description}</p>
        </section>
      )}

      {notice && <div className="ev-notice" role="status">{notice}</div>}

      {/* Actions */}
      <div className="ev-actions">
        {inRoom && (
          <Link to={`/events/${event.id}/room`} className="mk-btn mk-btn-navy">Open event room</Link>
        )}
        {!isPast && (external ? (
          <a href={event.luma_url || 'https://luma.com/calendar/cal-GBRc6zCvxA5bqnz'} target="_blank" rel="noreferrer" className="mk-btn mk-btn-primary">Register on Luma →</a>
        ) : status === 'going' || status === 'waitlist' ? (
          <button type="button" className="mk-btn mk-btn-ghost" onClick={handleCancel} disabled={busy}>
            {busy ? 'Working…' : status === 'going' ? 'Cancel registration' : 'Leave waitlist'}
          </button>
        ) : (
          <button type="button" className="mk-btn mk-btn-primary" onClick={handleRegister} disabled={busy}>
            {busy ? 'Working…' : full ? 'Join waitlist' : 'Register'}
          </button>
        ))}
      </div>

      {/* Who's going (upcoming) */}
      {!external && !isPast && others.length > 0 && (
        <section className="ev-block">
          <h3>Who’s going</h3>
          <ul className="ev-people">
            {others.slice(0, 8).map((r, i) => {
              const p = profileOf.get(r.clerk_user_id)
              const c = av(i)
              return (
                <li key={r.clerk_user_id} className="ev-person-row">
                  <span className="ev-av" style={{ background: c.bg, color: c.fg }}>{getInitials(p?.full_name)}</span>
                  <span className="ev-person"><b>{p?.full_name || 'Member'}</b><span>{cap(p?.role_category)}</span></span>
                </li>
              )
            })}
          </ul>
          {others.length > 8 && <p className="ev-muted">and {others.length - 8} more</p>}
        </section>
      )}

      {/* Who came (past) */}
      {isPast && <PastAttendees event={event} />}
    </aside>
  )
}

function PastAttendees({ event }: { event: Event }) {
  const { user } = useUser()
  const { session } = useSession()
  const { connections, addConnection } = useKlub()
  const [attendees, setAttendees] = useState<Attendee[] | null>(null)
  const [luma, setLuma] = useState<LumaAttendance | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [connecting, setConnecting] = useState<string | null>(null)
  const [pending, setPending] = useState<PendingConn>({ action_tags: [], notes: '', remind_followup: false })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const db = getSupabaseClient(await session?.getToken())
      const { data: lumaData } = await db.rpc('luma_event_attendance', { p_event_id: event.id })
      const { data: rsvpData } = await db.from('event_rsvps').select('clerk_user_id').eq('event_id', event.id).eq('status', 'going')
      const ids = ((rsvpData as { clerk_user_id: string }[]) || []).map(r => r.clerk_user_id).filter(id => id !== user?.id)
      const { data: profiles } = ids.length ? await db.from('profiles').select('*').in('clerk_user_id', ids) : { data: [] }
      if (cancelled) return
      const byId = new Map((profiles || []).map((p: Profile) => [p.clerk_user_id, p]))
      const mineIds = new Set(connections.map(c => c.connected_clerk_user_id))
      if (lumaData) setLuma(lumaData as LumaAttendance)
      setAttendees(ids.map(id => ({ clerk_user_id: id, profile: byId.get(id), connected: mineIds.has(id) })))
    })()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id])

  async function connect(a: Attendee) {
    setConnecting(a.clerk_user_id)
    const db = getSupabaseClient(await session?.getToken())
    const { data } = await db.from('connections').insert({
      clerk_user_id: user?.id, connected_clerk_user_id: a.clerk_user_id, event_name: event.title, event_date: event.date,
      action_tags: pending.action_tags, notes: pending.notes, remind_followup: pending.remind_followup, status: 'pending',
    }).select().single()
    if (data) {
      addConnection({ ...data, profile: a.profile })
      setAttendees(prev => (prev || []).map(x => x.clerk_user_id === a.clerk_user_id ? { ...x, connected: true } : x))
    }
    setConnecting(null); setEditing(null)
    setPending({ action_tags: [], notes: '', remind_followup: false })
  }
  const toggleTag = (tag: string) => setPending(p => ({ ...p, action_tags: p.action_tags.includes(tag) ? p.action_tags.filter(t => t !== tag) : [...p.action_tags, tag] }))

  if (!attendees) return <section className="ev-block"><h3>Who came</h3><p className="ev-muted">Loading…</p></section>

  const names = luma?.names ?? []
  return (
    <section className="ev-block">
      <h3>Who came</h3>
      {luma && (
        <p className="ev-stats">
          {luma.registered} registered{luma.checked_in > 0 ? ` · ${luma.checked_in} checked in` : ''}{attendees.length > 0 ? ` · ${attendees.length} on Makers Klub` : ''}
        </p>
      )}
      {attendees.length === 0 ? (
        <p className="ev-muted">{luma?.registered ? "None of them have joined Makers Klub yet. They'll show up here once they do." : 'No other attendees found.'}</p>
      ) : (
        <ul className="ev-people ev-people--connect">
          {attendees.map((a, j) => {
            const c = av(j)
            const isEditing = editing === a.clerk_user_id
            return (
              <li key={a.clerk_user_id}>
                <div className="ev-person-row">
                  <span className="ev-av" style={{ background: c.bg, color: c.fg }}>{getInitials(a.profile?.full_name)}</span>
                  <span className="ev-person"><b>{a.profile?.full_name || 'Member'}</b><span>{cap(a.profile?.role_category)}</span></span>
                  {a.connected ? <span className="mkw-chip-tag green">Connected</span>
                    : <button type="button" className={`mkw-row-action${isEditing ? '' : ' primary'}`} aria-expanded={isEditing} onClick={() => setEditing(isEditing ? null : a.clerk_user_id)}>{isEditing ? 'Cancel' : 'Say hi'}</button>}
                </div>
                {isEditing && (
                  <div className="ev-connect-form">
                    <label className="sr-only" htmlFor={`cn-${a.clerk_user_id}`}>Note</label>
                    <textarea id={`cn-${a.clerk_user_id}`} className="mkw-form-textarea" rows={2} placeholder="How did you meet? What did you talk about?" value={pending.notes} onChange={e => setPending(p => ({ ...p, notes: e.target.value }))} />
                    <div className="ev-tag-row">
                      {ACTION_TAGS.map(tag => (
                        <button key={tag} type="button" aria-pressed={pending.action_tags.includes(tag)} onClick={() => toggleTag(tag)} className={`ev-tag-btn${pending.action_tags.includes(tag) ? ' selected' : ''}`}>{tag}</button>
                      ))}
                    </div>
                    <div className="ev-connect-footer">
                      <label className="ev-remind-label">
                        <input type="checkbox" checked={pending.remind_followup} onChange={e => setPending(p => ({ ...p, remind_followup: e.target.checked }))} style={{ accentColor: 'var(--mk-yellow)' }} />
                        Remind me to follow up
                      </label>
                      <button type="button" className="mk-btn mk-btn-primary mk-btn-sm" disabled={connecting === a.clerk_user_id} onClick={() => connect(a)}>
                        {connecting === a.clerk_user_id ? 'Connecting…' : 'Connect'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {names.length > 0 && (
        <>
          <h4 className="ev-sub">Also on Luma</h4>
          <ul className="ev-people">
            {names.map((g, k) => {
              const c = av(k + 2)
              return (
                <li key={`${g.name}-${k}`} className="ev-person-row">
                  <span className="ev-av ev-av--sm" style={{ background: c.bg, color: c.fg }}>{getInitials(g.name)}</span>
                  <span className="ev-person"><b>{g.name}</b>{g.role && <span>{g.role}</span>}</span>
                  {g.link && /^https?:\/\//i.test(g.link) && (
                    <a className="ev-ext" href={g.link} target="_blank" rel="noopener noreferrer">{/linkedin\.com/i.test(g.link) ? 'LinkedIn' : 'Website'} ↗</a>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}
    </section>
  )
}
