import { useEffect, useState, useCallback } from 'react'
import { useSession } from '@clerk/clerk-react'
import { getInitials } from '../supabase'
import type { OrgMember, AdminEvent } from './Admin'
import './Recommendations.css'

// ── Types ─────────────────────────────────────────────────────────────────────

type AiItem = {
  clerk_user_id: string
  name: string
  role: string
  reason: string
}

type AiRec = {
  event: AdminEvent
  inviteLeads: AiItem[]
  ticketConverts: AiItem[]
  noShowRisks: AiItem[]
  generatedAt: number
}

type AiLoadState = 'idle' | 'loading' | 'done' | 'error'

// ── Helpers ───────────────────────────────────────────────────────────────────

const AV_COLORS = [
  { bg: 'rgba(122,78,216,0.25)',  fg: '#c4a8ff' },
  { bg: 'rgba(59,109,217,0.25)', fg: '#7aaeff'  },
  { bg: 'rgba(252,184,19,0.2)',  fg: '#fcb813'  },
  { bg: 'rgba(226,75,74,0.2)',   fg: '#ff8a89'  },
  { bg: 'rgba(52,210,123,0.2)',  fg: '#1a7a4a'  },
]
function avColor(i: number) { return AV_COLORS[i % AV_COLORS.length] }

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short' })
}

function timeSince(ms: number): string {
  const mins = Math.floor(ms / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function copyMessage(item: AiItem, event: AdminEvent): void {
  const firstName = item.name.split(' ')[0]
  const pricing   = event.is_free ? "It's free to join." : `Tickets are €${Number(event.ticket_price).toFixed(0)}.`
  const msg = `Hey ${firstName}, wanted to personally invite you to our next event — ${event.title} on ${fmtDate(event.date)}. ${pricing} Would love to see you there!`
  navigator.clipboard.writeText(msg).catch(() => {})
}

// ── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color?: string
}) {
  return (
    <div className="ins-stat-card">
      <div className="ins-stat-label">{label}</div>
      <div className="ins-stat-value" style={color ? { color } : {}}>{value}</div>
      {sub && <div className="ins-stat-sub">{sub}</div>}
    </div>
  )
}

// ── Event performance bar chart (SVG) ─────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  Networking: '#7a4ed8',
  Workshop:   '#fcb813',
  Social:     '#3b6dd9',
  Panel:      '#34d27b',
  Fireside:   '#f4822a',
  Hackathon:  '#e24b4a',
  Other:      '#8a94a8',
}
function typeColor(t: string | null): string {
  return TYPE_COLORS[t || 'Other'] || '#8a94a8'
}

function EventChart({ events }: { events: AdminEvent[] }) {
  const past = events
    .filter(e => new Date(e.date) < new Date())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(-12) // last 12 events

  if (past.length === 0) return (
    <div className="ins-empty-sub">No past events to chart yet.</div>
  )

  // Always render at least 6 slots so a single bar doesn't fill the whole chart
  const MIN_SLOTS = 6
  const slots = Math.max(past.length, MIN_SLOTS)
  const max = Math.max(...past.map(e => e.rsvp_count), 1)
  const BAR_W = 36, GAP = 12, H = 100, PAD = 24

  const totalW = slots * (BAR_W + GAP) - GAP + PAD * 2

  return (
    <div className="ins-chart-wrap">
      <svg
        viewBox={`0 0 ${totalW} ${H + 40}`}
        preserveAspectRatio="xMinYMid meet"
        className="ins-chart-svg"
      >
        {past.map((e, i) => {
          const barH = Math.max(4, Math.round((e.rsvp_count / max) * H))
          const x = PAD + i * (BAR_W + GAP)
          const y = H - barH
          const color = typeColor(e.type)
          const label = fmtDate(e.date)
          return (
            <g key={e.id}>
              <rect x={x} y={y} width={BAR_W} height={barH} rx={6} fill={color} opacity={0.85} />
              <text
                x={x + BAR_W / 2} y={y - 5}
                textAnchor="middle"
                style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, fill: 'var(--ink-1)' }}
              >
                {e.rsvp_count}
              </text>
              <text
                x={x + BAR_W / 2} y={H + 14}
                textAnchor="middle"
                style={{ fontFamily: 'var(--font-body)', fontSize: 9, fill: 'var(--ink-3)' }}
              >
                {label.split(' ')[0]}
              </text>
              <text
                x={x + BAR_W / 2} y={H + 25}
                textAnchor="middle"
                style={{ fontFamily: 'var(--font-body)', fontSize: 9, fill: 'var(--ink-3)' }}
              >
                {label.split(' ')[1]}
              </text>
            </g>
          )
        })}
      </svg>

      {/* Legend */}
      <div className="ins-chart-legend">
        {Object.entries(TYPE_COLORS)
          .filter(([t]) => past.some(e => (e.type || 'Other') === t))
          .map(([t, c]) => (
            <div key={t} className="ins-legend-item">
              <span className="ins-legend-dot" style={{ background: c }} />
              {t}
            </div>
          ))}
      </div>
    </div>
  )
}

