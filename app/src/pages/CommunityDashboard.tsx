import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from '@clerk/clerk-react'
import { getSupabaseClient } from '../supabase'

type Contact = {
  luma_user_id: string; email: string; person_key: string | null; name: string | null
  joined_at: string | null
}
type LumaEvent = { luma_event_id: string; name: string | null; start_at: string | null; city: string | null; period: string | null }
type Registration = { luma_event_id: string; contact_email: string; approval_status: string | null; is_registration: boolean; checked_in_at: string | null; order_amount_cents: number | null; order_refunded_cents: number | null; role: string | null; linkedin_url: string | null }

const TIERS = ['Super-regular', 'Regular', 'One-timer', 'Never registered'] as const
type Tier = typeof TIERS[number]

// Tier by distinct events the person was approved for (all of their emails combined).
function tierOf(approvedEvents: number): Tier {
  if (approvedEvents >= 3) return 'Super-regular'
  if (approvedEvents === 2) return 'Regular'
  if (approvedEvents === 1) return 'One-timer'
  return 'Never registered'
}

// One row per person: contacts that share a person_key are the same person with several emails.
type Row = {
  key: string; name: string | null; emails: string[]; revenue_eur_cents: number; refunded_eur_cents: number; joined_at: string | null
  approved_events: number; checked_in: number; role: string | null; linkedin: string | null; tier: Tier
}
type SortKey = 'name' | 'role' | 'tier' | 'approved_events' | 'revenue_eur_cents'

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

const monthKey = (iso: string) => iso.slice(0, 7)
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0)

function Bars({ items, max }: { items: { label: string; value: number }[]; max?: number }) {
  const top = max ?? Math.max(1, ...items.map(i => i.value))
  return (
    <div className="adm-rb">
      {items.map(i => (
        <div key={i.label} className="adm-rb-row">
          <span className="adm-rb-lbl">{i.label}</span>
          <div className="adm-rb-track"><div className="adm-signal-fill" style={{ width: `${(i.value / top) * 100}%`, background: '#3b6dd9' }} /></div>
          <span className="adm-signal-pct">{i.value}</span>
        </div>
      ))}
    </div>
  )
}

