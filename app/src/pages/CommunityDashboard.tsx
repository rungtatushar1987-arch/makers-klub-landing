import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession } from '@clerk/clerk-react'
import { getSupabaseClient } from '../supabase'

type Contact = {
  luma_user_id: string; email: string; name: string | null
  revenue_usd_cents: number; event_approved_count: number; event_checked_in_count: number
  joined_at: string | null
}
type LumaEvent = { luma_event_id: string; name: string | null; start_at: string | null; city: string | null; period: string | null }
type Registration = { luma_event_id: string; contact_email: string; approval_status: string | null; is_registration: boolean; role: string | null; linkedin_url: string | null }

const TIERS = ['Super-regular', 'Regular', 'One-timer', 'Registered-not-attended'] as const
type Tier = typeof TIERS[number]

function tierOf(approved: number): Tier {
  if (approved >= 3) return 'Super-regular'
  if (approved === 2) return 'Regular'
  if (approved === 1) return 'One-timer'
  return 'Registered-not-attended'
}

type Row = Contact & { role: string | null; linkedin: string | null; tier: Tier }
type SortKey = 'name' | 'role' | 'tier' | 'event_approved_count' | 'revenue_usd_cents'

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
  const [events, setEvents] = useState<LumaEvent[]>([])
  const [regs, setRegs] = useState<Registration[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'event_approved_count', dir: -1 })

  const load = useCallback(async () => {
    try {
      const db = getSupabaseClient(await session?.getToken())
      const [c, e, r] = await Promise.all([
        fetchAll<Contact>(db, 'luma_contacts', 'luma_user_id,email,name,revenue_usd_cents,event_approved_count,event_checked_in_count,joined_at'),
        fetchAll<LumaEvent>(db, 'luma_events', 'luma_event_id,name,start_at,city,period'),
        fetchAll<Registration>(db, 'luma_guest_registrations', 'luma_event_id,contact_email,approval_status,is_registration,role,linkedin_url'),
      ])
      setContacts(c); setEvents(e); setRegs(r); setError(null)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [session])

  useEffect(() => { load() }, [load])

  const rows: Row[] = useMemo(() => {
    const roleVotes = new Map<string, Map<string, number>>()
    const linkedin = new Map<string, string>()
    for (const r of regs) {
      if (r.role) {
        const m = roleVotes.get(r.contact_email) ?? new Map<string, number>()
        m.set(r.role, (m.get(r.role) ?? 0) + 1)
        roleVotes.set(r.contact_email, m)
      }
      if (r.linkedin_url) linkedin.set(r.contact_email, r.linkedin_url)
    }
    return contacts.map(c => {
      const votes = roleVotes.get(c.email)
      const role = votes ? [...votes.entries()].sort((a, b) => b[1] - a[1])[0][0] : null
      return { ...c, role, linkedin: linkedin.get(c.email) ?? null, tier: tierOf(c.event_approved_count) }
    })
  }, [contacts, regs])

  const kpis = useMemo(() => {
    const approved = rows.reduce((s, r) => s + r.event_approved_count, 0)
    const checkedIn = rows.reduce((s, r) => s + r.event_checked_in_count, 0)
    return {
      total: rows.length,
      repeat: pct(rows.filter(r => r.event_approved_count >= 2).length, rows.length),
      checkin: pct(checkedIn, approved),
      revenue: rows.reduce((s, r) => s + r.revenue_usd_cents, 0) / 100,
      linkedin: rows.filter(r => r.linkedin).length,
    }
  }, [rows])

  const byMonth = (isos: (string | null)[]) => {
    const m = new Map<string, number>()
    for (const iso of isos) if (iso) m.set(monthKey(iso), (m.get(monthKey(iso)) ?? 0) + 1)
    return [...m.entries()].sort().map(([label, value]) => ({ label, value }))
  }
  const signups = useMemo(() => byMonth(contacts.map(c => c.joined_at)), [contacts])
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
    const list = rows.filter(r => !q || [r.name, r.email, r.role].some(v => v?.toLowerCase().includes(q)))
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
          { lbl: 'Unique contacts', num: kpis.total },
          { lbl: 'Repeat attendance', num: `${kpis.repeat}%` },
          { lbl: 'Check-in rate', num: `${kpis.checkin}%` },
          { lbl: 'Revenue (USD)', num: `$${kpis.revenue.toLocaleString('en', { maximumFractionDigits: 0 })}` },
          { lbl: 'LinkedIn captured', num: kpis.linkedin },
        ].map(s => (
          <div key={s.lbl} className="mkw-stat"><div className="lbl">{s.lbl}</div><div className="num">{s.num}</div></div>
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

      <input className="adm-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts by name, email or role…" />
      <div className="mkw-card adm-table-card">
        <div className="adm-thead cd-contacts-grid">
          {th('name', 'Contact')}{th('role', 'Role')}{th('tier', 'Tier')}
          <span className="cd-sort adm-col-center" onClick={() => setSort(s => ({ key: 'event_approved_count', dir: s.key === 'event_approved_count' ? (-s.dir as 1 | -1) : -1 }))}>Events{sort.key === 'event_approved_count' ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</span>
          <span className="cd-sort adm-col-center" onClick={() => setSort(s => ({ key: 'revenue_usd_cents', dir: s.key === 'revenue_usd_cents' ? (-s.dir as 1 | -1) : -1 }))}>Revenue{sort.key === 'revenue_usd_cents' ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}</span>
          <span className="adm-col-center">LinkedIn</span>
        </div>
        {tableRows.length === 0 && <p className="adm-table-empty">No contacts found.</p>}
        {tableRows.slice(0, 300).map(r => (
          <div key={r.luma_user_id} className="adm-mrow cd-contacts-grid">
            <span className="adm-mrow-name-wrap"><div className="adm-mrow-name">{r.name || '(no name)'}</div><div className="adm-mrow-bio">{r.email}</div></span>
            <span>{r.role ?? '—'}</span>
            <span>{r.tier}</span>
            <span className="adm-col-center">{r.event_approved_count}</span>
            <span className="adm-col-center">${(r.revenue_usd_cents / 100).toFixed(0)}</span>
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