// ── What's working ────────────────────────────────────────────────────────────

function EventTypeBreakdown({ events }: { events: AdminEvent[] }) {
  const past = events.filter(e => new Date(e.date) < new Date())
  if (past.length === 0) return null

  const byType = new Map<string, { count: number; totalRsvps: number }>()
  for (const e of past) {
    const t = e.type || 'Other'
    const cur = byType.get(t) || { count: 0, totalRsvps: 0 }
    cur.count++
    cur.totalRsvps += e.rsvp_count
    byType.set(t, cur)
  }

  const sorted = Array.from(byType.entries())
    .map(([type, { count, totalRsvps }]) => ({ type, count, avg: Math.round(totalRsvps / count) }))
    .sort((a, b) => b.avg - a.avg)

  const maxAvg = Math.max(...sorted.map(s => s.avg), 1)

  return (
    <div className="ins-type-breakdown">
      {sorted.map(({ type, count, avg }) => (
        <div key={type} className="ins-type-row">
          <div className="ins-type-meta">
            <span className="ins-type-dot" style={{ background: typeColor(type) }} />
            <span className="ins-type-name">{type}</span>
            <span className="ins-type-count">{count} event{count !== 1 ? 's' : ''}</span>
          </div>
          <div className="ins-type-track">
            <div
              className="ins-type-fill"
              style={{ width: `${(avg / maxAvg) * 100}%`, background: typeColor(type) }}
            />
          </div>
          <div className="ins-type-avg" style={{ color: typeColor(type) }}>{avg} avg RSVPs</div>
        </div>
      ))}
    </div>
  )
}

// ── People signals ────────────────────────────────────────────────────────────

function memberEngScore(m: OrgMember, pastEventCount: number): number {
  if (pastEventCount === 0) return 0
  const attPct    = Math.min(100, Math.round((m.events_attended / pastEventCount) * 100))
  const connScore = Math.min(100, m.connections_made * 20)
  return Math.round(attPct * 0.6 + connScore * 0.4)
}

function PeopleSignals({ members, pastEventCount, events }: {
  members: OrgMember[]
  pastEventCount: number
  events: AdminEvent[]
}) {
  const real = members.filter(m => !m.clerk_user_id.startsWith('mock_'))

  // Regulars — top 5 by engagement score, attended 3+
  const regulars = [...real]
    .filter(m => m.events_attended >= 3)
    .sort((a, b) => memberEngScore(b, pastEventCount) - memberEngScore(a, pastEventCount))
    .slice(0, 5)

  // Fading — attended at least once, last seen 30+ days ago, not attended in last 3 events
  const pastEventsSorted = events
    .filter(e => new Date(e.date) < new Date())
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const recentEventIds = new Set(pastEventsSorted.slice(0, 3).map(e => e.id))

  const fading = real
    .filter(m => {
      if (m.events_attended === 0) return false
      const daysSince = m.last_seen
        ? (Date.now() - new Date(m.last_seen).getTime()) / 86400000
        : 9999
      return daysSince >= 30
    })
    .sort((a, b) => {
      const da = a.last_seen ? new Date(a.last_seen).getTime() : 0
      const db = b.last_seen ? new Date(b.last_seen).getTime() : 0
      return da - db
    })
    .slice(0, 5)

  // Never attended — joined but 0 events
  const neverAttended = real
    .filter(m => m.events_attended === 0)
    .sort((a, b) => new Date(b.joined_at).getTime() - new Date(a.joined_at).getTime())
    .slice(0, 5)

  return (
    <div className="ins-people-grid">
      <PeopleList
        title="Regulars"
        dot="var(--ok)"
        items={regulars}
        empty="No members with 3+ events yet."
        renderRight={m => (
          <span className="ins-people-score" style={{ color: 'var(--ok)' }}>
            {memberEngScore(m, pastEventCount)}/100
          </span>
        )}
      />
      <PeopleList
        title="Going quiet"
        dot="var(--mk-yellow)"
        items={fading}
        empty="No members going quiet — great!"
        renderRight={m => (
          <span className="ins-people-lastseen">
            {m.last_seen
              ? `${Math.floor((Date.now() - new Date(m.last_seen).getTime()) / 86400000)}d ago`
              : 'Never'}
          </span>
        )}
      />
      <PeopleList
        title="Never attended"
        dot="var(--ink-3)"
        items={neverAttended}
        empty="Everyone has attended at least once."
        renderRight={m => (
          <span className="ins-people-lastseen">
            Joined {fmtDate(m.joined_at)}
          </span>
        )}
      />
    </div>
  )
}

