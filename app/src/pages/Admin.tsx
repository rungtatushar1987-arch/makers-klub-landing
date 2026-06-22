import React, { useState, useEffect, useCallback } from 'react'
import { useUser, useSession } from '@clerk/clerk-react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getSupabaseClient, getInitials, type Profile, type Event } from '../supabase'
import './Admin.css'

// ── Types ────────────────────────────────────────────────────────────────────

type OrgMember = {
  id: string
  clerk_user_id: string
  org_role: string
  joined_at: string
  is_paying: boolean
  profile?: Profile
  events_attended: number
  last_seen: string | null
  connections_made: number
}

type AdminEvent = Event & {
  rsvp_count: number
}

type EventAttendee = { clerk_user_id: string; profile?: Profile }

type Tab = 'members' | 'events' | 'analytics'
const VALID_TABS: Tab[] = ['members', 'events', 'analytics']

// ── Helpers ──────────────────────────────────────────────────────────────────

const MK_ORG = 'cf84f186-0d86-40c3-baa7-b5f33598d0fd'

const AV_COLORS = [
  { bg: '#fcb813', fg: '#0a1340' },
  { bg: '#7a4ed8', fg: '#ffffff' },
  { bg: '#3b6dd9', fg: '#ffffff' },
  { bg: '#0a1340', fg: '#ffffff' },
  { bg: '#a587f0', fg: '#0a1340' },
]
function avColor(i: number) { return AV_COLORS[i % AV_COLORS.length] }

function ordinalSuffix(d: number): string {
  if (d === 1 || d === 21 || d === 31) return 'st'
  if (d === 2 || d === 22) return 'nd'
  if (d === 3 || d === 23) return 'rd'
  return 'th'
}

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const day = d.getDate()
  const month = d.toLocaleString('en', { month: 'long' })
  const year = d.getFullYear()
  return `${day}${ordinalSuffix(day)} ${month}, ${year}`
}

function lastEventRelative(iso: string | null): string {
  if (!iso) return '—'
  const diff = (Date.now() - new Date(iso).getTime()) / 86400000
  if (diff < 1) return 'Today'
  if (diff < 2) return 'Yesterday'
  if (diff < 30) return `${Math.floor(diff)} days ago`
  const months = Math.floor(diff / 30.5)
  return `${months} month${months > 1 ? 's' : ''} ago`
}

