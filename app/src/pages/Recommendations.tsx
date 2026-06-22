import { useEffect, useState, useCallback } from 'react'
import { useSession } from '@clerk/clerk-react'
import { getInitials } from '../supabase'
import './Recommendations.css'

// ── Types ────────────────────────────────────────────────────────────────────

type RecommendationItem = {
  clerk_user_id: string
  name: string
  role: string
  reason: string
}

type EventRec = {
  event: {
    id: string
    title: string
    date: string
    type: string
    location: string
    is_free: boolean
    ticket_price: number | null
    rsvp_count: number
  }
  inviteLeads: RecommendationItem[]
  ticketConverts: RecommendationItem[]
  noShowRisks: RecommendationItem[]
  generatedAt: number
}

type LoadState = 'idle' | 'loading' | 'done' | 'error'

// ── Helpers ───────────────────────────────────────────────────────────────────

const AV_COLORS = [
  { bg: 'rgba(122,78,216,0.3)',  fg: '#c4a8ff' },
  { bg: 'rgba(59,109,217,0.3)', fg: '#7aaeff'  },
  { bg: 'rgba(252,184,19,0.2)', fg: '#fcb813'  },
  { bg: 'rgba(226,75,74,0.2)',  fg: '#ff8a89'  },
  { bg: 'rgba(29,158,117,0.2)', fg: '#5de0b0'  },
]
function avColor(i: number) { return AV_COLORS[i % AV_COLORS.length] }

function formatEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function timeSince(ms: number): string {
  const mins = Math.floor(ms / 60000)
  if (mins < 1)  return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function copyMessage(item: RecommendationItem, event: EventRec['event']): void {
  const firstName = item.name.split(' ')[0]
  const pricing   = event.is_free ? "It's free to join." : `Tickets are €${Number(event.ticket_price).toFixed(0)}.`
  const msg = `Hey ${firstName}, just wanted to personally invite you to our next event — ${event.title} on ${formatEventDate(event.date)}. ${pricing} Would love to see you there!`
  navigator.clipboard.writeText(msg).catch(() => {})
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function Recommendations() {
  const { session } = useSession()
  const [loadState, setLoadState]           = useState<LoadState>('idle')
  const [recommendations, setRecommendations] = useState<EventRec[]>([])
  const [generatedAt, setGeneratedAt]       = useState<number | null>(null)
  const [error, setError]                   = useState<string | null>(null)
  const [copiedId, setCopiedId]             = useState<string | null>(null)

  const generate = useCallback(async () => {
    if (!session) return
    setLoadState('loading')
    setError(null)

    try {
      const token = await session.getToken()

      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-recommendations`,
        {
          method:  'POST',
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`,
          },
        }
      )

      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setRecommendations(data.recommendations || [])
      setGeneratedAt(Date.now())
      setLoadState('done')

    } catch (err: any) {
      console.error('Recommendations error:', err)
      setError(err?.message || 'Something went wrong.')
      setLoadState('error')
    }
  }, [session])

  useEffect(() => { generate() }, [generate])

  function handleCopy(item: RecommendationItem, event: EventRec['event']) {
    copyMessage(item, event)
    setCopiedId(item.clerk_user_id + event.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
          disabled={loadState === 'loading'}
        >
          <span className={`rec-refresh-icon${loadState === 'loading' ? ' spinning' : ''}`}>↺</span>
          {loadState === 'loading'
            ? 'Generating…'
            : generatedAt
            ? `Updated ${timeSince(Date.now() - generatedAt)}`
            : 'Refresh'}
        </button>
      </div>

      <div className="rec-body">

        {/* Loading */}
        {loadState === 'loading' && (
          <div className="rec-loading">
            <div className="rec-loading-dots">
              <span /><span /><span />
            </div>
            <p>Generating recommendations…</p>
          </div>
        )}

        {/* Error */}
        {loadState === 'error' && (
          <div className="rec-error">
            <p>⚠ {error}</p>
            <button className="rec-retry-btn" onClick={generate}>Try again</button>
          </div>
        )}

        {/* Empty */}
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

            <div className="rec-event-header">
              <div className="rec-event-header-left">
                <span className={`rec-type-badge${
                  rec.event.type === 'Workshop' ? ' workshop'
                  : rec.event.type === 'Social'  ? ' social'
                  : ''
                }`}>
                  {rec.event.type || 'Networking'}
                </span>
                <span className="rec-event-date">{formatEventDate(rec.event.date)}</span>
              </div>
              <span className={`rec-rsvp-pill${!rec.event.is_free ? ' paid' : ''}`}>
                {rec.event.rsvp_count} RSVPs
                {!rec.event.is_free && rec.event.ticket_price
                  ? ` · €${Number(rec.event.ticket_price).toFixed(0)}`
                  : ''}
              </span>
            </div>

            <div className="rec-event-title-row">
              <h3 className="rec-event-title">{rec.event.title}</h3>
              <p className="rec-event-meta">
                {rec.event.location || 'TBD'}&nbsp;·&nbsp;
                {rec.event.is_free
                  ? 'Free entry'
                  : `€${Number(rec.event.ticket_price).toFixed(2)} per ticket`}
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
                            <div className="rec-row-reason">
                              {item.role}{item.reason ? ` · ${item.reason}` : ''}
                            </div>
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
                            <div className="rec-row-reason">
                              {item.role}{item.reason ? ` · ${item.reason}` : ''}
                            </div>
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
                    {rec.noShowRisks.map((item) => (
                      <div key={item.clerk_user_id} className="rec-row rec-row--risk">
                        <div className="rec-row-left">
                          <div className="rec-avatar" style={{ background: 'rgba(226,75,74,0.2)', color: '#ff8a89' }}>
                            {getInitials(item.name)}
                          </div>
                          <div>
                            <div className="rec-row-name">{item.name}</div>
                            <div className="rec-row-reason">
                              {item.role}{item.reason ? ` · ${item.reason}` : ''}
                            </div>
                          </div>
                        </div>
                        <span className="rec-risk-badge">At risk</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* All empty */}
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
