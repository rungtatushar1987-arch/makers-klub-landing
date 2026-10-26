import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from '@clerk/clerk-react'
import { getSupabaseClient } from '../supabase'

type Contact = {
  luma_user_id: string; email: string; person_key: string | null; name: string | null
  joined_at: string | null
}
type Registration = { luma_event_id: string; contact_email: string; approval_status: string | null; is_registration: boolean; checked_in_at: string | null; order_amount_cents: number | null; order_refunded_cents: number | null; linkedin_url: string | null }

// A person is active when they attended at least ACTIVE_MIN_EVENTS events in the last ACTIVE_WINDOW_MONTHS
// months. Attended = approved registration (check-ins are not recorded for online events).
const ACTIVE_WINDOW_MONTHS = 3
const ACTIVE_MIN_EVENTS = 2

type LumaEvent = { luma_event_id: string; start_at: string | null }

// Engagement score, 0-100, per person:
//   Attendance 40  = 20 for events attended (ATTEND_FULL_AT or more) + 20 for being active lately (ACTIVE_MIN_EVENTS in the window)
//   Showing up 30  = 10 for events registered for (REGISTER_FULL_AT or more) + 20 for checking in after registering
//   Spend 30       = net EUR spent on tickets, linear up to SPEND_FULL_AT
// Check-ins are only recorded for some in-person events, so follow-through is judged only on events that have
// any check-ins; someone with no such events gets half marks, and someone with no attended events gets none.
const ATTEND_FULL_AT = 5
const REGISTER_FULL_AT = 5
const SPEND_FULL_AT_CENTS = 5000

type Score = { total: number; attendance: number; showingUp: number; spend: number }
const part = (value: number, fullAt: number, points: number) => Math.min(value, fullAt) / fullAt * points

// One row per person: contacts that share a person_key are the same person with several emails.
type Row = {
  key: string; name: string | null; emails: string[]; revenue_eur_cents: number; refunded_eur_cents: number; joined_at: string | null
  approved_events: number; recent_events: number; active: boolean; checked_in: number; linkedin: string | null
  engagement: number; score: Score
}
type SortKey = 'name' | 'engagement' | 'approved_events' | 'recent_events' | 'revenue_eur_cents'

// PostgREST caps responses at 1000 rows, so page through.
async function fetchAll<T>(db: ReturnType<typeof getSupabaseClient>, table: string, cols: string): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db.from(table).select(cols).range(from, from + 999)
    if (error) throw error
    out.push(...(data as T[]))
    if (!data || data.length < 1000) return out
  }
}

// The Solopreneurs Club LinkedIn follower count. Update by hand; LinkedIn has no feed we can read.
const LINKEDIN_FOLLOWERS = 407

// All-time ticket sales from Luma > Payment, in EUR. Luma's API doesn't expose this total, so update by hand.
// The per-person revenue column below sums the orders we could load (EUR 685), which is slightly lower.
const LUMA_TICKET_REVENUE_EUR = 720

const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)