function PeopleList({ title, dot, items, empty, renderRight }: {
  title: string
  dot: string
  items: OrgMember[]
  empty: string
  renderRight: (m: OrgMember) => React.ReactNode
}) {
  return (
    <div className="ins-people-col">
      <div className="ins-people-col-head">
        <span className="ins-people-dot" style={{ background: dot }} />
        {title}
      </div>
      {items.length === 0
        ? <div className="ins-empty-sub">{empty}</div>
        : items.map((m, i) => (
          <div key={m.id} className="ins-people-row">
            <div className="ins-people-av" style={{ background: avColor(i).bg, color: avColor(i).fg }}>
              {getInitials(m.profile?.full_name)}
            </div>
            <div className="ins-people-info">
              <div className="ins-people-name">{m.profile?.full_name || '(no name)'}</div>
              <div className="ins-people-role">{m.profile?.role_category || '—'}</div>
            </div>
            {renderRight(m)}
          </div>
        ))
      }
    </div>
  )
}

// ── AI recommendations ────────────────────────────────────────────────────────

function AiSection({ session }: { session: ReturnType<typeof useSession>['session'] }) {
  const [loadState, setLoadState] = useState<AiLoadState>('idle')
  const [recs, setRecs]           = useState<AiRec[]>([])
  const [generatedAt, setGeneratedAt] = useState<number | null>(null)
  const [error, setError]         = useState<string | null>(null)
  const [copiedId, setCopiedId]   = useState<string | null>(null)

  const generate = useCallback(async () => {
    if (!session) return
    setLoadState('loading')
    setError(null)
    try {
      const token = await session.getToken()
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-recommendations`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } }
      )
      if (!res.ok) { const b = await res.json().catch(() => ({})); throw new Error(b.error || `HTTP ${res.status}`) }
      const data = await res.json()
      setRecs(data.recommendations || [])
      setGeneratedAt(Date.now())
      setLoadState('done')
    } catch (err: any) {
      setError(err?.message || 'Something went wrong.')
      setLoadState('error')
    }
  }, [session])

  useEffect(() => { generate() }, [generate])

  function handleCopy(item: AiItem, event: AdminEvent) {
    copyMessage(item, event)
    setCopiedId(item.clerk_user_id + event.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="ins-ai-section">
      <div className="ins-section-head">
        <div>
          <div className="ins-section-title">AI recommendations</div>
          <div className="ins-section-sub">Who to invite, who to nudge, per upcoming event</div>
        </div>
        <button
          className="ins-refresh-btn"
          onClick={generate}
          disabled={loadState === 'loading'}
        >
          <span className={loadState === 'loading' ? 'ins-spinning' : ''}>↺</span>
          {loadState === 'loading' ? 'Generating…' : generatedAt ? `Updated ${timeSince(Date.now() - generatedAt)}` : 'Generate'}
        </button>
      </div>

      {loadState === 'idle' && (
        <div className="ins-ai-idle">
          <p>Click Generate to get AI-powered invite and risk recommendations for your upcoming events.</p>
        </div>
      )}

      {loadState === 'loading' && (
        <div className="ins-loading">
          <span className="ins-loading-dot" /><span className="ins-loading-dot" /><span className="ins-loading-dot" />
        </div>
      )}

      {loadState === 'error' && (
        <div className="ins-error">
          ⚠ {error}
          <button className="ins-retry-btn" onClick={generate}>Retry</button>
        </div>
      )}

      {loadState === 'done' && recs.length === 0 && (
        <div className="ins-empty-sub">No upcoming events — add one to get recommendations.</div>
      )}

      {loadState === 'done' && recs.map(rec => (
        <div key={rec.event.id} className="ins-ai-card">
          <div className="ins-ai-card-head">
            <div className="ins-ai-card-event">
              <span className="ins-ai-type-badge" style={{ background: `${typeColor(rec.event.type)}22`, color: typeColor(rec.event.type) }}>
                {rec.event.type || 'Networking'}
              </span>
              <span className="ins-ai-event-name">{rec.event.title}</span>
              <span className="ins-ai-event-date">{fmtDate(rec.event.date)}</span>
            </div>
            <span className="ins-ai-rsvp-pill">
              {rec.event.rsvp_count} RSVPs
              {!rec.event.is_free && rec.event.ticket_price ? ` · €${Number(rec.event.ticket_price).toFixed(0)}` : ''}
            </span>
          </div>

          <div className="ins-ai-lists">
            {rec.inviteLeads.length > 0 && (
              <AiList
                label="Invite personally"
                dotColor="var(--mk-violet)"
                items={rec.inviteLeads}
                copiedId={copiedId}
                onCopy={(item) => handleCopy(item, rec.event)}
                eventId={rec.event.id}
                showCopy
              />
            )}
            {!rec.event.is_free && rec.ticketConverts.length > 0 && (
              <AiList
                label="Warm ticket converts"
                dotColor="var(--mk-yellow)"
                items={rec.ticketConverts}
                copiedId={copiedId}
                onCopy={(item) => handleCopy(item, rec.event)}
                eventId={rec.event.id}
                showCopy
              />
            )}
            {rec.noShowRisks.length > 0 && (
              <AiList
                label="No-show risk"
                dotColor="var(--danger)"
                items={rec.noShowRisks}
                copiedId={copiedId}
                onCopy={(item) => handleCopy(item, rec.event)}
                eventId={rec.event.id}
                showCopy={false}
                risk
              />
            )}
            {rec.inviteLeads.length === 0 && rec.ticketConverts.length === 0 && rec.noShowRisks.length === 0 && (
              <div className="ins-empty-sub">Nothing to action — engagement looks healthy.</div>
            )}
          </div>
        </div>
      ))}

      {loadState === 'done' && generatedAt && (
        <div className="ins-ai-footer">Generated by Claude · attendance, engagement scores &amp; RSVP history</div>
      )}
    </div>
  )
}

function AiList({ label, dotColor, items, copiedId, onCopy, eventId, showCopy, risk }: {
  label: string
  dotColor: string
  items: AiItem[]
  copiedId: string | null
  onCopy: (item: AiItem) => void
  eventId: string
  showCopy: boolean
  risk?: boolean
}) {
  return (
    <div className="ins-ai-list">
      <div className="ins-ai-list-label">
        <span className="ins-ai-dot" style={{ background: dotColor }} />
        {label}
      </div>
      {items.map((item, i) => (
        <div key={item.clerk_user_id} className={`ins-ai-row${risk ? ' ins-ai-row--risk' : ''}`}>
          <div className="ins-ai-row-left">
            <div className="ins-ai-av" style={{ background: avColor(i).bg, color: avColor(i).fg }}>
              {getInitials(item.name)}
            </div>
            <div>
              <div className="ins-ai-name">{item.name}</div>
              <div className="ins-ai-reason">{item.role}{item.reason ? ` · ${item.reason}` : ''}</div>
            </div>
          </div>
          {showCopy ? (
            <button
              className={`ins-copy-btn${copiedId === item.clerk_user_id + eventId ? ' copied' : ''}`}
              onClick={() => onCopy(item)}
            >
              {copiedId === item.clerk_user_id + eventId ? '✓ Copied' : '⎘ Copy'}
            </button>
          ) : (
            <span className="ins-risk-badge">At risk</span>
          )}
        </div>
      ))}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Recommendations({
  members,
  events,
  stats,
}: {
  members: OrgMember[]
  events: AdminEvent[]
  stats: {
    totalMembers: number
    totalEvents: number
    pastEvents: number
    totalRsvps: number
    uniqueRsvpers: number
    membersWithConnections: number
  }
}) {
  const { session } = useSession()

  return (
    <div className="ins-page">

      {/* ── 2. Event performance ── */}
      <div className="ins-section-card">
        <div className="ins-section-head">
          <div>
            <div className="ins-section-title">Event performance</div>
            <div className="ins-section-sub">RSVPs per event — last 12</div>
          </div>
        </div>
        <EventChart events={events} />
        <div className="ins-section-divider" />
        <div className="ins-type-head">By event type</div>
        <EventTypeBreakdown events={events} />
      </div>

      {/* ── 3. People signals ── */}
      <div className="ins-section-card">
        <div className="ins-section-head">
          <div>
            <div className="ins-section-title">People signals</div>
            <div className="ins-section-sub">Regulars, fading members, never attended</div>
          </div>
        </div>
        <PeopleSignals members={members} pastEventCount={stats.pastEvents} events={events} />
      </div>

      {/* ── 4. AI recommendations ── */}
      <div className="ins-section-card">
        <AiSection session={session} />
      </div>

    </div>
  )
}
