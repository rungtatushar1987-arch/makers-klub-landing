import React, { useState, useEffect, useCallback } from 'react'
import { useUser, useSession } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { getSupabaseClient, getInitials, type Profile, type Event } from '../supabase'

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

type Tab = 'members' | 'events' | 'analytics'

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

  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('members')
  const [search, setSearch] = useState('')

  // Members tab
  const [members, setMembers] = useState<OrgMember[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [togglingPaying, setTogglingPaying] = useState<string | null>(null)

  // Events tab
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [eventsLoading, setEventsLoading] = useState(true)
  const [eventFormOpen, setEventFormOpen] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<AdminEvent | null>(null)
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null)

  // Stats
  const [stats, setStats] = useState({
    totalMembers: 0, totalEvents: 0, totalRsvps: 0,
    pastEvents: 0, uniqueRsvpers: 0, membersWithConnections: 0,
  })

  // ── Derived signal scores (each 0–100) ──────────────────────────────────────
  // RSVP rate (35%): % of members that typically register per event
  const rsvpRate = stats.totalMembers > 0 && stats.pastEvents > 0
    ? Math.min(100, Math.round((stats.totalRsvps / (stats.totalMembers * stats.pastEvents)) * 100))
    : 0
  // Member reach (25%): % of members who have ever RSVPd
  const memberReach = stats.totalMembers > 0
    ? Math.min(100, Math.round((stats.uniqueRsvpers / stats.totalMembers) * 100))
    : 0
  // Connection rate (30%): % of members who have made at least one connection
  const connectionRate = stats.totalMembers > 0
    ? Math.min(100, Math.round((stats.membersWithConnections / stats.totalMembers) * 100))
    : 0
  // Repeat attendance (10%): % of RSVPs from members who attended more than once
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

  // RSVP rate shown in stats bar
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
    const { data, error } = await db.from('events').update(fields).eq('id', id).select().single()
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
    <div className="mkw-loading" style={{ color: 'var(--ink-3)', fontFamily: 'var(--font-display)' }}>Checking access…</div>
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
      {/* Page head */}
      <div className="mkw-pagehead">
        <div>
          <div className="eyebrow">Organiser</div>
          <h1>Dashboard</h1>
        </div>
        <div className="actions">
          <span style={{
            fontSize: 11, fontFamily: 'var(--font-display)', fontWeight: 700,
            letterSpacing: 1.5, textTransform: 'uppercase',
            color: 'var(--mk-yellow-deep)', background: 'rgba(252,184,19,0.14)',
            padding: '5px 14px', borderRadius: 999,
          }}>
            Makers Klub · Admin
          </span>
        </div>
      </div>

      <div className="mkw-main-body">

        {/* Stats bar */}
        <div className="mkw-stats" style={{ marginBottom: 28 }}>
          {[
            { lbl: 'Members',    num: stats.totalMembers,    delta: 'In your community' },
            { lbl: 'Events',     num: stats.totalEvents,     delta: 'Total hosted' },
            { lbl: 'RSVP rate',   num: `${engagementPct}%`,   delta: 'members typically rsvp for your events' },

          ].map(s => (
            <div key={s.lbl} className="mkw-stat">
              <div className="lbl">{s.lbl}</div>
              <div className="num" style={s.danger ? { color: 'var(--danger)' } : undefined}>{s.num}</div>
              <div className="delta">{s.delta}</div>
            </div>
          ))}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24, alignItems: 'center' }}>
          {(['members', 'events', 'analytics'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '9px 20px', borderRadius: 999,
              border: tab === t ? 'none' : '1.5px solid var(--hairline-strong)',
              background: tab === t ? 'var(--mk-navy)' : 'var(--glass-bg)',
              color: tab === t ? '#fff' : 'var(--ink-2)',
              fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', backdropFilter: 'blur(12px)', transition: 'all 0.15s',
            }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
          {tab === 'events' && (
            <button
              onClick={() => setEventFormOpen(true)}
              style={{
                marginLeft: 'auto', padding: '9px 22px', borderRadius: 999, border: 'none',
                background: 'var(--mk-navy)', color: '#fff',
                fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              + Add event
            </button>
          )}
        </div>

        {/* ══ MEMBERS ══ */}
        {tab === 'members' && (
          <>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search members…"
              style={{
                display: 'block', width: '100%', maxWidth: 360, marginBottom: 20,
                padding: '11px 18px', border: '1.5px solid var(--hairline-strong)',
                borderRadius: 999, background: 'var(--glass-bg-strong)',
                backdropFilter: 'blur(12px)', color: 'var(--ink-1)',
                fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
              }}
            />
            {membersLoading ? (
              <p style={{ color: 'var(--ink-3)', fontSize: 14, padding: '48px 0', textAlign: 'center' }}>Loading…</p>
            ) : (
              <div className="mkw-card" style={{ padding: 0, overflow: 'hidden' }}>
                <MemberTableHead />
                {filteredMembers.length === 0 && (
                  <p style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>No members found.</p>
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
            {eventsLoading ? (
              <p style={{ color: 'var(--ink-3)', fontSize: 14, padding: '48px 0', textAlign: 'center' }}>Loading…</p>
            ) : (
              <div className="mkw-card" style={{ padding: 0, overflow: 'hidden' }}>
                <EventTableHead />
                {events.length === 0 && (
                  <p style={{ padding: '32px 20px', textAlign: 'center', color: 'var(--ink-3)', fontSize: 14 }}>No events yet. Add your first one.</p>
                )}
                {events.map(e => (
                  <EventRow key={e.id} event={e} onClick={() => setSelectedEvent(e)} />
                ))}
              </div>
            )}
            {(eventFormOpen || selectedEvent) && (
              <EventFormModal
                event={selectedEvent}
                deleting={!!selectedEvent && deletingEventId === selectedEvent.id}
                onSave={(fields) => selectedEvent ? updateEvent(selectedEvent.id, fields) : createEvent(fields)}
                onDelete={selectedEvent ? () => deleteEvent(selectedEvent.id) : undefined}
                onClose={() => { setEventFormOpen(false); setSelectedEvent(null) }}
              />
            )}
          </>
        )}

        {/* ══ ANALYTICS ══ */}
        {tab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
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

const COL_MEMBERS = '1fr 100px 110px 120px 80px 80px 100px'
const COL_EVENTS  = '48px 1fr 140px 72px 80px'

function MemberTableHead() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: COL_MEMBERS, gap: 8, padding: '12px 20px', borderBottom: '1px solid var(--hairline)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ink-3)' }}>
      <span>Member</span><span>Role</span>
      <span style={{ textAlign: 'center' }}>Events attended</span>
      <span style={{ textAlign: 'center' }}>Last event attended</span>
      <span style={{ textAlign: 'center' }}>Connections</span>
      <span style={{ textAlign: 'center' }}>Paying</span>
      <span style={{ textAlign: 'center' }}>Engagement</span>
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
    <div
      style={{ display: 'grid', gridTemplateColumns: COL_MEMBERS, gap: 8, padding: '14px 20px', alignItems: 'center', borderBottom: '1px solid var(--hairline)', transition: 'background 0.12s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >
      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, flexShrink: 0, background: av.bg, color: av.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700 }}>
          {getInitials(m.profile?.full_name)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--ink-1)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {m.profile?.full_name || '(no name)'}
            {m.org_role === 'owner' && <span style={{ marginLeft: 6, fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase', background: 'rgba(252,184,19,0.18)', color: 'var(--mk-yellow-deep)', padding: '2px 7px', borderRadius: 999 }}>Owner</span>}
          </div>
          <div style={{ fontSize: 11, color: 'var(--ink-3)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>{m.profile?.bio || '—'}</div>
        </div>
      </div>

      {/* Role category */}
      <div>
        {m.profile?.role_category
          ? <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999, background: 'rgba(122,78,216,0.12)', color: 'var(--mk-violet)' }}>{m.profile.role_category}</span>
          : <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>—</span>}
      </div>

      {/* Events attended + attendance % */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: m.events_attended > 0 ? 'var(--ink-1)' : 'var(--ink-3)' }}>
          {m.events_attended}
        </span>
        {pastEvents > 0 && (
          <span style={{ fontSize: 11, color: 'var(--ink-3)', marginLeft: 4 }}>({attendancePct}%)</span>
        )}
      </div>

      {/* Last event attended */}
      <div style={{ textAlign: 'center', fontSize: 12, color: isAtRisk ? 'var(--danger)' : 'var(--ink-3)' }}>
        {lastEventRelative(m.last_seen)}
      </div>

      {/* Connections made */}
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color: m.connections_made > 0 ? 'var(--mk-violet)' : 'var(--ink-3)' }}>
        {m.connections_made}
      </div>

      {/* Paying toggle */}
      <div style={{ textAlign: 'center' }}>
        <button onClick={onTogglePaying} disabled={toggling} style={{
          padding: '4px 12px', borderRadius: 999,
          border: m.is_paying ? 'none' : '1.5px solid var(--hairline-strong)',
          background: m.is_paying ? 'rgba(52,210,123,0.15)' : 'transparent',
          color: m.is_paying ? '#1a7a4a' : 'var(--ink-3)',
          fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
          cursor: 'pointer', opacity: toggling ? 0.5 : 1,
        }}>
          {m.is_paying ? '✓ Paying' : 'Free'}
        </button>
      </div>

      {/* Engagement score badge */}
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999, background: engBand.bg, color: engBand.color }}>
          {engBand.label}
        </span>
        {m.events_attended > 0 && (
          <div style={{ fontSize: 9, color: 'var(--ink-3)', marginTop: 3, fontFamily: 'var(--font-display)' }}>{score}/100</div>
        )}
      </div>
    </div>
  )
}

function EventTableHead() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: COL_EVENTS, gap: 8, padding: '12px 20px', borderBottom: '1px solid var(--hairline)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ink-3)' }}>
      <span />
      <span>Event</span><span>Location</span>
      <span style={{ textAlign: 'center' }}>RSVPs</span>
      <span style={{ textAlign: 'center' }}>Status</span>
    </div>
  )
}