export default function CommunityDashboard() {
  const { session } = useSession()
  const [contacts, setContacts] = useState<Contact[]>([])
  // People on the Luma calendar's list; excludes guests who only appear on event guest lists (raw is null).
  const [registeredPeople, setRegisteredPeople] = useState(0)
  const [regs, setRegs] = useState<Registration[]>([])
  const [events, setEvents] = useState<LumaEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'engagement', dir: -1 })

  const load = useCallback(async () => {
    try {
      const db = getSupabaseClient(await session?.getToken())
      const [c, r, e] = await Promise.all([
        fetchAll<Contact>(db, 'luma_contacts', 'luma_user_id,email,person_key,name,joined_at'),
        fetchAll<Registration>(db, 'luma_guest_registrations', 'luma_event_id,contact_email,approval_status,is_registration,checked_in_at,order_amount_cents,order_refunded_cents,linkedin_url'),
        fetchAll<LumaEvent>(db, 'luma_events', 'luma_event_id,start_at'),
      ])
      const { count } = await db.from('luma_contacts').select('luma_user_id', { count: 'exact', head: true }).not('raw', 'is', null)
      setContacts(c); setRegs(r); setEvents(e); setRegisteredPeople(count ?? 0); setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { load() }, [load])

  // Events held in the activity window (past events only).
  const windowEvents = useMemo(() => {
    const now = new Date()
    const from = new Date(now)
    from.setMonth(from.getMonth() - ACTIVE_WINDOW_MONTHS)
    return new Set(events.filter(e => e.start_at && new Date(e.start_at) < now && new Date(e.start_at) >= from).map(e => e.luma_event_id))
  }, [events])

  // Events where check-ins were recorded at all.
  const trackedEvents = useMemo(() => new Set(regs.filter(r => r.checked_in_at).map(r => r.luma_event_id)), [regs])

  const rows: Row[] = useMemo(() => {
    const keyOf = new Map(contacts.map(c => [c.email, c.person_key ?? c.email]))
    const people = new Map<string, Contact[]>()
    for (const c of contacts) {
      const k = c.person_key ?? c.email
      people.set(k, [...(people.get(k) ?? []), c])
    }
    const stats = new Map<string, { events: Set<string>; recent: Set<string>; registered: Set<string>; checkedEvents: Set<string>; checkedIn: number; paidCents: number; refundedCents: number; linkedin: string | null }>()
    for (const r of regs) {
      const k = keyOf.get(r.contact_email) ?? r.contact_email
      const st = stats.get(k) ?? { events: new Set<string>(), recent: new Set<string>(), registered: new Set<string>(), checkedEvents: new Set<string>(), checkedIn: 0, paidCents: 0, refundedCents: 0, linkedin: null }
      if (r.approval_status === 'approved') {
        st.events.add(r.luma_event_id)
        if (windowEvents.has(r.luma_event_id)) st.recent.add(r.luma_event_id)
      }
      // Gross captured EUR orders, as Luma's Payment page counts them (includes later-refunded and declined guests).
      st.paidCents += r.order_amount_cents ?? 0
      st.refundedCents += r.order_refunded_cents ?? 0
      if (r.is_registration) st.registered.add(r.luma_event_id)
      if (r.checked_in_at) { st.checkedIn++; st.checkedEvents.add(r.luma_event_id) }
      if (r.linkedin_url) st.linkedin = r.linkedin_url
      stats.set(k, st)
    }
    return [...people.entries()].map(([key, cs]) => {
      const st = stats.get(key)
      const approved = st?.events.size ?? 0
      const recent = st?.recent.size ?? 0
      const trackedApproved = st ? [...st.events].filter(e => trackedEvents.has(e)).length : 0
      const showedUp = st ? [...st.checkedEvents].filter(e => st.events.has(e)).length : 0
      const followThrough = approved === 0 ? 0 : trackedApproved === 0 ? 0.5 : Math.min(showedUp / trackedApproved, 1)
      const net = Math.max((st?.paidCents ?? 0) - (st?.refundedCents ?? 0), 0)
      const attendance = part(approved, ATTEND_FULL_AT, 20) + part(recent, ACTIVE_MIN_EVENTS, 20)
      const showingUp = part(st?.registered.size ?? 0, REGISTER_FULL_AT, 10) + followThrough * 20
      const spend = part(net, SPEND_FULL_AT_CENTS, 30)
      const score: Score = { attendance: Math.round(attendance), showingUp: Math.round(showingUp), spend: Math.round(spend), total: Math.round(attendance + showingUp + spend) }
      const joined = cs.map(c => c.joined_at).filter((d): d is string => !!d).sort()[0] ?? null
      return {
        key,
        name: cs.map(c => c.name).filter((n): n is string => !!n?.trim()).sort((a, b) => b.length - a.length)[0] ?? null,
        emails: cs.map(c => c.email).sort(),
        revenue_eur_cents: st?.paidCents ?? 0,
        refunded_eur_cents: st?.refundedCents ?? 0,
        joined_at: joined,
        approved_events: approved,
        recent_events: st?.recent.size ?? 0,
        active: (st?.recent.size ?? 0) >= ACTIVE_MIN_EVENTS,
        checked_in: st?.checkedIn ?? 0,
        linkedin: st?.linkedin ?? null,
        engagement: score.total,
        score,
      }
    })
  }, [contacts, regs, windowEvents, trackedEvents])

  const kpis = useMemo(() => {
    const approved = rows.reduce((s, r) => s + r.approved_events, 0)
    const checkedIn = rows.reduce((s, r) => s + r.checked_in, 0)
    return {
      total: rows.length,
      // Share of people who registered at least once that came back for a second event.
      repeat: pct(rows.filter(r => r.approved_events >= 2).length, rows.filter(r => r.approved_events >= 1).length),
      checkin: pct(checkedIn, approved),
    }
  }, [rows])

  const q = search.trim().toLowerCase()
  const tableRows = useMemo(() => {
    const list = rows.filter(r => !q || [r.name, r.emails.join(' ')].some(v => v?.toLowerCase().includes(q)))
    const { key, dir } = sort
    return list.sort((a, b) => {
      const av = (a as Json)[key] ?? '', bv = (b as Json)[key] ?? ''
      return (av < bv ? -1 : av > bv ? 1 : 0) * dir
    })
  }, [rows, q, sort])

  if (loading) return <p className="adm-tab-loading">Loading…</p>
  if (error) return <p className="adm-tab-loading">Couldn't load community data: {error}</p>
  if (!contacts.length) return <p className="adm-tab-loading">No Luma data yet — ask Claude to load it from Luma.</p>

  const th = (key: SortKey, label: string) => (
    <span className="cd-sort" onClick={() => setSort(s => ({ key, dir: s.key === key ? (-s.dir as 1 | -1) : 1 }))}>
      {label}{sort.key === key ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}
    </span>
  )

  return (
    <div className="adm-analytics">
      <div className="mkw-stats adm-stats">
        {[
          { lbl: 'Active members', num: LINKEDIN_FOLLOWERS, delta: 'LinkedIn followers' },
          { lbl: 'Registered', num: registeredPeople, delta: 'on the Luma calendar, for events and the newsletter' },
          { lbl: 'People', num: kpis.total, delta: 'unique people in our data, duplicate emails merged' },
          { lbl: 'Repeat attendance', num: `${kpis.repeat}%`, delta: 'of people who registered came to 2+ events' },
          { lbl: 'Check-in rate', num: `${kpis.checkin}%`, delta: 'of approved registrations checked in' },
          { lbl: 'Ticket revenue', num: `€${LUMA_TICKET_REVENUE_EUR.toLocaleString('en')}`, delta: 'all-time ticket sales, from Luma Payment' },
        ].map(s => (
          <div key={s.lbl} className="mkw-stat"><div className="lbl">{s.lbl}</div><div className="num">{s.num}</div><div className="delta">{s.delta}</div></div>
        ))}
      </div>

      <p className="adm-table-empty" style={{ textAlign: 'left' }}>{rows.filter(r => r.active).length} active: attended at least {ACTIVE_MIN_EVENTS} of the {windowEvents.size} events held in the last {ACTIVE_WINDOW_MONTHS} months.</p>
      <p className="adm-table-empty" style={{ textAlign: 'left' }}>Engagement score (0-100): attendance 40, showing up 30, spend 30. Hover a score for the breakdown.</p>
      <input className="adm-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people by name or email…" />
      <div className="mkw-card adm-table-card">
        <div className="adm-thead cd-contacts-grid">
          {th('name', 'Contact')}
          <span className="cd-sort adm-col-center" onClick={() => setSort(s => ({ key: 'engagement', dir: s.key === 'engagement' ? (-s.dir as 1 | -1) : -1 }))}>Engagement{sort.key === 'engagement' ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</span>
          <span className="cd-sort adm-col-center" onClick={() => setSort(s => ({ key: 'approved_events', dir: s.key === 'approved_events' ? (-s.dir as 1 | -1) : -1 }))}>Events{sort.key === 'approved_events' ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</span>
          <span className="cd-sort adm-col-center" onClick={() => setSort(s => ({ key: 'recent_events', dir: s.key === 'recent_events' ? (-s.dir as 1 | -1) : -1 }))}>Status{sort.key === 'recent_events' ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</span>
          <span className="cd-sort adm-col-center" onClick={() => setSort(s => ({ key: 'revenue_eur_cents', dir: s.key === 'revenue_eur_cents' ? (-s.dir as 1 | -1) : -1 }))}>Revenue{sort.key === 'revenue_eur_cents' ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</span>
          <span className="adm-col-center">LinkedIn</span>
        </div>
        {tableRows.length === 0 && <p className="adm-table-empty">No people found.</p>}
        {tableRows.slice(0, 300).map(r => (
          <div key={r.key} className="adm-mrow cd-contacts-grid">
            <span className="adm-mrow-name-wrap"><div className="adm-mrow-name">{r.name || '(no name)'}</div><div className="adm-mrow-bio">{r.emails.join(', ')}</div></span>
            <span className="adm-col-center" title={`Attendance ${r.score.attendance}/40 · Showing up ${r.score.showingUp}/30 · Spend ${r.score.spend}/30`}>{r.engagement}</span>
            <span className="adm-col-center">{r.approved_events}</span>
            <span className="adm-col-center">{r.active ? 'Active' : 'Inactive'}</span>
            <span className="adm-col-center">€{(r.revenue_eur_cents / 100).toFixed(0)}</span>
            <span className="adm-col-center">{r.linkedin ? <a href={r.linkedin} target="_blank" rel="noreferrer">↗</a> : '—'}</span>
          </div>
        ))}
        {tableRows.length > 300 && <p className="adm-table-empty">Showing first 300 of {tableRows.length} — refine the search.</p>}
      </div>
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any
