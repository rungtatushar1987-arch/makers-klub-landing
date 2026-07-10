import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── CORS headers ──────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// ── Constants ─────────────────────────────────────────────────────────────────

const MK_ORG = 'cf84f186-0d86-40c3-baa7-b5f33598d0fd'
const FETCH_TIMEOUT_MS = 12000
const MAX_TEXT_CHARS = 8000
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

// ── Result shape returned to the client ────────────────────────────────────────

type ImportedEvent = {
  title:        string | null
  date:         string | null   // ISO 8601
  end_date:     string | null   // ISO 8601
  location:     string | null   // venue name
  address:      string | null
  description:  string | null
  is_free:      boolean | null
  ticket_price: number | null
  source_url:   string
  fields_from_jsonld: string[]  // which fields JSON-LD supplied confidently
  fields_from_ai:     string[]  // which fields the AI fallback supplied
  warnings:     string[]       // fields that couldn't be determined at all
}

// ── SSRF guard ────────────────────────────────────────────────────────────────

function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase()
  if (h === 'localhost' || h === '0.0.0.0' || h === '::1') return true
  if (/^127\./.test(h)) return true
  if (/^10\./.test(h)) return true
  if (/^192\.168\./.test(h)) return true
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(h)) return true
  if (/^169\.254\./.test(h)) return true
  return false
}

// ── HTML helpers ──────────────────────────────────────────────────────────────

function extractJsonLd(html: string): any[] {
  const blocks: any[] = []
  const re = /<script[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(m[1].trim())
      blocks.push(parsed)
    } catch { /* skip malformed block */ }
  }
  return blocks
}

function findEventNode(node: any): any | null {
  if (!node || typeof node !== 'object') return null
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findEventNode(item)
      if (found) return found
    }
    return null
  }
  const type = node['@type']
  const types = Array.isArray(type) ? type : [type]
  if (types.some(t => typeof t === 'string' && t.toLowerCase().includes('event'))) return node
  if (node['@graph']) return findEventNode(node['@graph'])
  return null
}

function flattenAddress(addr: any): string | null {
  if (!addr) return null
  if (typeof addr === 'string') return addr
  const parts = [addr.streetAddress, addr.addressLocality, addr.postalCode, addr.addressCountry]
    .filter(Boolean)
  return parts.length ? parts.join(', ') : null
}

