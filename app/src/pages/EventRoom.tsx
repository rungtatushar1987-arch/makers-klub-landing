import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useUser, useSession } from '@clerk/clerk-react'
import { useKlub } from '../KlubContext'
import { getSupabaseClient, getInitials, MK_ADMIN_USER_IDS, type Profile } from '../supabase'
import './EventRoom.css'

type Kind = 'question' | 'intro' | 'link' | 'reply'
type Post = {
  id: string; event_id: string; clerk_user_id: string; kind: Kind
  body: string; link_url: string | null; parent_id: string | null; pinned: boolean; created_at: string
}

const COMPOSE_KINDS: { kind: Exclude<Kind, 'reply'>; label: string; placeholder: string }[] = [
  { kind: 'question', label: 'Ask a question', placeholder: 'What would you like to ask the group or the speakers?' },
  { kind: 'intro',    label: 'Introduce yourself', placeholder: 'Who you are, what you’re working on, and what you’d like from this event.' },
  { kind: 'link',     label: 'Share a link', placeholder: 'What is it, and why is it worth a look?' },
]
const KIND_LABEL: Record<Kind, string> = { question: 'Question', intro: 'Intro', link: 'Link', reply: 'Reply' }
const FILTERS: { key: 'all' | Exclude<Kind, 'reply'>; label: string }[] = [
  { key: 'all', label: 'All' }, { key: 'question', label: 'Questions' }, { key: 'intro', label: 'Intros' }, { key: 'link', label: 'Links' },
]

