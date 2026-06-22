import { useEffect, useState, useCallback } from 'react'
import { useSession } from '@clerk/clerk-react'
import { getSupabaseClient, getInitials, type Event } from '../supabase'
import './Recommendations.css'

// ── Constants ────────────────────────────────────────────────────────────────

const MK_ORG = 'cf84f186-0d86-40c3-baa7-b5f33598d0fd'

const AV_COLORS = [
  { bg: 'rgba(122,78,216,0.3)',  fg: '#c4a8ff' },
  { bg: 'rgba(59,109,217,0.3)', fg: '#7aaeff'  },
  { bg: 'rgba(252,184,19,0.2)', fg: '#fcb813'  },
  { bg: 'rgba(226,75,74,0.2)',  fg: '#ff8a89'  },
  { bg: 'rgba(29,158,117,0.2)', fg: '#5de0b0'  },
]
function avColor(i: number) { return AV_COLORS[i % AV_COLORS.length] }

// ── Types ────────────────────────────────────────────────────────────────────

type MemberSnapshot = {
  clerk_user_id: string
  full_name: string
  role_category: string
  events_attended: number
  event_types_attended: string[]
  connections_made: number
  last_seen_iso: string | null
  is_paying: boolean
  engagement_score: number
}

type RecommendationItem = {
  clerk_user_id: string
  name: string
  role: string
  reason: string
}

type EventRecommendation = {
  event: Event & { rsvp_count: number }
  inviteLeads: RecommendationItem[]
  ticketConverts: RecommendationItem[]
  noShowRisks: RecommendationItem[]
  generatedAt: number
}

type LoadState = 'idle' | 'loading-data' | 'loading-ai' | 'done' | 'error'

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en', {
    weekday: 'short', day: 'numeric', month: 'short'
  })
}