export default function CommunityDashboard() {
  const { session } = useSession()
  const [contacts, setContacts] = useState<Contact[]>([])
  // People on the Luma calendar's list; excludes guests who only appear on event guest lists (raw is null).
  const [registeredPeople, setRegisteredPeople] = useState(0)
  const [events, setEvents] = useState<LumaEvent[]>([])
  const [regs, setRegs] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'approved_events', dir: -1 })

  const load = useCallback(async () => {
    try {
      const db = getSupabaseClient(await session?.getToken())
      const [c, e, r] = await Promise.all([
        fetchAll<Contact>(db, 'luma_contacts', 'luma_user_id,email,person_key,name,joined_at'),
        fetchAll<LumaEvent>(db, 'luma_events', 'luma_event_id,name,start_at,city,period'),
        fetchAll<Registration>(db, 'luma_guest_registrations', 'luma_event_id,contact_email,approval_status,is_registration,checked_in_at,order_amount_cents,order_refunded_cents,role,linkedin_url'),
      ])
      const { count } = await db.from('luma_contacts').select('luma_user_id', { count: 'exact', head: true }).not('raw', 'is', null)
      setContacts(c); setEvents(e); setRegs(r); setRegisteredPeople(count ?? 0); setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { load() }, [load])

  const rows: Row[] = useMemo(() => {
    const keyOf = new Map(contacts.map(c => [c.email, c.person_key ?? c.email]))
    const people = new Map<string, Contact[]>()
    for (const c of contacts) {
      const k = c.person_key ?? c.email
      people.set(k, [...(people.get(k) ?? []), c])
    }
    const stats = new Map<string, { events: Set<string>; checkedIn: number; paidCents: number; refundedCents: number; roles: Map<string, number>; linkedin: string | null }>()
    for (const r of regs) {
      const k = keyOf.get(r.contact_email) ?? r.contact_email
      const st = stats.get(k) ?? { events: new Set<string>(), checkedIn: 0, paidCents: 0, refundedCents: 0, roles: new Map<string, number>(), linkedin: null }
      if (r.approval_status === 'approved') st.events.add(r.luma_event_id)
      // Gross captured EUR orders, as Luma's Payment page counts them (includes later-refunded and declined guests).
      st.paidCents += r.order_amount_cents ?? 0
      st.refundedCents += r.order_refunded_cents ?? 0
      if (r.checked_in_at) st.checkedIn++
      if (r.role) st.roles.set(r.role, (st.roles.get(r.role) ?? 0) + 1)
      if (r.linkedin_url) st.linkedin = r.linkedin_url
      stats.set(k, st)
    }
    return [...people.entries()].map(([key, cs]) => {
      const st = stats.get(key)
      const role = st && st.roles.size ? [...st.roles.entries()].sort((a, b) => b[1] - a[1])[0][0] : null
      const approved = st?.events.size ?? 0
      const joined = cs.map(c => c.joined_at).filter((d): d is string => !!d).sort()[0] ?? null
      return {
        key,
        name: cs.map(c => c.name).filter((n): n is string => !!n?.trim()).sort((a, b) => b.length - a.length)[0] ?? null,
        emails: cs.map(c => c.email).sort(),
        revenue_eur_cents: st?.paidCents ?? 0,
        refunded_eur_cents: st?.refundedCents ?? 0,
        joined_at: joined,
        approved_events: approved,
        checked_in: st?.checkedIn ?? 0,
        role,
        linkedin: st?.linkedin ?? null,
        tier: tierOf(approved),
      }
    })
  }, [contacts, regs])

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

  const byMonth = (isos: (string | null)[]) => {
    const m = new Map<string, number>()
    for (const iso of isos) if (iso) m.set(monthKey(iso), (m.get(monthKey(iso)) ?? 0) + 1)
    return [...m.entries()].sort().map(([label, value]) => ({ label, value }))
  }
  const signups = useMemo(() => byMonth(rows.map(r => r.joined_at)), [rows])
  const eventsPerMonth = useMemo(() => byMonth(events.map(e => e.start_at)), [events])

  const roles = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of rows) m.set(r.role ?? 'Unknown', (m.get(r.role ?? 'Unknown') ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([label, value]) => ({ label, value }))
  }, [rows])
  const tiers = TIERS.map(t => ({ label: t, value: rows.filter(r => r.tier === t).length }))

  const eventRows = useMemo(() => {
    const counts = new Map<string, { registered: number; approved: number }>()
    for (const r of regs) {
      const c = counts.get(r.luma_event_id) ?? { registered: 0, approved: 0 }
      if (r.is_registration) c.registered++
      if (r.approval_status === 'approved') c.approved++
      counts.set(r.luma_event_id, c)
    }
    return [...events]
      .sort((a, b) => (b.start_at ?? '').localeCompare(a.start_at ?? ''))
      .map(e => ({ ...e, ...(counts.get(e.luma_event_id) ?? { registered: 0, approved: 0 }) }))
  }, [events, regs])

  const q = search.trim().toLowerCase()
  const tableRows = useMemo(() => {
    const list = rows.filter(r => !q || [r.name, r.emails.join(' '), r.role].some(v => v?.toLowerCase().includes(q)))
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

      <div className="cd-grid">
        <div className="mkw-card"><div className="mkw-h3"><span>Signups by month</span></div><Bars items={signups} /></div>
        <div className="mkw-card"><div className="mkw-h3"><span>Events by month</span></div><Bars items={eventsPerMonth} /></div>
        <div className="mkw-card"><div className="mkw-h3"><span>Role breakdown</span></div><Bars items={roles} /></div>
        <div className="mkw-card"><div className="mkw-h3"><span>Engagement tiers</span></div><Bars items={tiers} /></div>
      </div>

      <div className="mkw-card adm-table-card">
        <div className="mkw-h3 cd-pad"><span>Events</span></div>
        <div className="adm-thead cd-events-grid"><span>Event</span><span>Date</span><span className="adm-col-center">Registered</span><span className="adm-col-center">Approved</span></div>
        {eventRows.map(e => (
          <div key={e.luma_event_id} className="adm-mrow cd-events-grid">
            <span>{e.name}</span>
            <span>{e.start_at ? new Date(e.start_at).toLocaleDateString('en-GB') : '—'}</span>
            <span className="adm-col-center">{e.registered}</span>
            <span className="adm-col-center">{e.approved}</span>
          </div>
        ))}
      </div>

      <input className="adm-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search people by name, email or role…" />
      <div className="mkw-card adm-table-card">
        <div className="adm-thead cd-contacts-grid">
          {th('name', 'Contact')}{th('role', 'Role')}{th('tier', 'Tier')}
          <span className="cd-sort adm-col-center" onClick={() => setSort(s => ({ key: 'approved_events', dir: s.key === 'approved_events' ? (-s.dir as 1 | -1) : -1 }))}>Events{sort.key === 'approved_events' ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</span>
          <span className="cd-sort adm-col-center" onClick={() => setSort(s => ({ key: 'revenue_eur_cents', dir: s.key === 'revenue_eur_cents' ? (-s.dir as 1 | -1) : -1 }))}>Revenue{sort.key === 'revenue_eur_cents' ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</span>
          <span className="adm-col-center">LinkedIn</span>
        </div>
        {tableRows.length === 0 && <p className="adm-table-empty">No people found.</p>}
        {tableRows.slice(0, 300).map(r => (
          <div key={r.key} className="adm-mrow cd-contacts-grid">
            <span className="adm-mrow-name-wrap"><div className="adm-mrow-name">{r.name || '(no name)'}</div><div className="adm-mrow-bio">{r.emails.join(', ')}</div></span>
            <span>{r.role ?? '—'}</span>
            <span>{r.tier}</span>
            <span className="adm-col-center">{r.approved_events}</span>
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