function EventRow({ event: e, onClick }: { event: AdminEvent; onClick: () => void }) {
  const isPast = new Date(e.date) < new Date()
  const day = new Date(e.date).getDate()
  const mon = new Date(e.date).toLocaleString('en', { month: 'short' }).toUpperCase()
  return (
    <div
      onClick={onClick}
      style={{ display: 'grid', gridTemplateColumns: COL_EVENTS, gap: 8, padding: '14px 20px', alignItems: 'center', borderBottom: '1px solid var(--hairline)', opacity: isPast ? 0.75 : 1, transition: 'background 0.12s', cursor: 'pointer' }}
      onMouseEnter={ev => (ev.currentTarget.style.background = 'rgba(255,255,255,0.5)')}
      onMouseLeave={ev => (ev.currentTarget.style.background = '')}
    >
      <div style={{ width: 40, height: 44, borderRadius: 10, background: isPast ? 'rgba(12,19,48,0.06)' : 'var(--mk-navy)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, lineHeight: 1, color: isPast ? 'var(--ink-3)' : '#fff' }}>{day}</div>
        <div style={{ fontSize: 7, letterSpacing: 1.2, fontWeight: 700, color: isPast ? 'var(--ink-3)' : 'var(--mk-yellow)', marginTop: 2 }}>{mon}</div>
      </div>
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: 'var(--ink-1)', marginBottom: 3 }}>{e.title}</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {e.type && <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '2px 8px', borderRadius: 999, background: 'rgba(12,19,48,0.07)', color: 'var(--ink-2)' }}>{e.type}</span>}
          <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>{formatDate(e.date)}</span>
        </div>
      </div>
      <div style={{ fontSize: 12, color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.location || '—'}</div>
      <div style={{ textAlign: 'center', fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--ink-1)' }}>{e.rsvp_count}</div>
      <div style={{ textAlign: 'center' }}>
        {isPast
          ? <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999, background: 'rgba(12,19,48,0.07)', color: 'var(--ink-3)' }}>Past</span>
          : <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999, background: 'rgba(52,210,123,0.12)', color: '#1a7a4a' }}>Upcoming</span>}
      </div>
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
}