function parseJsonLdEvent(html: string): Partial<ImportedEvent> & { fields: string[] } {
  const blocks = extractJsonLd(html)
  let eventNode: any = null
  for (const b of blocks) {
    eventNode = findEventNode(b)
    if (eventNode) break
  }
  if (!eventNode) return { fields: [] }

  const fields: string[] = []
  const out: Partial<ImportedEvent> = {}

  if (typeof eventNode.name === 'string' && eventNode.name.trim()) {
    out.title = eventNode.name.trim(); fields.push('title')
  }
  if (typeof eventNode.startDate === 'string') {
    const d = new Date(eventNode.startDate)
    if (!isNaN(d.getTime())) { out.date = d.toISOString(); fields.push('date') }
  }
  if (typeof eventNode.endDate === 'string') {
    const d = new Date(eventNode.endDate)
    if (!isNaN(d.getTime())) { out.end_date = d.toISOString(); fields.push('end_date') }
  }
  if (typeof eventNode.description === 'string' && eventNode.description.trim()) {
    out.description = eventNode.description.trim(); fields.push('description')
  }

  const loc = Array.isArray(eventNode.location) ? eventNode.location[0] : eventNode.location
  if (loc) {
    if (typeof loc === 'string') {
      out.location = loc; fields.push('location')
    } else if (typeof loc === 'object') {
      if (typeof loc.name === 'string' && loc.name.trim()) { out.location = loc.name.trim(); fields.push('location') }
      const addr = flattenAddress(loc.address)
      if (addr) { out.address = addr; fields.push('address') }
    }
  }

  const offersRaw = eventNode.offers
  const offer = Array.isArray(offersRaw) ? offersRaw[0] : offersRaw
  if (offer && typeof offer === 'object') {
    const priceRaw = offer.price ?? offer.lowPrice
    const price = priceRaw !== undefined ? Number(priceRaw) : NaN
    if (!isNaN(price)) {
      out.is_free = price <= 0
      out.ticket_price = price > 0 ? price : null
      fields.push('is_free')
      if (price > 0) fields.push('ticket_price')
    }
  }

  return { ...out, fields }
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

// ── AI fallback extraction ─────────────────────────────────────────────────────

async function extractWithAi(pageText: string, anthropicKey: string): Promise<Partial<ImportedEvent> & { fields: string[] }> {
  const prompt = `You are extracting event details from the visible text of a webpage (an event listing page — could be from any platform). The text may include unrelated navigation, ads, or boilerplate.

## Page text
${pageText.slice(0, MAX_TEXT_CHARS)}

## Your task
Return a JSON object with exactly these fields. Use null for anything you cannot determine — do not guess or invent values.

- title: the event's name
- date: event start date & time, ISO 8601 (include a timezone offset if you can infer one; otherwise assume Europe/Berlin)
- end_date: event end date & time, ISO 8601, or null if not stated
- location: the venue name (not the full address)
- address: the street address, or null
- description: a 1-3 sentence summary of what the event is about, in your own words if needed
- is_free: true if the event is free to attend, false if it costs money, null if unclear
- ticket_price: the numeric ticket price (no currency symbol), or null if free or unknown

Return ONLY valid JSON, no markdown, no explanation:
{"title":null,"date":null,"end_date":null,"location":null,"address":null,"description":null,"is_free":null,"ticket_price":null}`

  const aiRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type':      'application/json',
      'x-api-key':         anthropicKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      'claude-sonnet-4-6',
      max_tokens: 600,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  const aiData = await aiRes.json()
  const text   = aiData.content?.find((b: any) => b.type === 'text')?.text || '{}'

  let parsed: any = {}
  try {
    parsed = JSON.parse(text.replace(/```json|```/g, '').trim())
  } catch { return { fields: [] } }

  const fields: string[] = []
  const out: Partial<ImportedEvent> = {}

  if (typeof parsed.title === 'string' && parsed.title.trim()) { out.title = parsed.title.trim(); fields.push('title') }
  if (typeof parsed.date === 'string') {
    const d = new Date(parsed.date)
    if (!isNaN(d.getTime())) { out.date = d.toISOString(); fields.push('date') }
  }
  if (typeof parsed.end_date === 'string') {
    const d = new Date(parsed.end_date)
    if (!isNaN(d.getTime())) { out.end_date = d.toISOString(); fields.push('end_date') }
  }
  if (typeof parsed.location === 'string' && parsed.location.trim()) { out.location = parsed.location.trim(); fields.push('location') }
  if (typeof parsed.address === 'string' && parsed.address.trim()) { out.address = parsed.address.trim(); fields.push('address') }
  if (typeof parsed.description === 'string' && parsed.description.trim()) { out.description = parsed.description.trim(); fields.push('description') }
  if (typeof parsed.is_free === 'boolean') { out.is_free = parsed.is_free; fields.push('is_free') }
  if (typeof parsed.ticket_price === 'number') { out.ticket_price = parsed.ticket_price; fields.push('ticket_price') }

  return { ...out, fields }
}

// ── Main handler ──────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    // ── 1. Auth — require Clerk JWT, verify org admin ──────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.replace('Bearer ', '')

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

    const db = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

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

    // ── 2. Parse + validate URL ─────────────────────────────────────────────────
    const body = await req.json().catch(() => ({}))
    const rawUrl = typeof body.url === 'string' ? body.url.trim() : ''
    if (!rawUrl) {
      return new Response(JSON.stringify({ error: 'Missing url' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    let target: URL
    try {
      target = new URL(rawUrl)
    } catch {
      return new Response(JSON.stringify({ error: 'Not a valid URL' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    if (target.protocol !== 'http:' && target.protocol !== 'https:') {
      return new Response(JSON.stringify({ error: 'Only http/https URLs are supported' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    if (isBlockedHost(target.hostname)) {
      return new Response(JSON.stringify({ error: 'That URL cannot be fetched' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── 3. Fetch the page ────────────────────────────────────────────────────────
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    let html: string
    try {
      const pageRes = await fetch(target.toString(), {
        headers: { 'User-Agent': UA, 'Accept': 'text/html' },
        signal: controller.signal,
      })
      clearTimeout(timer)
      if (!pageRes.ok) {
        return new Response(JSON.stringify({ error: `Couldn't load that page (HTTP ${pageRes.status})` }), {
          status: 422, headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
      const contentType = pageRes.headers.get('content-type') || ''
      if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
        return new Response(JSON.stringify({ error: 'That URL does not look like a webpage' }), {
          status: 422, headers: { ...CORS, 'Content-Type': 'application/json' },
        })
      }
      html = await pageRes.text()
    } catch (err: any) {
      clearTimeout(timer)
      const msg = err?.name === 'AbortError' ? 'The page took too long to load' : 'Failed to fetch that URL'
      return new Response(JSON.stringify({ error: msg }), {
        status: 422, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── 4. JSON-LD first ─────────────────────────────────────────────────────────
    const jsonld = parseJsonLdEvent(html)

    // ── 5. Claude fallback for anything JSON-LD didn't cover ────────────────────
    const REQUIRED_FOR_CONFIDENCE = ['title', 'date']
    const missingRequired = REQUIRED_FOR_CONFIDENCE.some(f => !jsonld.fields.includes(f))

    let ai: Partial<ImportedEvent> & { fields: string[] } = { fields: [] }
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (missingRequired && anthropicKey) {
      const text = htmlToText(html)
      ai = await extractWithAi(text, anthropicKey)
    }

    // ── 6. Merge — JSON-LD wins per-field, AI fills gaps ────────────────────────
    const ALL_FIELDS: (keyof ImportedEvent)[] = [
      'title', 'date', 'end_date', 'location', 'address', 'description', 'is_free', 'ticket_price',
    ]
    const result: ImportedEvent = {
      title: null, date: null, end_date: null, location: null, address: null,
      description: null, is_free: null, ticket_price: null,
      source_url: target.toString(),
      fields_from_jsonld: [], fields_from_ai: [], warnings: [],
    }

    for (const f of ALL_FIELDS) {
      if (jsonld.fields.includes(f)) {
        (result as any)[f] = (jsonld as any)[f]
        result.fields_from_jsonld.push(f)
      } else if (ai.fields.includes(f)) {
        (result as any)[f] = (ai as any)[f]
        result.fields_from_ai.push(f)
      } else {
        result.warnings.push(f)
      }
    }

    // Nothing usable at all — treat as a hard failure rather than an empty form
    if (result.fields_from_jsonld.length === 0 && result.fields_from_ai.length === 0) {
      return new Response(JSON.stringify({ error: "Couldn't find event details on that page — try filling it in manually" }), {
        status: 422, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(result), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    console.error('import-event error:', err)
    return new Response(JSON.stringify({ error: err?.message || 'Internal error' }), {
      status: 500, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }
})
