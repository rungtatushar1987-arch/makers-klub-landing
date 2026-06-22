import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── CORS headers ──────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MK_ORG = 'cf84f186-0d86-40c3-baa7-b5f33598d0fd'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en', {
    weekday: 'short', day: 'numeric', month: 'short',
  })
}

function buildPrompt(
  event: any,
  members: any[],
  rsvpdIds: Set<string>,
  pastEventCount: number,
): string {
  const notRsvpd = members.filter(m => !rsvpdIds.has(m.clerk_user_id))
  const hasRsvpd = members.filter(m =>  rsvpdIds.has(m.clerk_user_id))

  return `You are an AI assistant helping a community organiser in Berlin grow their events.

## Upcoming event
- Title: ${event.title}
- Type: ${event.type || 'Networking'}
- Date: ${formatDate(event.date)}
- Venue: ${event.location || 'TBD'}
- Pricing: ${event.is_free ? 'Free' : `€${event.ticket_price}`}
- Current RSVPs: ${event.rsvp_count}
- Total past events hosted: ${pastEventCount}

## Members who have NOT yet RSVPd (${notRsvpd.length})
${notRsvpd.map(m =>
  `- ID: ${m.clerk_user_id} | Name: ${m.full_name} | Role: ${m.role_category || 'unknown'} | Events attended: ${m.events_attended} | Event types: ${m.event_types_attended.join(', ') || 'none'} | Connections: ${m.connections_made} | Engagement: ${m.engagement_score}/100 | Last seen: ${m.last_seen_iso ? new Date(m.last_seen_iso).toLocaleDateString() : 'never'} | Paying: ${m.is_paying}`
).join('\n')}

## Members who HAVE RSVPd (${hasRsvpd.length})
${hasRsvpd.map(m =>
  `- ID: ${m.clerk_user_id} | Name: ${m.full_name} | Role: ${m.role_category || 'unknown'} | Events attended: ${m.events_attended} | Engagement: ${m.engagement_score}/100 | Last seen: ${m.last_seen_iso ? new Date(m.last_seen_iso).toLocaleDateString() : 'never'}`
).join('\n')}

## Your task
Return a JSON object with exactly these three arrays. Each item must include clerk_user_id, name, role, and reason (1 short sentence).

1. inviteLeads — up to 5 members from NOT RSVPd most likely to attend based on role, past event type history, and engagement. Prioritise members who attended similar event types before.

2. ticketConverts — ${event.is_free
    ? 'this is a free event — return empty []'
    : 'up to 4 members from NOT RSVPd who are warm ticket candidates — attended multiple free events, high engagement, never paid'}

3. noShowRisks — up to 4 members from RSVPd list at risk of not showing — low engagement, first-time RSVP, or last seen 45+ days ago.

Return ONLY valid JSON, no markdown, no explanation:
{"inviteLeads":[{"clerk_user_id":"...","name":"...","role":"...","reason":"..."}],"ticketConverts":[],"noShowRisks":[]}`
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS })
  }

  try {
    // ── 1. Auth — require Clerk JWT, verify org admin ──────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const token = authHeader.replace('Bearer ', '')

    // Decode JWT payload to get clerk_user_id (sub claim)
    let clerkUserId: string
    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      clerkUserId = payload.sub
      if (!clerkUserId) throw new Error('no sub')
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // Service-role client — bypasses RLS for server-side queries
    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Verify the caller is an org admin
    const { data: adminCheck } = await db
      .from('org_members')
      .select('org_role')
      .eq('org_id', MK_ORG)
      .eq('clerk_user_id', clerkUserId)
      .in('org_role', ['owner', 'admin'])
      .maybeSingle()

    if (!adminCheck) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Fetch all org data ──────────────────────────────────────────────────
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

    const now            = new Date()
    const allEvents      = evData as any[]
    const upcomingEvents = allEvents.filter(e => new Date(e.date) >= now)
    const pastEvents     = allEvents.filter(e => new Date(e.date) <  now)

    if (upcomingEvents.length === 0) {
      return new Response(JSON.stringify({ recommendations: [] }), {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. Build lookup maps ───────────────────────────────────────────────────
    const profileMap   = new Map((profileData || []).map((p: any) => [p.clerk_user_id, p]))
    const eventTypeMap = new Map(allEvents.map((e: any) => [e.id, e.type || 'Networking']))
    const pastEventIds = new Set(pastEvents.map((e: any) => e.id))

    const connCount = new Map<string, number>()
    for (const c of (connData || []) as any[]) {
      connCount.set(c.clerk_user_id, (connCount.get(c.clerk_user_id) || 0) + 1)
    }

    const rsvpCountByEv = new Map<string, number>()
    const memberAtt     = new Map<string, {
      count: number; types: Set<string>; lastSeen: string | null
    }>()

    for (const r of (rsvpData || []) as any[]) {
      rsvpCountByEv.set(r.event_id, (rsvpCountByEv.get(r.event_id) || 0) + 1)
      if (!pastEventIds.has(r.event_id)) continue
      const cur = memberAtt.get(r.clerk_user_id) || { count: 0, types: new Set<string>(), lastSeen: null }
      cur.count++
      const t = eventTypeMap.get(r.event_id)
      if (t) cur.types.add(t)
      if (!cur.lastSeen || r.created_at > cur.lastSeen) cur.lastSeen = r.created_at
      memberAtt.set(r.clerk_user_id, cur)
    }

    upcomingEvents.forEach((e: any) => { e.rsvp_count = rsvpCountByEv.get(e.id) || 0 })

    // ── 4. Build member snapshots ──────────────────────────────────────────────
    const realMembers = (orgRows as any[]).filter(r => !r.clerk_user_id.startsWith('mock_'))

    const snapshots = realMembers.map(r => {
      const profile   = profileMap.get(r.clerk_user_id)
      const att       = memberAtt.get(r.clerk_user_id) || { count: 0, types: new Set<string>(), lastSeen: null }
      const conns     = connCount.get(r.clerk_user_id) || 0
      const attPct    = pastEvents.length > 0 ? Math.min(100, Math.round((att.count / pastEvents.length) * 100)) : 0
      const connScore = Math.min(100, conns * 20)
      return {
        clerk_user_id:        r.clerk_user_id,
        full_name:            profile?.full_name     || 'Unknown',
        role_category:        profile?.role_category || '',
        events_attended:      att.count,
        event_types_attended: Array.from(att.types),
        connections_made:     conns,
        last_seen_iso:        att.lastSeen,
        is_paying:            r.is_paying || false,
        engagement_score:     Math.round(attPct * 0.6 + connScore * 0.4),
      }
    })

    // ── 5. Call Claude per upcoming event ──────────────────────────────────────
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured')

    const recommendations = []

    for (const event of upcomingEvents) {
      const rsvpdIds = new Set<string>(
        (rsvpData || [])
          .filter((r: any) => r.event_id === event.id)
          .map((r: any) => r.clerk_user_id as string)
      )

      const prompt = buildPrompt(event, snapshots, rsvpdIds, pastEvents.length)

      const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type':      'application/json',
          'x-api-key':         anthropicKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model:      'claude-sonnet-4-6',
          max_tokens: 1000,
          messages:   [{ role: 'user', content: prompt }],
        }),
      })

      const aiData = await aiRes.json()
      const text   = aiData.content?.find((b: any) => b.type === 'text')?.text || '{}'

      let parsed: any = { inviteLeads: [], ticketConverts: [], noShowRisks: [] }
      try {
        parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
      } catch { /* use empty defaults */ }

      recommendations.push({
        event: {
          id:           event.id,
          title:        event.title,
          date:         event.date,
          type:         event.type,
          location:     event.location,
          is_free:      event.is_free,
          ticket_price: event.ticket_price,
          rsvp_count:   event.rsvp_count,
        },
        inviteLeads:    (parsed.inviteLeads    || []).slice(0, 5),
        ticketConverts: (parsed.ticketConverts || []).slice(0, 4),
        noShowRisks:    (parsed.noShowRisks    || []).slice(0, 4),
        generatedAt:    Date.now(),
      })
    }

    return new Response(JSON.stringify({ recommendations }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('generate-recommendations error:', err)
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