function timeSince(ms: number): string {
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function copyMessage(item: RecommendationItem, event: Event): void {
  const msg = `Hey ${item.name.split(' ')[0]}, just wanted to personally invite you to our next event — ${event.title} on ${formatEventDate(event.date)}. ${item.reason.includes('free') ? "It's free to join." : ''} Would love to see you there!`
  navigator.clipboard.writeText(msg).catch(() => {})
}

// ── Prompt builder ────────────────────────────────────────────────────────────

function buildPrompt(
  event: Event & { rsvp_count: number },
  members: MemberSnapshot[],
  rsvpdIds: Set<string>,
  pastEvents: number,
): string {
  const notRsvpd = members.filter(m => !rsvpdIds.has(m.clerk_user_id))
  const rsvpdMembers = members.filter(m => rsvpdIds.has(m.clerk_user_id))

  return `You are an AI assistant helping a community organiser in Berlin grow their events.

## Upcoming event
- Title: ${event.title}
- Type: ${event.type || 'Networking'}
- Date: ${formatEventDate(event.date)}
- Venue: ${event.location || 'TBD'}
- Pricing: ${event.is_free ? 'Free' : `€${event.ticket_price}`}
- Current RSVPs: ${event.rsvp_count}
- Total past events hosted by this community: ${pastEvents}

## Members who have NOT yet RSVPd (${notRsvpd.length} members)
${notRsvpd.map(m => `- ID: ${m.clerk_user_id} | Name: ${m.full_name} | Role: ${m.role_category || 'unknown'} | Events attended: ${m.events_attended} | Event types attended: ${m.event_types_attended.join(', ') || 'none'} | Connections made: ${m.connections_made} | Engagement: ${m.engagement_score}/100 | Last seen: ${m.last_seen_iso ? new Date(m.last_seen_iso).toLocaleDateString() : 'never'} | Is paying member: ${m.is_paying}`).join('\n')}

## Members who HAVE RSVPd (${rsvpdMembers.length} members)
${rsvpdMembers.map(m => `- ID: ${m.clerk_user_id} | Name: ${m.full_name} | Role: ${m.role_category || 'unknown'} | Events attended: ${m.events_attended} | Engagement: ${m.engagement_score}/100 | Last seen: ${m.last_seen_iso ? new Date(m.last_seen_iso).toLocaleDateString() : 'never'}`).join('\n')}

## Your task
Return a JSON object with exactly these three arrays. Each item must include clerk_user_id, name, role, and reason (1 short sentence explaining why).

1. **inviteLeads** — up to 5 members from the NOT RSVPd list most likely to attend this specific event based on their role, past event type history, and engagement. Prioritise members who attended similar event types before.

2. **ticketConverts** — ${event.is_free ? 'null (this is a free event, skip this array — return empty [])' : 'up to 4 members from the NOT RSVPd list who are warm candidates to purchase a ticket — attended multiple free events, high engagement, but never paid. Only include if it makes sense.'}

3. **noShowRisks** — up to 4 members from the RSVPd list who are at risk of not showing up — low engagement score, first-time RSVP, or last seen 45+ days ago.

Return ONLY valid JSON, no markdown, no explanation:
{
  "inviteLeads": [{ "clerk_user_id": "...", "name": "...", "role": "...", "reason": "..." }],
  "ticketConverts": [],
  "noShowRisks": []
}`
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Recommendations() {
  const { session } = useSession()
  const [loadState, setLoadState] = useState<LoadState>('idle')
  const [recommendations, setRecommendations] = useState<EventRecommendation[]>([])
  const [generatedAt, setGeneratedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  // ── Data fetch + AI generation ──────────────────────────────────────────────

  const generate = useCallback(async () => {
    if (!session) return
    setLoadState('loading-data')
    setError(null)

    try {
      const token = await session.getToken()
      const db = getSupabaseClient(token)

      // 1. Fetch all data in parallel
      const [
        { data: orgRows },
        { data: evData },
        { data: rsvpData },
        { data: connData },
        { data: profileData },
      ] = await Promise.all([
        db.from('org_members').select('id, clerk_user_id, is_paying').eq('org_id', MK_ORG),
        db.from('events').select('*').eq('org_id', MK_ORG).order('date', { ascending: true }),
        db.from('event_rsvps').select('clerk_user_id, event_id, created_at'),
        db.from('connections').select('clerk_user_id').eq('status', 'accepted'),
        db.from('profiles').select('clerk_user_id, full_name, role_category'),
      ])

      if (!orgRows || !evData) throw new Error('Failed to load community data')

      const now = new Date()
      const allEvents: (Event & { rsvp_count: number })[] = (evData as any[]).map(e => ({ ...e, rsvp_count: 0 }))
      const upcomingEvents = allEvents.filter(e => new Date(e.date) >= now)
      const pastEvents = allEvents.filter(e => new Date(e.date) < now)

      if (upcomingEvents.length === 0) {
        setRecommendations([])
        setGeneratedAt(Date.now())
        setLoadState('done')
        return
      }

      // 2. Build lookup maps
      const profileMap = new Map((profileData || []).map((p: any) => [p.clerk_user_id, p]))

      const connCount = new Map<string, number>()
      for (const c of (connData || []) as any[]) {
        connCount.set(c.clerk_user_id, (connCount.get(c.clerk_user_id) || 0) + 1)
      }

      const pastEventIds = new Set(pastEvents.map(e => e.id))
      const eventTypeMap = new Map(allEvents.map(e => [e.id, e.type || 'Networking']))

      // Per-member: events attended (past only), event types, last seen
      const memberAttendance = new Map<string, { count: number; types: Set<string>; lastSeen: string | null }>()
      const rsvpCountByEvent = new Map<string, number>()

      for (const r of (rsvpData || []) as any[]) {
        // Count RSVPs per event
        rsvpCountByEvent.set(r.event_id, (rsvpCountByEvent.get(r.event_id) || 0) + 1)

        if (!pastEventIds.has(r.event_id)) continue
        const cur = memberAttendance.get(r.clerk_user_id) || { count: 0, types: new Set<string>(), lastSeen: null }
        cur.count++
        const t = eventTypeMap.get(r.event_id)
        if (t) cur.types.add(t)
        if (!cur.lastSeen || r.created_at > cur.lastSeen) cur.lastSeen = r.created_at
        memberAttendance.set(r.clerk_user_id, cur)
      }

      // Update RSVP counts on upcoming events
      upcomingEvents.forEach(e => { e.rsvp_count = rsvpCountByEvent.get(e.id) || 0 })

      // 3. Build member snapshots
      const realMembers = (orgRows as any[]).filter(r => !r.clerk_user_id.startsWith('mock_'))
      const memberSnapshots: MemberSnapshot[] = realMembers.map(r => {
        const profile = profileMap.get(r.clerk_user_id)
        const att = memberAttendance.get(r.clerk_user_id) || { count: 0, types: new Set<string>(), lastSeen: null }
        const conns = connCount.get(r.clerk_user_id) || 0
        const attendancePct = pastEvents.length > 0 ? Math.min(100, Math.round((att.count / pastEvents.length) * 100)) : 0
        const connectionScore = Math.min(100, conns * 20)
        const engagement = Math.round(attendancePct * 0.6 + connectionScore * 0.4)
        return {
          clerk_user_id: r.clerk_user_id,
          full_name: profile?.full_name || 'Unknown',
          role_category: profile?.role_category || '',
          events_attended: att.count,
          event_types_attended: Array.from(att.types),
          connections_made: conns,
          last_seen_iso: att.lastSeen,
          is_paying: r.is_paying || false,
          engagement_score: engagement,
        }
      })

      // 4. Call Claude API for each upcoming event
      setLoadState('loading-ai')

      const results: EventRecommendation[] = []

      for (const event of upcomingEvents) {
        const rsvpdIdsForEvent = new Set(
          (rsvpData || [])
            .filter((r: any) => r.event_id === event.id)
            .map((r: any) => r.clerk_user_id as string)
        )

        const prompt = buildPrompt(event, memberSnapshots, rsvpdIdsForEvent, pastEvents.length)

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'claude-sonnet-4-6',
            max_tokens: 1000,
            messages: [{ role: 'user', content: prompt }],
          }),
        })

        const data = await response.json()
        const text = data.content?.find((b: any) => b.type === 'text')?.text || '{}'

        let parsed: { inviteLeads?: any[]; ticketConverts?: any[]; noShowRisks?: any[] } = {}
        try {
          parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
        } catch {
          parsed = { inviteLeads: [], ticketConverts: [], noShowRisks: [] }
        }

        results.push({
          event,
          inviteLeads:    (parsed.inviteLeads    || []).slice(0, 5),
          ticketConverts: (parsed.ticketConverts || []).slice(0, 4),
          noShowRisks:    (parsed.noShowRisks    || []).slice(0, 4),
          generatedAt: Date.now(),
        })
      }

      setRecommendations(results)
      setGeneratedAt(Date.now())
      setLoadState('done')

    } catch (err: any) {
      console.error('Recommendations error:', err)
      setError(err?.message || 'Something went wrong generating recommendations.')
      setLoadState('error')
    }
  }, [session])

  useEffect(() => { generate() }, [generate])

  // ── Copy handler ────────────────────────────────────────────────────────────

  function handleCopy(item: RecommendationItem, event: Event) {
    copyMessage(item, event)
    setCopiedId(item.clerk_user_id + event.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="rec-page">
      <div className="rec-header">
        <div>
          <h2 className="rec-title">Insights</h2>
          <p className="rec-subtitle">AI-generated action items for your upcoming events</p>
        </div>
        <button
          className="rec-refresh-btn"
          onClick={generate}
          disabled={loadState === 'loading-data' || loadState === 'loading-ai'}
        >
          <span className={`rec-refresh-icon${loadState === 'loading-data' || loadState === 'loading-ai' ? ' spinning' : ''}`}>↺</span>
          {loadState === 'loading-data' ? 'Loading data…'
            : loadState === 'loading-ai' ? 'Thinking…'
            : generatedAt ? `Updated ${timeSince(Date.now() - generatedAt)}`
            : 'Refresh'}
        </button>
      </div>

      <div className="rec-body">

        {/* Loading states */}
        {(loadState === 'loading-data' || loadState === 'loading-ai') && (
          <div className="rec-loading">
            <div className="rec-loading-dots">
              <span /><span /><span />
            </div>
            <p>{loadState === 'loading-data' ? 'Loading community data…' : 'Generating recommendations…'}</p>
          </div>
        )}

        {/* Error */}
        {loadState === 'error' && (
          <div className="rec-error">
            <p>⚠ {error}</p>
            <button className="rec-retry-btn" onClick={generate}>Try again</button>
          </div>
        )}

        {/* Empty — no upcoming events */}
        {loadState === 'done' && recommendations.length === 0 && (
          <div className="rec-empty">
            <div className="rec-empty-icon">◈</div>
            <p className="rec-empty-title">No upcoming events</p>
            <p className="rec-empty-sub">Add an upcoming event to get AI recommendations for it.</p>
          </div>
        )}

        {/* Event cards */}
        {loadState === 'done' && recommendations.map(rec => (
          <div key={rec.event.id} className="rec-event-card">

            {/* Card header */}
            <div className="rec-event-header">
              <div className="rec-event-header-left">
                <span className={`rec-type-badge${rec.event.type === 'Workshop' ? ' workshop' : rec.event.type === 'Social' ? ' social' : ''}`}>
                  {rec.event.type || 'Networking'}
                </span>
                <span className="rec-event-date">
                  {formatEventDate(rec.event.date)}
                </span>
              </div>
              <span className={`rec-rsvp-pill${!rec.event.is_free ? ' paid' : ''}`}>
                {rec.event.rsvp_count} RSVPs{!rec.event.is_free && rec.event.ticket_price ? ` · €${Number(rec.event.ticket_price).toFixed(0)}` : ''}
              </span>
            </div>

            {/* Event title */}
            <div className="rec-event-title-row">
              <h3 className="rec-event-title">{rec.event.title}</h3>
              <p className="rec-event-meta">
                {rec.event.location || 'TBD'}&nbsp;·&nbsp;
                {rec.event.is_free ? 'Free entry' : `€${Number(rec.event.ticket_price).toFixed(2)} per ticket`}
              </p>
            </div>

            <div className="rec-sections">

              {/* Invite leads */}
              {rec.inviteLeads.length > 0 && (
                <div className="rec-section">
                  <div className="rec-section-label">
                    <span className="rec-dot rec-dot--violet" />
                    Invite personally — similar events attended, not yet RSVPd
                  </div>
                  <div className="rec-rows">
                    {rec.inviteLeads.map((item, i) => (
                      <div key={item.clerk_user_id} className="rec-row">
                        <div className="rec-row-left">
                          <div className="rec-avatar" style={{ background: avColor(i).bg, color: avColor(i).fg }}>
                            {getInitials(item.name)}
                          </div>
                          <div>
                            <div className="rec-row-name">{item.name}</div>
                            <div className="rec-row-reason">{item.role}{item.reason ? ` · ${item.reason}` : ''}</div>
                          </div>
                        </div>
                        <button
                          className={`rec-copy-btn${copiedId === item.clerk_user_id + rec.event.id ? ' copied' : ''}`}
                          onClick={() => handleCopy(item, rec.event)}
                        >
                          {copiedId === item.clerk_user_id + rec.event.id ? '✓ Copied' : '⎘ Copy message'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              {rec.inviteLeads.length > 0 && (rec.ticketConverts.length > 0 || rec.noShowRisks.length > 0) && (
                <div className="rec-divider" />
              )}

              {/* Ticket converts — paid events only */}
              {!rec.event.is_free && rec.ticketConverts.length > 0 && (
                <div className="rec-section">
                  <div className="rec-section-label">
                    <span className="rec-dot rec-dot--yellow" />
                    Warm ticket converts — attended free events, never paid
                  </div>
                  <div className="rec-rows">
                    {rec.ticketConverts.map((item, i) => (
                      <div key={item.clerk_user_id} className="rec-row">
                        <div className="rec-row-left">
                          <div className="rec-avatar" style={{ background: avColor(i + 2).bg, color: avColor(i + 2).fg }}>
                            {getInitials(item.name)}
                          </div>
                          <div>
                            <div className="rec-row-name">{item.name}</div>
                            <div className="rec-row-reason">{item.role}{item.reason ? ` · ${item.reason}` : ''}</div>
                          </div>
                        </div>
                        <button
                          className={`rec-copy-btn${copiedId === item.clerk_user_id + rec.event.id ? ' copied' : ''}`}
                          onClick={() => handleCopy(item, rec.event)}
                        >
                          {copiedId === item.clerk_user_id + rec.event.id ? '✓ Copied' : '⎘ Copy message'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider before no-show */}
              {(rec.inviteLeads.length > 0 || rec.ticketConverts.length > 0) && rec.noShowRisks.length > 0 && (
                <div className="rec-divider" />
              )}

              {/* No-show risks */}
              {rec.noShowRisks.length > 0 && (
                <div className="rec-section">
                  <div className="rec-section-label">
                    <span className="rec-dot rec-dot--red" />
                    No-show risk — RSVPd but low engagement history
                  </div>
                  <div className="rec-rows">
                    {rec.noShowRisks.map((item, i) => (
                      <div key={item.clerk_user_id} className="rec-row rec-row--risk">
                        <div className="rec-row-left">
                          <div className="rec-avatar" style={{ background: 'rgba(226,75,74,0.2)', color: '#ff8a89' }}>
                            {getInitials(item.name)}
                          </div>
                          <div>
                            <div className="rec-row-name">{item.name}</div>
                            <div className="rec-row-reason">{item.role}{item.reason ? ` · ${item.reason}` : ''}</div>
                          </div>
                        </div>
                        <span className="rec-risk-badge">At risk</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All sections empty for this event */}
              {rec.inviteLeads.length === 0 && rec.ticketConverts.length === 0 && rec.noShowRisks.length === 0 && (
                <div className="rec-section-empty">
                  All members have RSVPd and engagement looks healthy. Nothing to action right now.
                </div>
              )}

            </div>
          </div>
        ))}

      </div>

      {loadState === 'done' && generatedAt && (
        <p className="rec-footer-note">
          Generated by Claude · Based on attendance, engagement scores, and RSVP history
        </p>
      )}
    </div>
  )
}