type EngagementBand = { label: string; color: string; bg: string; min: number }
const ENGAGEMENT_BANDS: EngagementBand[] = [
  { label: 'New',      color: '#8a94a8', bg: 'rgba(138,148,168,0.12)', min: -1 },
  { label: 'Observer', color: '#3b6dd9', bg: 'rgba(59,109,217,0.12)',  min: 1  },
  { label: 'Regular',  color: '#7a4ed8', bg: 'rgba(122,78,216,0.12)',  min: 31 },
  { label: 'Core',     color: '#f4822a', bg: 'rgba(244,130,42,0.12)',  min: 61 },
  { label: 'Champion', color: '#ca8e00', bg: 'rgba(252,184,19,0.18)',  min: 81 },
]
function getEngagementBand(score: number, eventsAttended: number): EngagementBand {
  if (eventsAttended === 0) return ENGAGEMENT_BANDS[0]
  return [...ENGAGEMENT_BANDS].reverse().find(b => score >= b.min) || ENGAGEMENT_BANDS[1]
}
function memberEngagementScore(m: OrgMember, pastEvents: number): number {
  if (pastEvents === 0) return 0
  const attendanceScore = Math.min(100, Math.round((m.events_attended / pastEvents) * 100))
  const connectionScore = Math.min(100, m.connections_made * 20)
  return Math.round(attendanceScore * 0.6 + connectionScore * 0.4)
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Admin() {
  const { user } = useUser()
  const { session } = useSession()
  const navigate = useNavigate()

  const [searchParams, setSearchParams] = useSearchParams()
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const rawTab = searchParams.get('tab') as Tab | null
  const tab: Tab = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'members'
  const setTab = (t: Tab) => setSearchParams({ tab: t }, { replace: true })
  const [search, setSearch] = useState('')

  // Members tab
  const [members, setMembers] = useState<OrgMember[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [togglingPaying, setTogglingPaying] = useState<string | null>(null)

  // Events tab
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventSubTab, setEventSubTab] = useState<'upcoming' | 'past'>('upcoming')
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)
  const [attendees, setAttendees] = useState<Record<string, EventAttendee[]>>({})
  const [attendeesLoading, setAttendeesLoading] = useState<string | null>(null)

  // Stats
  const [stats, setStats] = useState({
    totalMembers: 0, totalEvents: 0, totalRsvps: 0,
    pastEvents: 0, uniqueRsvpers: 0, membersWithConnections: 0,
  })

  // ── Derived signal scores (each 0–100) ──────────────────────────────────────
  const rsvpRate = stats.totalMembers > 0 && stats.pastEvents > 0
    ? Math.min(100, Math.round((stats.totalRsvps / (stats.totalMembers * stats.pastEvents)) * 100))
    : 0
  const memberReach = stats.totalMembers > 0
    ? Math.min(100, Math.round((stats.uniqueRsvpers / stats.totalMembers) * 100))
    : 0
  const connectionRate = stats.totalMembers > 0
    ? Math.min(100, Math.round((stats.membersWithConnections / stats.totalMembers) * 100))
    : 0
  const realMembers_ = members.filter(m => !m.clerk_user_id.startsWith('mock_'))
  const repeatAttendees = realMembers_.filter(m => m.events_attended > 1).length
  const repeatRate = realMembers_.length > 0
    ? Math.min(100, Math.round((repeatAttendees / realMembers_.length) * 100))
    : 0

  const healthScore = Math.round(
    rsvpRate * 0.35 +
    memberReach * 0.25 +
    connectionRate * 0.30 +
    repeatRate * 0.10
  )

  const enoughData = stats.pastEvents >= 3
  const engagementPct = rsvpRate

  // ── Auth guard ──────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user || !session) return
    session.getToken().then(async token => {
      const db = getSupabaseClient(token)
      const { data } = await db.rpc('jwt_is_org_admin', { org: MK_ORG })
      if (!data) {
        navigate('/home', { replace: true })
      } else {
        setIsAdmin(true)
      }
    })
  }, [user, session])

  // ── Data loaders ────────────────────────────────────────────────────────────

  const loadMembers = useCallback(async () => {
    if (!session) return
    setMembersLoading(true)
    const token = await session.getToken()
    const db = getSupabaseClient(token)

    const { data: orgRows } = await db
      .from('org_members')
      .select('id, clerk_user_id, org_role, joined_at, is_paying')
      .eq('org_id', MK_ORG)
      .order('joined_at', { ascending: false })

    if (!orgRows) { setMembersLoading(false); return }

    const ids = orgRows.map((r: any) => r.clerk_user_id)

    const [{ data: profiles }, { data: rsvpData }, { data: pastEvents }, { data: connData }] = await Promise.all([
      db.from('profiles').select('*').in('clerk_user_id', ids),
      db.from('event_rsvps').select('clerk_user_id, event_id, created_at').in('clerk_user_id', ids),
      db.from('events').select('id, date').eq('org_id', MK_ORG).lt('date', new Date().toISOString()),
      db.from('connections').select('clerk_user_id').eq('status', 'accepted').in('clerk_user_id', ids),
    ])

    const profileMap = new Map((profiles || []).map((p: any) => [p.clerk_user_id, p]))
    const pastIds = new Set((pastEvents || []).map((e: any) => e.id))

    const connCount = new Map<string, number>()
    for (const c of (connData || []) as any[]) {
      connCount.set(c.clerk_user_id, (connCount.get(c.clerk_user_id) || 0) + 1)
    }

    const rsvpByUser = new Map<string, { count: number; latest: string | null }>()
    for (const r of (rsvpData || []) as any[]) {
      const cur = rsvpByUser.get(r.clerk_user_id) || { count: 0, latest: null }
      if (pastIds.has(r.event_id)) cur.count++
      if (!cur.latest || r.created_at > cur.latest) cur.latest = r.created_at
      rsvpByUser.set(r.clerk_user_id, cur)
    }

    const rows: OrgMember[] = orgRows.map((r: any) => {
      const rsvp = rsvpByUser.get(r.clerk_user_id) || { count: 0, latest: null }
      return { ...r, profile: profileMap.get(r.clerk_user_id), events_attended: rsvp.count, last_seen: rsvp.latest, connections_made: connCount.get(r.clerk_user_id) || 0 }
    })

    setMembers(rows)
    setStats(s => ({ ...s, totalMembers: rows.filter(m => !m.clerk_user_id.startsWith('mock_')).length }))
    setMembersLoading(false)
  }, [session])

  const loadEvents = useCallback(async () => {
    if (!session) return
    setEventsLoading(true)
    const token = await session.getToken()
    const db = getSupabaseClient(token)

    const [{ data: evData }, { data: rsvpData }, { data: connData }] = await Promise.all([
      db.from('events').select('*').order('date', { ascending: false }),
      db.from('event_rsvps').select('event_id, clerk_user_id'),
      db.from('connections').select('clerk_user_id').eq('status', 'accepted'),
    ])

    const rsvpCount = new Map<string, number>()
    const uniqueRsvpers = new Set<string>()
    for (const r of (rsvpData || []) as any[]) {
      rsvpCount.set(r.event_id, (rsvpCount.get(r.event_id) || 0) + 1)
      uniqueRsvpers.add(r.clerk_user_id)
    }
    const membersWithConnections = new Set((connData || []).map((c: any) => c.clerk_user_id)).size

    const rows: AdminEvent[] = (evData || []).map((e: any) => ({ ...e, rsvp_count: rsvpCount.get(e.id) || 0 }))
    const pastEventCount = rows.filter(e => new Date(e.date) < new Date()).length

    setEvents(rows)
    setStats(s => ({
      ...s,
      totalEvents: rows.length,
      pastEvents: pastEventCount,
      totalRsvps: Array.from(rsvpCount.values()).reduce((a, b) => a + b, 0),
      uniqueRsvpers: uniqueRsvpers.size,
      membersWithConnections,
    }))
    setEventsLoading(false)
  }, [session])

  const loadAttendees = useCallback(async (eventId: string) => {
    if (attendees[eventId] || attendeesLoading === eventId) return
    setAttendeesLoading(eventId)
    const token = await session?.getToken()
    const db = getSupabaseClient(token)
    const { data: rsvpData } = await db
      .from('event_rsvps').select('clerk_user_id').eq('event_id', eventId)
    if (rsvpData) {
      const ids = (rsvpData as any[]).map(r => r.clerk_user_id)
      const { data: profilesData } = ids.length > 0
        ? await db.from('profiles').select('*').in('clerk_user_id', ids)
        : { data: [] }
      const profileMap = new Map((profilesData || []).map((p: any) => [p.clerk_user_id, p]))
      setAttendees(prev => ({
        ...prev,
        [eventId]: ids.map(id => ({ clerk_user_id: id, profile: profileMap.get(id) }))
      }))
    }
    setAttendeesLoading(null)
  }, [session, attendees, attendeesLoading])

  useEffect(() => {
    if (isAdmin) { loadMembers(); loadEvents() }
  }, [isAdmin])

  // ── Toggle is_paying ────────────────────────────────────────────────────────

  async function togglePaying(memberId: string, current: boolean) {
    setTogglingPaying(memberId)
    const token = await session?.getToken()
    const db = getSupabaseClient(token)
    await db.from('org_members').update({ is_paying: !current }).eq('id', memberId)
    setMembers(prev => prev.map(m => m.id === memberId ? { ...m, is_paying: !current } : m))
    setTogglingPaying(null)
  }

  // ── Event CRUD ──────────────────────────────────────────────────────────────

  async function createEvent(fields: EventFormFields) {
    const token = await session?.getToken()
    const db = getSupabaseClient(token)
    const { data, error } = await db.from('events').insert({
      ...fields,
      org_id: MK_ORG,
      ticket_price: fields.is_free ? null : (fields.ticket_price ? parseFloat(fields.ticket_price) : null),
    }).select().single()
    if (!error && data) {
      const newEv: AdminEvent = { ...data, rsvp_count: 0 }
      setEvents(prev => [newEv, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
      setStats(s => ({ ...s, totalEvents: s.totalEvents + 1 }))
    }
    setEventFormOpen(false)
  }

  async function updateEvent(id: string, fields: EventFormFields) {
    const token = await session?.getToken()
    const db = getSupabaseClient(token)
    const { data, error } = await db.from('events').update({
      ...fields,
      ticket_price: fields.is_free ? null : (fields.ticket_price ? parseFloat(fields.ticket_price) : null),
    }).eq('id', id).select().single()
    if (!error && data) {
      setEvents(prev => prev.map(e => e.id === id ? { ...e, ...data } : e))
    }
    setSelectedEvent(null)
  }

  async function deleteEvent(id: string) {
    setDeletingEventId(id)
    const token = await session?.getToken()
    const db = getSupabaseClient(token)
    const { error } = await db.from('events').delete().eq('id', id)
    if (!error) {
      setEvents(prev => prev.filter(e => e.id !== id))
      setStats(s => ({ ...s, totalEvents: s.totalEvents - 1 }))
      setSelectedEvent(null)
    }
    setDeletingEventId(null)
  }

  // ── Guard ───────────────────────────────────────────────────────────────────

  if (isAdmin === null) return (
    <div className="mkw-loading">Checking access…</div>
  )

  // ── Derived ─────────────────────────────────────────────────────────────────

  const q = search.toLowerCase()
  const realMembers = members.filter(m => !m.clerk_user_id.startsWith('mock_'))
  const filteredMembers = realMembers.filter(m =>
    !q ||
    m.profile?.full_name?.toLowerCase().includes(q) ||
    m.profile?.role_category?.toLowerCase().includes(q) ||
    m.profile?.bio?.toLowerCase().includes(q)
  )

  const atRisk = realMembers.filter(m =>
    m.events_attended > 0 &&
    (!m.last_seen || (Date.now() - new Date(m.last_seen).getTime()) > 60 * 86400000)
  )

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="mkw-pagehead">
        <div>
          <div className="eyebrow">Organiser</div>
          <h1>Dashboard</h1>
        </div>
        <div className="actions">
          <span className="adm-badge">Makers Klub · Admin</span>
        </div>
      </div>

      <div className="mkw-main-body">

        {/* Stats bar */}
        <div className="mkw-stats adm-stats">
          {[
            { lbl: 'Members',   num: stats.totalMembers,  delta: 'In your community' },
            { lbl: 'Events',    num: stats.totalEvents,   delta: 'Total hosted' },
            { lbl: 'RSVP rate', num: `${engagementPct}%`, delta: 'members typically rsvp for your events' },
          ].map(s => (
            <div key={s.lbl} className="mkw-stat">
              <div className="lbl">{s.lbl}</div>
              <div className="num">{s.num}</div>
              <div className="delta">{s.delta}</div>
            </div>
          ))}
        </div>

        {/* ══ MEMBERS ══ */}
        {tab === 'members' && (
          <>
            <input
              className="adm-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search members…"
            />
            {membersLoading ? (
              <p className="adm-tab-loading">Loading…</p>
            ) : (
              <div className="mkw-card adm-table-card">
                <MemberTableHead />
                {filteredMembers.length === 0 && (
                  <p className="adm-table-empty">No members found.</p>
                )}
                {filteredMembers.map((m, i) => (
                  <MemberRow
                    key={m.id} member={m} index={i}
                    pastEvents={stats.pastEvents}
                    toggling={togglingPaying === m.id}
                    onTogglePaying={() => togglePaying(m.id, m.is_paying)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ══ EVENTS ══ */}
        {tab === 'events' && (
          <>
            {/* Sub-tabs + Add event on same row */}
            <div className="adm-sub-tabs">
              {(['upcoming', 'past'] as const).map(t => {
                const count = events.filter(e => t === 'upcoming' ? new Date(e.date) >= new Date() : new Date(e.date) < new Date()).length
                return (
                  <button
                    key={t}
                    onClick={() => setEventSubTab(t)}
                    className={`adm-sub-tab${eventSubTab === t ? ' active' : ''}`}
                  >
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                    <span className="adm-sub-tab-count">{count}</span>
                  </button>
                )
              })}
              <button className="adm-add-btn" onClick={() => setEventFormOpen(true)}>
                + Add event
              </button>
            </div>

            {eventsLoading ? (
              <p className="adm-tab-loading">Loading…</p>
            ) : (
              <div className="mkw-card adm-table-card">
                <EventTableHead />
                {(() => {
                  const now = new Date()
                  const shown = events.filter(e =>
                    eventSubTab === 'upcoming' ? new Date(e.date) >= now : new Date(e.date) < now
                  )
                  if (shown.length === 0) return (
                    <p className="adm-table-empty">
                      {eventSubTab === 'upcoming' ? 'No upcoming events. Add your first one.' : 'No past events yet.'}
                    </p>
                  )
                  return shown.map(e => (
                    <EventRow
                      key={e.id} event={e}
                      onClick={() => { setSelectedEvent(e); loadAttendees(e.id) }}
                    />
                  ))
                })()}
              </div>
            )}
            {(eventFormOpen || selectedEvent) && (
              <EventFormModal
                event={selectedEvent}
                deleting={!!selectedEvent && deletingEventId === selectedEvent.id}
                attendees={selectedEvent ? (attendees[selectedEvent.id] ?? null) : null}
                attendeesLoading={!!selectedEvent && attendeesLoading === selectedEvent.id}
                onSave={(fields) => selectedEvent ? updateEvent(selectedEvent.id, fields) : createEvent(fields)}
                onDelete={selectedEvent ? () => deleteEvent(selectedEvent.id) : undefined}
                onClose={() => { setEventFormOpen(false); setSelectedEvent(null) }}
              />
            )}
          </>
        )}

        {/* ══ ANALYTICS ══ */}
        {tab === 'analytics' && (
          <div className="adm-analytics">
            <HealthScore
              score={healthScore}
              enoughData={enoughData}
              signals={[
                { label: 'RSVP rate',        value: rsvpRate,        weight: 35 },
                { label: 'Member reach',      value: memberReach,     weight: 25 },
                { label: 'Connection rate',   value: connectionRate,  weight: 30 },
                { label: 'Repeat attendance', value: repeatRate,      weight: 10 },
              ]}
              pastEvents={stats.pastEvents}
            />
            <div className="mkw-card">
              <div className="mkw-h3" style={{ marginBottom: 16 }}><span>Role breakdown</span></div>
              <RoleBreakdown members={realMembers} />
            </div>
            {atRisk.length > 0 && <AtRiskList members={atRisk} />}
          </div>
        )}

      </div>
    </>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MemberTableHead() {
  return (
    <div className="adm-thead adm-thead--members">
      <span>Member</span>
      <span>Role</span>
      <span className="adm-col-center">Events attended</span>
      <span className="adm-col-center">Last event attended</span>
      <span className="adm-col-center">Connections</span>
      <span className="adm-col-center">Paying</span>
      <span className="adm-col-center">Engagement</span>
    </div>
  )
}

function MemberRow({ member: m, index: i, pastEvents, toggling, onTogglePaying }: {
  member: OrgMember; index: number; pastEvents: number; toggling: boolean; onTogglePaying: () => void
}) {
  const av = avColor(i)
  const score = memberEngagementScore(m, pastEvents)
  const engBand = getEngagementBand(score, m.events_attended)
  const attendancePct = pastEvents > 0 ? Math.round((m.events_attended / pastEvents) * 100) : 0
  const isAtRisk = m.events_attended > 0 && (!m.last_seen || (Date.now() - new Date(m.last_seen).getTime()) > 60 * 86400000)

  return (
    <div className="adm-mrow">
      {/* Avatar + name */}
      <div className="adm-mrow-identity">
        <div className="adm-mrow-av" style={{ background: av.bg, color: av.fg }}>
          {getInitials(m.profile?.full_name)}
        </div>
        <div className="adm-mrow-name-wrap">
          <div className="adm-mrow-name">
            {m.profile?.full_name || '(no name)'}
            {m.org_role === 'owner' && <span className="adm-mrow-owner">Owner</span>}
          </div>
          <div className="adm-mrow-bio">{m.profile?.bio || '—'}</div>
        </div>
      </div>

      {/* Role category */}
      <div>
        {m.profile?.role_category
          ? <span className="adm-role-badge">{m.profile.role_category}</span>
          : <span className="adm-role-empty">—</span>}
      </div>

      {/* Events attended + attendance % */}
      <div className="adm-col-num" style={{ color: m.events_attended > 0 ? 'var(--ink-1)' : 'var(--ink-3)' }}>
        {m.events_attended}
        {pastEvents > 0 && <span className="adm-attend-pct">({attendancePct}%)</span>}
      </div>

      {/* Last event attended */}
      <div className="adm-last-event" style={{ color: isAtRisk ? 'var(--danger)' : 'var(--ink-3)' }}>
        {lastEventRelative(m.last_seen)}
      </div>

      {/* Connections made */}
      <div className="adm-col-num" style={{ color: m.connections_made > 0 ? 'var(--mk-violet)' : 'var(--ink-3)' }}>
        {m.connections_made}
      </div>

      {/* Paying toggle */}
      <div className="adm-col-center">
        <button
          onClick={onTogglePaying}
          disabled={toggling}
          className={`adm-paying-btn ${m.is_paying ? 'adm-paying-btn--on' : 'adm-paying-btn--off'}`}
          style={{ opacity: toggling ? 0.5 : 1 }}
        >
          {m.is_paying ? '✓ Paying' : 'Free'}
        </button>
      </div>

      {/* Engagement score badge */}
      <div className="adm-col-center">
        <span className="adm-eng-badge" style={{ background: engBand.bg, color: engBand.color }}>
          {engBand.label}
        </span>
        {m.events_attended > 0 && (
          <div className="adm-eng-score">{score}/100</div>
        )}
      </div>
    </div>
  )
}

function EventTableHead() {
  return (
    <div className="adm-thead adm-thead--events">
      <span />
      <span>Event</span>
      <span>Location</span>
      <span className="adm-col-center">Tickets</span>
      <span className="adm-col-center">RSVPs</span>
    </div>
  )
}

function PriceTag({ event }: { event: AdminEvent }) {
  if (event.is_free) return <span className="adm-price-badge free">Free</span>
  return (
    <span className="adm-price-badge paid">
      €{event.ticket_price != null ? Number(event.ticket_price).toFixed(2) : '—'}
    </span>
  )
}

function EventRow({ event: e, onClick }: { event: AdminEvent; onClick: () => void }) {
  const isPast = new Date(e.date) < new Date()
  const day = new Date(e.date).getDate()
  const mon = new Date(e.date).toLocaleString('en', { month: 'short' }).toUpperCase()
  return (
    <div className={`adm-erow${isPast ? ' past' : ''}`} onClick={onClick}>
      <div
        className="adm-date-block"
        style={{ background: isPast ? 'rgba(12,19,48,0.06)' : 'var(--mk-navy)' }}
      >
        <div className="adm-date-day" style={{ color: isPast ? 'var(--ink-3)' : '#fff' }}>{day}</div>
        <div className="adm-date-mon" style={{ color: isPast ? 'var(--ink-3)' : 'var(--mk-yellow)' }}>{mon}</div>
      </div>
      <div>
        <div className="adm-event-title">{e.title}</div>
        <div className="adm-event-meta">
          {e.type && <span className="adm-event-type">{e.type}</span>}
          <span className="adm-event-date">{formatDate(e.date)}</span>
        </div>
      </div>
      <div className="adm-event-location">{e.location || '—'}</div>
      <div className="adm-col-center"><PriceTag event={e} /></div>
      <div className="adm-event-rsvp">{e.rsvp_count}</div>
    </div>
  )
}

// ── Event form ────────────────────────────────────────────────────────────────

type EventFormFields = {
  title: string
  date: string
  end_date: string
  location: string
  address: string
  type: string
  description: string
  luma_url: string
  is_free: boolean
  ticket_price: string
}

const BLANK_FORM: EventFormFields = {
  title: '', date: '', end_date: '', location: '', address: '',
  type: 'Networking', description: '', luma_url: '',
  is_free: true, ticket_price: '',
}

const EVENT_TYPES = ['Networking', 'Workshop', 'Social', 'Panel', 'Fireside', 'Hackathon', 'Other']

function toLocalDatetime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function EventFormModal({ event, deleting, attendees, attendeesLoading, onSave, onDelete, onClose }: {
  event: AdminEvent | null
  deleting: boolean
  attendees: EventAttendee[] | null
  attendeesLoading: boolean
  onSave: (fields: EventFormFields) => Promise<void>
  onDelete?: () => void
  onClose: () => void
}) {
  const isNew = event === null
  const [isEditing, setIsEditing] = useState(isNew)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [form, setForm] = useState<EventFormFields>(event ? {
    title: event.title || '',
    date: toLocalDatetime(event.date),
    end_date: toLocalDatetime(event.end_date),
    location: event.location || '',
    address: event.address || '',
    type: event.type || 'Networking',
    description: event.description || '',
    luma_url: event.luma_url || '',
    is_free: event.is_free ?? true,
    ticket_price: event.ticket_price != null ? String(event.ticket_price) : '',
  } : BLANK_FORM)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<EventFormFields>>({})

  function setField(k: keyof EventFormFields, v: string) {
    setForm(f => ({ ...f, [k]: v }))
    setErrors(e => ({ ...e, [k]: undefined }))
  }

  function cancelEdit() {
    if (isNew) { onClose(); return }
    setIsEditing(false)
    setErrors({})
    setForm({
      title: event!.title || '',
      date: toLocalDatetime(event!.date),
      end_date: toLocalDatetime(event!.end_date),
      location: event!.location || '',
      address: event!.address || '',
      type: event!.type || 'Networking',
      description: event!.description || '',
      luma_url: event!.luma_url || '',
      is_free: event!.is_free ?? true,
      ticket_price: event!.ticket_price != null ? String(event!.ticket_price) : '',
    })
  }

  async function handleSave(ev: React.FormEvent) {
    ev.preventDefault()
    const errs: Partial<EventFormFields> = {}
    if (!form.title.trim()) errs.title = 'Required'
    if (!form.date) errs.date = 'Required'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    await onSave({
      ...form,
      date: new Date(form.date).toISOString(),
      end_date: form.end_date ? new Date(form.end_date).toISOString() : '',
      ticket_price: !form.is_free && form.ticket_price ? form.ticket_price : '',
    })
    setSaving(false)
  }

  const isPast = event ? new Date(event.date) < new Date() : false

  // ── View mode — matches Events page EventModal ──────────────────────────────
  if (!isNew && !isEditing) {
    const dateStr = new Date(event!.date).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    const time    = new Date(event!.date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false })
    const endTime = event!.end_date ? new Date(event!.end_date).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit', hour12: false }) : null

    return (
      <>
        <div className="adm-modal-backdrop" onClick={onClose} />
        <div className="adm-modal adm-modal--view">
          <button className="adm-modal-close" onClick={onClose}>×</button>

          {/* Type badge + status */}
          {(event!.type || !isPast) && (
            <div className="adm-view-badges">
              {event!.type && <span className="adm-view-type-badge">{event!.type}</span>}
              <span className={`adm-modal-status ${isPast ? 'past' : 'upcoming'}`}>
                {isPast ? 'Past' : 'Upcoming'}
              </span>
            </div>
          )}

          {/* Title */}
          <h2 className="adm-view-title">{event!.title}</h2>

          {/* Date / location / pricing icon rows */}
          <div className="adm-view-meta">
            <div className="adm-view-meta-row">
              <div className="adm-view-icon adm-view-icon--navy">📅</div>
              <div>
                <div className="adm-view-meta-primary">{dateStr}</div>
                <div className="adm-view-meta-secondary">{time}{endTime ? ` – ${endTime}` : ''}</div>
              </div>
            </div>
            {event!.location && (
              <div className="adm-view-meta-row">
                <div className="adm-view-icon adm-view-icon--violet">📍</div>
                <div>
                  <div className="adm-view-meta-primary">{event!.location}</div>
                  {event!.address && <div className="adm-view-meta-secondary">{event!.address}</div>}
                </div>
              </div>
            )}
            <div className="adm-view-meta-row">
              <div className="adm-view-icon adm-view-icon--yellow">🎟️</div>
              <div>
                {event!.is_free
                  ? <div className="adm-view-meta-primary">Free entry</div>
                  : <>
                      <div className="adm-view-meta-primary">€{event!.ticket_price != null ? Number(event!.ticket_price).toFixed(2) : '—'} per ticket</div>
                    </>
                }
              </div>
            </div>
            {event!.rsvp_count > 0 && (
              <div className="adm-view-meta-row">
                <div className="adm-view-icon adm-view-icon--green">👥</div>
                <div>
                  <div className="adm-view-meta-primary">{event!.rsvp_count} RSVPs</div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {event!.description && (
            <div className="adm-view-desc-wrap">
              <div className="adm-view-desc-label">About this event</div>
              <p className="adm-view-desc">{event!.description}</p>
            </div>
          )}

          {/* Attendees */}
          <div className="adm-view-desc-wrap">
            <div className="adm-view-desc-label">Attendees</div>
            {attendeesLoading ? (
              <p className="adm-attendees-loading">Loading…</p>
            ) : attendees === null || attendees.length === 0 ? (
              <p className="adm-attendees-empty">No RSVPs yet.</p>
            ) : (
              <div className="adm-attendees-list">
                {attendees.map((a, i) => {
                  const c = AV_COLORS[i % AV_COLORS.length]
                  return (
                    <div key={a.clerk_user_id} className="adm-attendee-row">
                      <div className="adm-attendee-av" style={{ background: c.bg, color: c.fg }}>
                        {getInitials(a.profile?.full_name)}
                      </div>
                      <div className="adm-attendee-info">
                        <div className="adm-attendee-name">{a.profile?.full_name || 'Member'}</div>
                        {a.profile?.role_category && (
                          <div className="adm-attendee-role">{a.profile.role_category}</div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Luma link */}
          {event!.luma_url && (
            <a href={event!.luma_url} target="_blank" rel="noreferrer" className="adm-view-luma-btn">
              View on Luma →
            </a>
          )}

          {/* Footer actions */}
          <div className="adm-modal-footer adm-modal-footer--view">
            <div>
              {onDelete && (
                confirmDelete ? (
                  <div className="adm-modal-confirm">
                    <span className="adm-modal-confirm-text">Delete this event?</span>
                    <button
                      type="button"
                      className="adm-btn adm-btn-sm adm-btn-danger"
                      onClick={onDelete}
                      disabled={deleting}
                      style={{ opacity: deleting ? 0.5 : 1 }}
                    >
                      {deleting ? 'Removing…' : 'Yes, remove'}
                    </button>
                    <button
                      type="button"
                      className="adm-btn adm-btn-sm adm-btn-ghost"
                      onClick={() => setConfirmDelete(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="adm-btn adm-btn-md adm-btn-danger-soft"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Remove
                  </button>
                )
              )}
            </div>
            <div className="adm-modal-actions">
              <button type="button" className="adm-btn adm-btn-lg adm-btn-navy" onClick={() => setIsEditing(true)}>
                Edit
              </button>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ── Edit / create form ──────────────────────────────────────────────────────

  function inputCls(hasError?: boolean) {
    return ['adm-modal-input', hasError ? 'error' : ''].filter(Boolean).join(' ')
  }

  return (
    <>
      <div className="adm-modal-backdrop" onClick={onClose} />
      <div className="adm-modal">
        <button className="adm-modal-close" onClick={onClose}>×</button>

        <div className="adm-modal-header">
          <h2 className="adm-modal-title">{isNew ? 'New event' : 'Edit event'}</h2>
        </div>

        <form className="adm-modal-form" onSubmit={handleSave}>
          <div>
            <label className="adm-modal-label">Title *</label>
            <input
              className={inputCls(!!errors.title)}
              value={form.title}
              onChange={e => setField('title', e.target.value)}
              placeholder="e.g. Makers Drinks #12"
            />
            {errors.title && <div className="adm-modal-error">{errors.title}</div>}
          </div>

          <div className="adm-modal-grid-2">
            <div>
              <label className="adm-modal-label">Start *</label>
              <input
                type="datetime-local"
                className={inputCls(!!errors.date)}
                value={form.date}
                onChange={e => setField('date', e.target.value)}
              />
              {errors.date && <div className="adm-modal-error">{errors.date}</div>}
            </div>
            <div>
              <label className="adm-modal-label">End</label>
              <input
                type="datetime-local"
                className={inputCls()}
                value={form.end_date}
                onChange={e => setField('end_date', e.target.value)}
              />
            </div>
          </div>

          <div>
            <label className="adm-modal-label">Type</label>
            <select className={inputCls()} value={form.type} onChange={e => setField('type', e.target.value)}>
              {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="adm-modal-grid-2">
            <div>
              <label className="adm-modal-label">Venue</label>
              <input
                className={inputCls()}
                value={form.location}
                onChange={e => setField('location', e.target.value)}
                placeholder="e.g. Factory Berlin"
              />
            </div>
            <div>
              <label className="adm-modal-label">Address</label>
              <input
                className={inputCls()}
                value={form.address}
                onChange={e => setField('address', e.target.value)}
                placeholder="e.g. Rheinsberger Str. 76"
              />
            </div>
          </div>

          <div>
            <label className="adm-modal-label">Description</label>
            <textarea
              className={`${inputCls()} adm-modal-textarea`}
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              placeholder="What's this event about?"
            />
          </div>

          {/* Ticket pricing */}
          <div>
            <label className="adm-modal-label">Tickets</label>
            <div className="adm-ticket-toggle">
              <button
                type="button"
                className={`adm-ticket-opt${form.is_free ? ' active' : ''}`}
                onClick={() => setForm(f => ({ ...f, is_free: true, ticket_price: '' }))}
              >
                Free
              </button>
              <button
                type="button"
                className={`adm-ticket-opt${!form.is_free ? ' active' : ''}`}
                onClick={() => setForm(f => ({ ...f, is_free: false }))}
              >
                Paid
              </button>
            </div>
            {!form.is_free && (
              <div className="adm-ticket-price-wrap">
                <span className="adm-ticket-currency">€</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className={`${inputCls()} adm-ticket-price-input`}
                  value={form.ticket_price}
                  onChange={e => setField('ticket_price', e.target.value)}
                  placeholder="0.00"
                />
              </div>
            )}
          </div>

          <div>
            <label className="adm-modal-label">Luma URL</label>
            <input
              className={inputCls()}
              value={form.luma_url}
              onChange={e => setField('luma_url', e.target.value)}
              placeholder="https://lu.ma/…"
            />
          </div>

          <div className="adm-modal-footer">
            <div />
            <div className="adm-modal-actions">
              <button type="button" className="adm-btn adm-btn-md adm-btn-ghost" onClick={cancelEdit}>
                Cancel
              </button>
              <button
                type="submit"
                className="adm-btn adm-btn-lg adm-btn-navy"
                disabled={saving}
                style={{ opacity: saving ? 0.6 : 1, cursor: saving ? 'default' : 'pointer' }}
              >
                {saving ? 'Saving…' : isNew ? 'Create event' : 'Save'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  )
}

// ── Health bands ─────────────────────────────────────────────────────────────

type Band = { label: string; color: string; bg: string; min: number }
const BANDS: Band[] = [
  { label: 'Critical', color: '#e0524f', bg: 'rgba(224,82,79,0.10)',   min: 0  },
  { label: 'Poor',     color: '#f4822a', bg: 'rgba(244,130,42,0.10)',  min: 21 },
  { label: 'Fair',     color: '#f4c430', bg: 'rgba(244,196,48,0.12)',  min: 41 },
  { label: 'Good',     color: '#3b6dd9', bg: 'rgba(59,109,217,0.10)',  min: 61 },
  { label: 'Awesome',  color: '#34d27b', bg: 'rgba(52,210,123,0.10)',  min: 81 },
]
function getBand(score: number): Band {
  return [...BANDS].reverse().find(b => score >= b.min) || BANDS[0]
}

function HealthScore({ score, enoughData, signals, pastEvents }: {
  score: number
  enoughData: boolean
  signals: { label: string; value: number; weight: number }[]
  pastEvents: number
}) {
  const band = getBand(score)

  const R = 72, CX = 96, CY = 96, STROKE = 10
  const START_DEG = 195, SWEEP = 210
  const toRad = (d: number) => (d * Math.PI) / 180
  const arcPoint = (deg: number) => ({ x: CX + R * Math.cos(toRad(deg)), y: CY + R * Math.sin(toRad(deg)) })
  const describeArc = (startDeg: number, sweepDeg: number) => {
    const s = arcPoint(startDeg)
    const e = arcPoint(startDeg + sweepDeg)
    const large = sweepDeg > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`
  }
  const filledSweep = enoughData ? (score / 100) * SWEEP : 0
  const bandTicks = BANDS.slice(1).map(b => START_DEG + (b.min / 100) * SWEEP)

  return (
    <div className="mkw-card">
      <div className="mkw-h3" style={{ marginBottom: 20 }}><span>Community health</span></div>

      {!enoughData ? (
        <div className="adm-hs-nodata">
          <div className="adm-hs-nodata-emoji">📊</div>
          <div className="adm-hs-nodata-title">Not enough data yet</div>
          <div className="adm-hs-nodata-sub">
            Health score appears after <strong>3 past events</strong>. You have {pastEvents} so far.
          </div>
        </div>
      ) : (
        <div className="adm-hs-grid">
          {/* Gauge */}
          <div className="adm-gauge">
            <svg width={192} height={120} viewBox="0 0 192 120" style={{ overflow: 'visible' }}>
              <path d={describeArc(START_DEG, SWEEP)} fill="none" stroke="var(--hairline)" strokeWidth={STROKE} strokeLinecap="round" />
              {filledSweep > 0 && (
                <path
                  d={describeArc(START_DEG, filledSweep)}
                  fill="none" stroke={band.color} strokeWidth={STROKE} strokeLinecap="round"
                  style={{ transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)' }}
                />
              )}
              {bandTicks.map((deg, i) => {
                const inner = { x: CX + (R - STROKE) * Math.cos(toRad(deg)), y: CY + (R - STROKE) * Math.sin(toRad(deg)) }
                const outer = { x: CX + (R + STROKE) * Math.cos(toRad(deg)), y: CY + (R + STROKE) * Math.sin(toRad(deg)) }
                return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="white" strokeWidth={2} />
              })}
              <text x={CX} y={CY - 2} textAnchor="middle" dominantBaseline="middle"
                style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, fill: band.color }}>
                {score}
              </text>
              <text x={CX} y={CY + 20} textAnchor="middle"
                style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, fill: 'var(--ink-3)', letterSpacing: 1 }}>
                / 100
              </text>
            </svg>

            <div className="adm-gauge-band-label" style={{ background: band.bg, color: band.color }}>
              {band.label}
            </div>

            <div className="adm-gauge-scale">
              {BANDS.map(b => (
                <div key={b.label} className="adm-gauge-scale-item">
                  <div className="adm-gauge-scale-bar" style={{ background: score >= b.min ? b.color : 'var(--hairline)' }} />
                  <div className="adm-gauge-scale-lbl" style={{ color: score >= b.min ? b.color : 'var(--ink-3)' }}>{b.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Signal bars */}
          <div className="adm-signals">
            {signals.map(s => (
              <div key={s.label}>
                <div className="adm-signal-hdr">
                  <span className="adm-signal-lbl">{s.label}</span>
                  <div className="adm-signal-vals">
                    <span className="adm-signal-pct">{s.value}%</span>
                    <span className="adm-signal-wt">{s.weight}% weight</span>
                  </div>
                </div>
                <div className="adm-signal-track">
                  <div className="adm-signal-fill" style={{ width: `${s.value}%`, background: getBand(s.value).color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function RoleBreakdown({ members }: { members: OrgMember[] }) {
  const counts = new Map<string, number>()
  for (const m of members) counts.set(m.profile?.role_category || 'unknown', (counts.get(m.profile?.role_category || 'unknown') || 0) + 1)
  const total = members.length || 1
  const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])
  const barColors = ['#fcb813', '#7a4ed8', '#3b6dd9', '#a587f0', '#0a1340', '#34d27b']
  return (
    <div className="adm-rb">
      {sorted.map(([role, count], i) => (
        <div key={role} className="adm-rb-row">
          <div className="adm-rb-lbl">{role}</div>
          <div className="adm-rb-track">
            <div className="adm-rb-fill" style={{ width: `${(count / total) * 100}%`, background: barColors[i % barColors.length] }} />
          </div>
          <div className="adm-rb-count">{count}</div>
        </div>
      ))}
    </div>
  )
}

function AtRiskList({ members }: { members: OrgMember[] }) {
  const AV = [{ bg: '#fcb813', fg: '#0a1340' }, { bg: '#7a4ed8', fg: '#fff' }, { bg: '#3b6dd9', fg: '#fff' }, { bg: '#0a1340', fg: '#fff' }, { bg: '#a587f0', fg: '#0a1340' }]
  return (
    <div className="mkw-card">
      <div className="mkw-h3" style={{ marginBottom: 4 }}>
        <span style={{ color: 'var(--danger)' }}>At-risk members</span>
        <span className="adm-atrisk-count">{members.length} quiet 60+ days</span>
      </div>
      <p className="adm-atrisk-desc">Attended at least once, then no RSVP in 60+ days.</p>
      <div className="mkw-rows">
        {members.map((m, i) => {
          const av = AV[i % AV.length]
          return (
            <div key={m.id} className="mkw-row">
              <div className="mkw-row-av" style={{ background: av.bg, color: av.fg }}>{getInitials(m.profile?.full_name)}</div>
              <div className="mkw-row-main">
                <div className="mkw-row-name">{m.profile?.full_name || '(no name)'}</div>
                <div className="mkw-row-meta">{m.profile?.role_category || '—'} · {m.events_attended} event{m.events_attended !== 1 ? 's' : ''} attended</div>
              </div>
              <span className="adm-atrisk-lastseen">Last seen {lastEventRelative(m.last_seen)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