// Only ever render http(s) links; anything else (javascript:, data:) is dropped.
function cleanUrl(raw: string): string | null {
  const v = raw.trim()
  if (!v) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`
  try {
    const u = new URL(withScheme)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch { return null }
}
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, '') } catch { return u } }

function ago(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const h = Math.round(mins / 60)
  if (h < 24) return `${h} h ago`
  const d = Math.round(h / 24)
  if (d < 14) return `${d} d ago`
  return new Date(iso).toLocaleDateString('en', { day: 'numeric', month: 'short' })
}

export default function EventRoom() {
  const { eventId } = useParams()
  const { user } = useUser()
  const { session } = useSession()
  const { events, myRsvps, allProfiles, profile, loading } = useKlub()

  const [posts, setPosts] = useState<Post[]>([])
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | Exclude<Kind, 'reply'>>('all')

  const [kind, setKind] = useState<Exclude<Kind, 'reply'>>('question')
  const [body, setBody] = useState('')
  const [link, setLink] = useState('')
  const [posting, setPosting] = useState(false)
  const [replyTo, setReplyTo] = useState<string | null>(null)
  const [replyBody, setReplyBody] = useState('')

  const event = events.find(e => e.id === eventId)
  const isAdmin = !!user?.id && MK_ADMIN_USER_IDS.includes(user.id)
  const status = eventId ? myRsvps[eventId] : undefined
  const isMember = isAdmin || status === 'going' || status === 'waitlist'
  const byId = useMemo(() => new Map(allProfiles.map(p => [p.clerk_user_id, p])), [allProfiles])

  const load = useCallback(async () => {
    if (!eventId || !session) return
    const db = getSupabaseClient(await session.getToken())
    const { data, error: err } = await db.from('event_posts').select('*').eq('event_id', eventId).order('created_at', { ascending: true })
    if (err) setError('Couldn’t load the room. Check your connection and try again.')
    else { setPosts((data as Post[]) || []); setError(null) }
    setFetching(false)
  }, [eventId, session])

  useEffect(() => {
    if (!isMember) { setFetching(false); return }
    load()
    // Keep the room fresh while the tab is open.
    const t = setInterval(() => { if (document.visibilityState === 'visible') load() }, 30000)
    return () => clearInterval(t)
  }, [isMember, load])

  function pickKind(k: Exclude<Kind, 'reply'>) {
    setKind(k)
    // An intro is mostly "here's who I am": offer the links already on the profile.
    if (k === 'intro' && !link) setLink(profile?.linkedin_url || profile?.website_url || '')
  }

  async function submit(k: Kind, text: string, url: string, parentId: string | null) {
    if (!user || !eventId || !session) return false
    const cleaned = cleanUrl(url)
    if (url.trim() && !cleaned) { setError('That link doesn’t look right. Use a full address like https://example.com.'); return false }
    if (k === 'link' && !cleaned) { setError('Add the link you want to share.'); return false }
    const db = getSupabaseClient(await session.getToken())
    const { error: err } = await db.from('event_posts').insert({
      event_id: eventId, clerk_user_id: user.id, kind: k, body: text.trim(), link_url: cleaned, parent_id: parentId,
    })
    if (err) { setError('Couldn’t post that. Try again in a moment.'); return false }
    setError(null)
    await load()
    return true
  }

  async function post() {
    if (!body.trim()) return
    setPosting(true)
    if (await submit(kind, body, link, null)) { setBody(''); setLink('') }
    setPosting(false)
  }

  async function reply(parentId: string) {
    if (!replyBody.trim()) return
    setPosting(true)
    if (await submit('reply', replyBody, '', parentId)) { setReplyBody(''); setReplyTo(null) }
    setPosting(false)
  }

  async function togglePin(p: Post) {
    if (!session) return
    const db = getSupabaseClient(await session.getToken())
    await db.from('event_posts').update({ pinned: !p.pinned }).eq('id', p.id)
    load()
  }

  async function remove(p: Post) {
    if (!session || !window.confirm(p.parent_id ? 'Delete this reply?' : 'Delete this post and its replies?')) return
    const db = getSupabaseClient(await session.getToken())
    await db.from('event_posts').delete().eq('id', p.id)
    load()
  }

  if (loading) return <div className="mkw-loading">Loading…</div>

  if (!event) {
    return (
      <div className="mkw-main-body room">
        <div className="room-gate"><b>We couldn’t find that event</b><p>It may have been removed.</p><Link to="/events" className="mk-btn mk-btn-primary mk-btn-sm">Back to events</Link></div>
      </div>
    )
  }

  const start = new Date(event.date)
  const end = new Date(event.end_date || event.date)
  const now = new Date()
  const phase = now < start ? 'before' : now <= end ? 'live' : 'after'
  const days = Math.ceil((start.getTime() - now.getTime()) / 86400000)
  const phaseText = phase === 'before' ? (days <= 1 ? 'Event is tomorrow' : `Event is in ${days} days`) : phase === 'live' ? 'Happening now' : 'Event has ended'
  const phaseHint = phase === 'before'
    ? 'Introduce yourself and ask what you want covered.'
    : phase === 'live' ? 'Post questions as they come up.' : 'Follow up with people you met and share what you took away.'

  const tops = posts.filter(p => !p.parent_id)
  const repliesOf = (id: string) => posts.filter(p => p.parent_id === id)
  const shown = tops
    .filter(p => filter === 'all' || p.kind === filter)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.created_at.localeCompare(a.created_at))
  const countOf = (k: typeof filter) => k === 'all' ? tops.length : tops.filter(p => p.kind === k).length

  const person = (id: string): Profile | undefined => byId.get(id)
  const who = (id: string) => person(id)?.full_name || 'Member'
  const cfg = COMPOSE_KINDS.find(k => k.kind === kind)!

  const Avatar = ({ id }: { id: string }) => (
    <span className="room-av" style={{ background: person(id)?.avatar_color || 'var(--mk-yellow)' }}>{getInitials(person(id)?.full_name)}</span>
  )

  return (
    <>
      <div className="mkw-pagehead">
        <div>
          <div className="eyebrow">
            <Link to={`/events?event=${event.id}`}>← {event.title}</Link>
          </div>
          <h1>Event room</h1>
          <p className="sub">{start.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}{event.location ? ` · ${event.location}` : ''}</p>
        </div>
        <span className={`room-phase room-phase--${phase}`}>{phaseText}</span>
      </div>

      <div className="mkw-main-body room">
        {!isMember ? (
          <div className="room-gate">
            <b>The room is for people registered for this event</b>
            <p>Register to ask questions, introduce yourself and share links with the others who are going.</p>
            <Link to={`/events?event=${event.id}`} className="mk-btn mk-btn-primary mk-btn-sm">See details and register</Link>
          </div>
        ) : (
          <>
            {/* ── Composer ── */}
            <section className="room-compose" aria-label="Write a post">
              <div className="room-kinds" role="group" aria-label="Post type">
                {COMPOSE_KINDS.map(k => (
                  <button key={k.kind} type="button" aria-pressed={kind === k.kind} className={`room-kind${kind === k.kind ? ' active' : ''}`} onClick={() => pickKind(k.kind)}>{k.label}</button>
                ))}
              </div>
              <label className="sr-only" htmlFor="room-body">{cfg.label}</label>
              <textarea id="room-body" className="mkw-form-textarea" rows={3} maxLength={2000} value={body} onChange={e => setBody(e.target.value)} placeholder={cfg.placeholder} />
              <div className="room-compose-foot">
                <div className="room-linkfield">
                  <label className="sr-only" htmlFor="room-link">{kind === 'link' ? 'Link' : 'Link (optional)'}</label>
                  <input id="room-link" type="url" inputMode="url" className="mkw-form-input" value={link} onChange={e => setLink(e.target.value)} placeholder={kind === 'link' ? 'https://…' : 'LinkedIn or website (optional)'} />
                  {kind === 'intro' && (
                    <div className="room-quick">
                      {profile?.linkedin_url && <button type="button" onClick={() => setLink(profile.linkedin_url!)}>Use my LinkedIn</button>}
                      {profile?.website_url && <button type="button" onClick={() => setLink(profile.website_url!)}>Use my website</button>}
                    </div>
                  )}
                </div>
                <button type="button" className="mk-btn mk-btn-primary" onClick={post} disabled={posting || !body.trim()}>{posting ? 'Posting…' : 'Post'}</button>
              </div>
              <p className="room-hint">{phaseHint}</p>
            </section>

            {error && <p className="room-error" role="alert">{error}</p>}

            {/* ── Feed ── */}
            <div className="room-filters" role="group" aria-label="Filter posts">
              {FILTERS.map(f => (
                <button key={f.key} type="button" aria-pressed={filter === f.key} className={`room-chip${filter === f.key ? ' active' : ''}`} onClick={() => setFilter(f.key)}>
                  {f.label} <span>{countOf(f.key)}</span>
                </button>
              ))}
            </div>

            {fetching && <p className="room-muted">Loading posts…</p>}
            {!fetching && shown.length === 0 && (
              <div className="room-empty">
                <b>{tops.length === 0 ? 'No posts yet' : 'Nothing here yet'}</b>
                <p>{tops.length === 0 ? 'Start the room: introduce yourself or ask the first question.' : 'Try another filter.'}</p>
              </div>
            )}

            <ul className="room-feed">
              {shown.map(p => {
                const replies = repliesOf(p.id)
                const mine = p.clerk_user_id === user?.id
                const url = p.link_url ? cleanUrl(p.link_url) : null
                return (
                  <li key={p.id} className={`room-post${p.pinned ? ' pinned' : ''}`}>
                    <div className="room-post-head">
                      <Avatar id={p.clerk_user_id} />
                      <div className="room-post-who">
                        <b>{who(p.clerk_user_id)}</b>
                        <span>{person(p.clerk_user_id)?.role_category || 'Member'} · {ago(p.created_at)}</span>
                      </div>
                      {p.pinned && <span className="room-pin">Pinned</span>}
                      <span className={`room-kindtag room-kindtag--${p.kind}`}>{KIND_LABEL[p.kind]}</span>
                    </div>
                    <p className="room-body">{p.body}</p>
                    {url && (
                      <a className="room-link" href={url} target="_blank" rel="noopener noreferrer nofollow">
                        {hostOf(url)}
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9" /></svg>
                        <span className="sr-only">(opens in a new tab)</span>
                      </a>
                    )}

                    {replies.length > 0 && (
                      <ul className="room-replies">
                        {replies.map(r => (
                          <li key={r.id} className="room-reply">
                            <Avatar id={r.clerk_user_id} />
                            <div>
                              <div className="room-reply-head"><b>{who(r.clerk_user_id)}</b><span>{ago(r.created_at)}</span>
                                {(r.clerk_user_id === user?.id || isAdmin) && <button type="button" className="room-act" onClick={() => remove(r)}>Delete</button>}
                              </div>
                              <p className="room-body">{r.body}</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="room-actions">
                      <button type="button" className="room-act" aria-expanded={replyTo === p.id} onClick={() => { setReplyTo(replyTo === p.id ? null : p.id); setReplyBody('') }}>
                        {replyTo === p.id ? 'Cancel' : replies.length ? `Reply (${replies.length})` : p.kind === 'question' ? 'Answer' : 'Reply'}
                      </button>
                      {isAdmin && <button type="button" className="room-act" onClick={() => togglePin(p)}>{p.pinned ? 'Unpin' : 'Pin'}</button>}
                      {(mine || isAdmin) && <button type="button" className="room-act room-act--danger" onClick={() => remove(p)}>Delete</button>}
                    </div>

                    {replyTo === p.id && (
                      <div className="room-replybox">
                        <label className="sr-only" htmlFor={`reply-${p.id}`}>Your reply</label>
                        <textarea id={`reply-${p.id}`} className="mkw-form-textarea" rows={2} maxLength={2000} autoFocus value={replyBody} onChange={e => setReplyBody(e.target.value)} placeholder="Write a reply" />
                        <button type="button" className="mk-btn mk-btn-primary mk-btn-sm" onClick={() => reply(p.id)} disabled={posting || !replyBody.trim()}>{posting ? 'Posting…' : 'Post reply'}</button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </div>
    </>
  )
}