const BLANK_FORM: EventFormFields = {
  title: '', date: '', end_date: '', location: '', address: '',
  type: 'Networking', description: '', luma_url: '',
}

const EVENT_TYPES = ['Networking', 'Workshop', 'Social', 'Panel', 'Fireside', 'Hackathon', 'Other']

function toLocalDatetime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function EventFormModal({ event, deleting, onSave, onDelete, onClose }: {
  event: AdminEvent | null
  deleting: boolean
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
    })
    setSaving(false)
  }

  const readOnly = !isEditing

  const inputStyle = (hasError?: boolean): React.CSSProperties => ({
    width: '100%', padding: '10px 14px', borderRadius: 10,
    border: `1.5px solid ${hasError ? 'var(--danger)' : readOnly ? 'transparent' : 'var(--hairline-strong)'}`,
    background: readOnly ? 'transparent' : 'var(--glass-bg-strong)',
    color: 'var(--ink-1)',
    fontFamily: 'var(--font-body)', fontSize: 14, outline: 'none',
    boxSizing: 'border-box',
    cursor: readOnly ? 'default' : 'text',
  })
  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700,
    letterSpacing: 1.4, textTransform: 'uppercase', color: 'var(--ink-3)',
    marginBottom: 6, display: 'block',
  }
  const errStyle: React.CSSProperties = { fontSize: 11, color: 'var(--danger)', marginTop: 4 }

  const isPast = event ? new Date(event.date) < new Date() : false

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(10,19,64,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', zIndex: 201,
        transform: 'translate(-50%, -50%)',
        width: 'min(560px, calc(100vw - 48px))',
        maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
        background: 'var(--surface)',
        backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        border: '1px solid var(--glass-border)', borderRadius: 20,
        boxShadow: '0 32px 80px rgba(10,19,64,0.22), 0 0 0 1px rgba(255,255,255,0.5)',
        padding: 32,
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', background: 'rgba(12,19,48,0.08)', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--ink-1)', margin: 0, flex: 1 }}>
            {isNew ? 'New event' : isEditing ? 'Edit event' : form.title}
          </h2>
          {!isNew && !isEditing && (
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', padding: '3px 9px', borderRadius: 999, background: isPast ? 'rgba(12,19,48,0.07)' : 'rgba(52,210,123,0.12)', color: isPast ? 'var(--ink-3)' : '#1a7a4a' }}>
              {isPast ? 'Past' : 'Upcoming'}
            </span>
          )}
        </div>

        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <label style={labelStyle}>Title {isEditing && '*'}</label>
            <input style={inputStyle(!!errors.title)} value={form.title} onChange={e => setField('title', e.target.value)} placeholder="e.g. Makers Drinks #12" readOnly={readOnly} />
            {errors.title && <div style={errStyle}>{errors.title}</div>}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Start {isEditing && '*'}</label>
              <input type="datetime-local" style={inputStyle(!!errors.date)} value={form.date} onChange={e => setField('date', e.target.value)} readOnly={readOnly} />
              {errors.date && <div style={errStyle}>{errors.date}</div>}
            </div>
            <div>
              <label style={labelStyle}>End</label>
              <input type="datetime-local" style={inputStyle()} value={form.end_date} onChange={e => setField('end_date', e.target.value)} readOnly={readOnly} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Type</label>
            {readOnly
              ? <div style={{ fontSize: 14, color: 'var(--ink-1)', padding: '10px 0', fontFamily: 'var(--font-body)' }}>{form.type || '—'}</div>
              : <select style={inputStyle()} value={form.type} onChange={e => setField('type', e.target.value)}>
                  {EVENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            }
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Venue</label>
              <input style={inputStyle()} value={form.location} onChange={e => setField('location', e.target.value)} placeholder="e.g. Factory Berlin" readOnly={readOnly} />
            </div>
            <div>
              <label style={labelStyle}>Address</label>
              <input style={inputStyle()} value={form.address} onChange={e => setField('address', e.target.value)} placeholder="e.g. Rheinsberger Str. 76" readOnly={readOnly} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle(), resize: isEditing ? 'vertical' : 'none', minHeight: 88 }}
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              placeholder={isEditing ? "What's this event about?" : ''}
              readOnly={readOnly}
            />
          </div>

          <div>
            <label style={labelStyle}>Luma URL</label>
            {readOnly
              ? <div style={{ fontSize: 13, color: 'var(--mk-violet)', padding: '10px 0', fontFamily: 'var(--font-body)', wordBreak: 'break-all' }}>
                  {form.luma_url ? <a href={form.luma_url} target="_blank" rel="noreferrer" style={{ color: 'var(--mk-violet)' }}>{form.luma_url}</a> : '—'}
                </div>
              : <input style={inputStyle()} value={form.luma_url} onChange={e => setField('luma_url', e.target.value)} placeholder="https://lu.ma/…" />
            }
          </div>

          {/* Footer buttons */}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'space-between', alignItems: 'center', marginTop: 4, paddingTop: 4, borderTop: '1px solid var(--hairline)' }}>
            {/* Left side: Remove */}
            <div>
              {!isNew && onDelete && !isEditing && (
                confirmDelete ? (
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>Delete this event?</span>
                    <button
                      type="button"
                      onClick={onDelete}
                      disabled={deleting}
                      style={{ padding: '7px 16px', borderRadius: 999, border: 'none', background: 'rgba(224,82,79,0.15)', color: 'var(--danger)', fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: deleting ? 0.5 : 1 }}
                    >
                      {deleting ? 'Removing…' : 'Yes, remove'}
                    </button>
                    <button type="button" onClick={() => setConfirmDelete(false)} style={{ padding: '7px 16px', borderRadius: 999, border: '1.5px solid var(--hairline-strong)', background: 'transparent', color: 'var(--ink-2)', fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button type="button" onClick={() => setConfirmDelete(true)} style={{ padding: '9px 18px', borderRadius: 999, border: 'none', background: 'rgba(224,82,79,0.10)', color: 'var(--danger)', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Remove
                  </button>
                )
              )}
            </div>

            {/* Right side: Edit / Save / Cancel */}
            <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
              {isEditing ? (
                <>
                  <button type="button" onClick={cancelEdit} style={{ padding: '9px 20px', borderRadius: 999, border: '1.5px solid var(--hairline-strong)', background: 'transparent', color: 'var(--ink-2)', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving} style={{ padding: '9px 22px', borderRadius: 999, border: 'none', background: 'var(--mk-navy)', color: '#fff', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
                    {saving ? 'Saving…' : isNew ? 'Create event' : 'Save'}
                  </button>
                </>
              ) : (
                <button type="button" onClick={() => setIsEditing(true)} style={{ padding: '9px 22px', borderRadius: 999, border: 'none', background: 'var(--mk-navy)', color: '#fff', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
                  Edit
                </button>
              )}
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

  // SVG arc params
  const R = 72
  const CX = 96
  const CY = 96
  const STROKE = 10
  // Arc spans 210° — from 195° to 345° (bottom-left to bottom-right)
  const START_DEG = 195
  const SWEEP = 210
  const toRad = (d: number) => (d * Math.PI) / 180
  const arcPoint = (deg: number) => ({
    x: CX + R * Math.cos(toRad(deg)),
    y: CY + R * Math.sin(toRad(deg)),
  })
  const describeArc = (startDeg: number, sweepDeg: number) => {
    const s = arcPoint(startDeg)
    const e = arcPoint(startDeg + sweepDeg)
    const large = sweepDeg > 180 ? 1 : 0
    return `M ${s.x} ${s.y} A ${R} ${R} 0 ${large} 1 ${e.x} ${e.y}`
  }
  const filledSweep = enoughData ? (score / 100) * SWEEP : 0

  // Tick marks at band boundaries
  const bandTicks = BANDS.slice(1).map(b => START_DEG + (b.min / 100) * SWEEP)

  return (
    <div className="mkw-card">
      <div className="mkw-h3" style={{ marginBottom: 20 }}><span>Community health</span></div>

      {!enoughData ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 0', gap: 10 }}>
          <div style={{ fontSize: 36 }}>📊</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 700, color: 'var(--ink-2)' }}>Not enough data yet</div>
          <div style={{ fontSize: 13, color: 'var(--ink-3)', textAlign: 'center', maxWidth: 320 }}>
            Health score appears after <strong>3 past events</strong>. You have {pastEvents} so far.
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 40, alignItems: 'center' }}>

          {/* ── Gauge ── */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0 }}>
            <svg width={192} height={120} viewBox="0 0 192 120" style={{ overflow: 'visible' }}>
              {/* Track */}
              <path
                d={describeArc(START_DEG, SWEEP)}
                fill="none" stroke="var(--hairline)" strokeWidth={STROKE}
                strokeLinecap="round"
              />
              {/* Filled arc */}
              {filledSweep > 0 && (
                <path
                  d={describeArc(START_DEG, filledSweep)}
                  fill="none" stroke={band.color} strokeWidth={STROKE}
                  strokeLinecap="round"
                  style={{ transition: 'all 0.6s cubic-bezier(0.4,0,0.2,1)' }}
                />
              )}
              {/* Band tick marks */}
              {bandTicks.map((deg, i) => {
                const inner = { x: CX + (R - STROKE) * Math.cos(toRad(deg)), y: CY + (R - STROKE) * Math.sin(toRad(deg)) }
                const outer = { x: CX + (R + STROKE) * Math.cos(toRad(deg)), y: CY + (R + STROKE) * Math.sin(toRad(deg)) }
                return <line key={i} x1={inner.x} y1={inner.y} x2={outer.x} y2={outer.y} stroke="white" strokeWidth={2} />
              })}
              {/* Centre score */}
              <text x={CX} y={CY - 2} textAnchor="middle" dominantBaseline="middle"
                style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, fill: band.color }}>
                {score}
              </text>
              <text x={CX} y={CY + 20} textAnchor="middle"
                style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, fill: 'var(--ink-3)', letterSpacing: 1 }}>
                / 100
              </text>
            </svg>

            {/* Band label */}
            <div style={{
              marginTop: -8,
              padding: '5px 18px', borderRadius: 999,
              background: band.bg,
              fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 800,
              color: band.color, letterSpacing: 0.3,
            }}>
              {band.label}
            </div>

            {/* Band scale */}
            <div style={{ display: 'flex', gap: 4, marginTop: 14 }}>
              {BANDS.map(b => (
                <div key={b.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: 24, height: 4, borderRadius: 999, background: score >= b.min ? b.color : 'var(--hairline)' }} />
                  <div style={{ fontSize: 8, fontFamily: 'var(--font-display)', fontWeight: 700, color: score >= b.min ? b.color : 'var(--ink-3)', letterSpacing: 0.3 }}>{b.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Signal bars ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {signals.map(s => (
              <div key={s.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                  <span style={{ fontSize: 13, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ink-2)' }}>{s.label}</span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontSize: 15, fontFamily: 'var(--font-display)', fontWeight: 800, color: 'var(--ink-1)' }}>{s.value}%</span>
                    <span style={{ fontSize: 10, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ink-3)' }}>{s.weight}% weight</span>
                  </div>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'var(--hairline)', overflow: 'hidden' }}>
                  <div style={{
                    width: `${s.value}%`, height: '100%', borderRadius: 999,
                    background: getBand(s.value).color,
                    transition: 'width 0.5s cubic-bezier(0.4,0,0.2,1)',
                  }} />
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {sorted.map(([role, count], i) => (
        <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 90, fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--ink-2)', textAlign: 'right', flexShrink: 0, textTransform: 'capitalize' }}>{role}</div>
          <div style={{ flex: 1, height: 10, borderRadius: 999, background: 'var(--hairline)', overflow: 'hidden' }}>
            <div style={{ width: `${(count / total) * 100}%`, height: '100%', borderRadius: 999, background: barColors[i % barColors.length] }} />
          </div>
          <div style={{ width: 28, fontSize: 12, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--ink-1)', flexShrink: 0 }}>{count}</div>
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
        <span style={{ fontSize: 11, color: 'var(--danger)', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{members.length} quiet 60+ days</span>
      </div>
      <p style={{ fontSize: 13, color: 'var(--ink-3)', marginBottom: 16, fontFamily: 'var(--font-body)' }}>Attended at least once, then no RSVP in 60+ days.</p>
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
              <span style={{ fontSize: 11, color: 'var(--danger)', flexShrink: 0, fontFamily: 'var(--font-body)' }}>Last seen {lastEventRelative(m.last_seen)}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
