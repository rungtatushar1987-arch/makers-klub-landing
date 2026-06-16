import { useState, useMemo } from 'react'
import { useSession } from '@clerk/clerk-react'
import { useKlub } from '../KlubContext'
import { getSupabaseClient, type Profile, ACTION_TAGS, getInitials } from '../supabase'

const AV_COLORS = [
  { bg: '#fcb813', fg: '#0a1340' },
  { bg: '#7a4ed8', fg: '#ffffff' },
  { bg: '#3b6dd9', fg: '#ffffff' },
  { bg: '#0a1340', fg: '#ffffff' },
  { bg: '#a587f0', fg: '#0a1340' },
]
const av = (i: number) => AV_COLORS[i % AV_COLORS.length]

type Connection = {
  id: string
  connected_clerk_user_id: string
  event_name: string
  notes: string
  tags: string[]
  follow_up: boolean
  action_tags: string[]
  remind_followup: boolean
  created_at: string
  profile?: Profile
}

export default function Members() {
  const { session } = useSession()
  const { connections: rawConnections, loading } = useKlub()
  const connections = rawConnections as unknown as Connection[]

  const [localConns, setLocalConns]       = useState<Connection[] | null>(null)
  const [editingConn, setEditingConn]     = useState<string | null>(null)
  const [savingConn, setSavingConn]       = useState<string | null>(null)
  const [filterEvent, setFilterEvent]     = useState<string>('all')
  const [filterTag, setFilterTag]         = useState<string>('all')

  const conns: Connection[] = (localConns ?? connections).map(c => ({
    ...c,
    tags: (c as any).tags || [],
    follow_up: (c as any).follow_up || false,
  }))

  const eventNames = [...new Set(conns.map(c => c.event_name).filter(Boolean))]

  const filtered = useMemo(() => conns.filter(c => {
    const eventMatch = filterEvent === 'all' || c.event_name === filterEvent
    const tagMatch   = filterTag === 'all'   || c.tags?.includes(filterTag)
    return eventMatch && tagMatch
  }), [conns, filterEvent, filterTag])

  function updateConn(id: string, patch: Partial<Connection>) {
    setLocalConns(prev => (prev ?? conns).map(c => c.id === id ? { ...c, ...patch } : c))
  }

  function toggleTag(conn: Connection, tag: string) {
    const tags = conn.tags.includes(tag)
      ? conn.tags.filter(t => t !== tag)
      : [...conn.tags, tag]
    updateConn(conn.id, { tags })
  }

  async function clearTag(conn: Connection, tag: string) {
    const tags = conn.tags.filter(t => t !== tag)
    updateConn(conn.id, { tags })
    const token = await session?.getToken({ template: 'supabase' })
    const db = getSupabaseClient(token)
    await db.from('connections').update({ tags }).eq('id', conn.id)
  }

  async function saveConnection(conn: Connection) {
    setSavingConn(conn.id)
    const token = await session?.getToken({ template: 'supabase' })
    const db = getSupabaseClient(token)
    await db.from('connections').update({
      notes: conn.notes, tags: conn.tags, follow_up: conn.follow_up
    }).eq('id', conn.id)
    setSavingConn(null)
    setEditingConn(null)
  }

  const activeFilters = (filterEvent !== 'all' ? 1 : 0) + (filterTag !== 'all' ? 1 : 0)

  if (loading) return <div className="mkw-loading">Loading…</div>

  return (
    <>
      <div className="mkw-pagehead">
        <div>
          <div className="eyebrow">Your people · {conns.length} connection{conns.length !== 1 ? 's' : ''}</div>
          <h1>Network</h1>
        </div>
      </div>

      <div className="mkw-main-body">
        <div className="mkw-filter-bar">
          <span className="mkw-filter-label">Filter</span>
          <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)} className={`mkw-filter-select${filterEvent !== 'all' ? ' active' : ''}`}>
            <option value="all">All events</option>
            {eventNames.map(name => <option key={name} value={name}>{name}</option>)}
          </select>
          <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className={`mkw-filter-select${filterTag !== 'all' ? ' active' : ''}`}>
            <option value="all">All action items</option>
            {ACTION_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
          </select>
          {activeFilters > 0 && (
            <button className="mkw-filter-clear" onClick={() => { setFilterEvent('all'); setFilterTag('all') }}>Clear</button>
          )}
        </div>

        {activeFilters > 0 && (
          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginBottom: 16, fontFamily: 'var(--font-body)' }}>
            Showing {filtered.length} of {conns.length} connections
          </div>
        )}

        {filtered.length === 0 && (
          <div className="mkw-empty">
            {conns.length === 0 ? 'No connections yet. Come to an event.' : 'No connections match these filters.'}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((conn, i) => {
            const isEditing = editingConn === conn.id
            const c = av(i)
            return (
              <div key={conn.id} style={{
                background: 'var(--glass-bg)',
                backdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                WebkitBackdropFilter: 'blur(var(--glass-blur)) saturate(150%)',
                border: `1px solid ${isEditing ? 'var(--mk-violet)' : 'var(--glass-border)'}`,
                boxShadow: isEditing ? '0 0 0 3px rgba(122,78,216,0.12), var(--glass-shadow)' : 'var(--glass-shadow), var(--glass-hi)',
                borderRadius: 'var(--r-sm)', overflow: 'hidden', transition: 'border-color 0.15s, box-shadow 0.15s',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', flexShrink: 0, background: c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>
                    {getInitials(conn.profile?.full_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--ink-1)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      {conn.profile?.full_name || 'Member'}
                      {conn.follow_up && (
                        <span style={{ padding: '2px 9px', borderRadius: 999, background: 'rgba(252,184,19,0.18)', color: 'var(--mk-yellow-deep)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700 }}>↻ Follow up</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-body)', marginBottom: conn.notes || conn.tags?.length > 0 ? 8 : 0 }}>
                      {conn.profile?.role_category ? conn.profile.role_category.charAt(0).toUpperCase() + conn.profile.role_category.slice(1) : 'Maker'}
                      {conn.event_name ? ` · ${conn.event_name}` : ''}
                      {' · '}
                      {new Date(conn.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {conn.notes && !isEditing && (
                      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-2)', padding: '9px 13px', borderLeft: '3px solid var(--accent)', background: 'rgba(252,184,19,0.08)', borderRadius: '0 var(--r-xs) var(--r-xs) 0', lineHeight: 1.5, marginBottom: conn.tags?.length > 0 ? 8 : 0 }}>
                        {conn.notes}
                      </div>
                    )}
                    {conn.tags?.length > 0 && !isEditing && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {conn.tags.map(tag => (
                          <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(252,184,19,0.18)', color: 'var(--mk-yellow-deep)', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>
                            {tag}
                            <button onClick={() => clearTag(conn, tag)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--mk-yellow-deep)', fontSize: 13, padding: 0, lineHeight: 1, opacity: 0.7 }}>×</button>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0, alignItems: 'flex-start', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {conn.profile?.linkedin_url && <SocialLink href={conn.profile.linkedin_url} label="LinkedIn" />}
                    {conn.profile?.instagram_url && <SocialLink href={conn.profile.instagram_url.startsWith('http') ? conn.profile.instagram_url : `https://${conn.profile.instagram_url}`} label="Instagram" />}
                    {conn.profile?.website_url && <SocialLink href={conn.profile.website_url.startsWith('http') ? conn.profile.website_url : `https://${conn.profile.website_url}`} label="Website" />}
                    <button className="mkw-row-action" onClick={() => setEditingConn(isEditing ? null : conn.id)}>{isEditing ? 'Cancel' : 'Edit'}</button>
                  </div>
                </div>

                {isEditing && (
                  <div style={{ borderTop: '1px solid var(--hairline)', padding: '16px 18px', background: 'rgba(255,255,255,0.35)', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Note</div>
                      <textarea className="mkw-form-textarea" rows={2} placeholder="How did you meet? What did you talk about?" value={conn.notes || ''} onChange={e => updateConn(conn.id, { notes: e.target.value })} style={{ fontSize: 13 }} />
                    </div>
                    <div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 8 }}>Action items</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {[...ACTION_TAGS, ...conn.tags.filter((t: string) => !ACTION_TAGS.includes(t))].map(tag => {
                          const selected = conn.tags.includes(tag)
                          return (
                            <button key={tag} onClick={() => toggleTag(conn, tag)} style={{ padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, border: `1px solid ${selected ? 'var(--mk-navy)' : 'var(--hairline-strong)'}`, background: selected ? 'var(--mk-navy)' : 'transparent', color: selected ? '#fff' : 'var(--ink-2)', transition: 'all 0.12s' }}>{tag}</button>
                          )
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                        <input type="checkbox" checked={conn.follow_up} onChange={e => updateConn(conn.id, { follow_up: e.target.checked })} style={{ accentColor: 'var(--mk-yellow)', width: 15, height: 15 }} />
                        Remind me to follow up
                      </label>
                      <button className="mk-btn mk-btn-primary mk-btn-sm" onClick={() => saveConnection(conn)} disabled={savingConn === conn.id}>
                        {savingConn === conn.id ? 'Saving…' : 'Save →'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}

function SocialLink({ href, label }: { href: string; label: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 999, background: 'var(--glass-bg)', backdropFilter: 'blur(var(--glass-blur))', border: '1px solid var(--glass-border)', fontSize: 11, fontWeight: 600, color: 'var(--ink-2)', textDecoration: 'none', whiteSpace: 'nowrap', fontFamily: 'var(--font-display)', transition: 'color 0.12s' }}>
      {label}
    </a>
  )
}
