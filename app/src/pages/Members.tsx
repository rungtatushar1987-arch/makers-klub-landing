import { useState, useMemo } from 'react'
import { useKlub } from '../KlubContext'
import { type Connection, ACTION_TAGS, getInitials } from '../supabase'

const AV_COLORS = [
  { bg: '#fcb813', fg: '#0a1340' },
  { bg: '#7a4ed8', fg: '#ffffff' },
  { bg: '#3b6dd9', fg: '#ffffff' },
  { bg: '#0a1340', fg: '#ffffff' },
  { bg: '#a587f0', fg: '#0a1340' },
]
const av = (i: number) => AV_COLORS[i % AV_COLORS.length]

export default function Members() {
  const { connections: rawConnections, incomingRequests, loading, acceptRequest, declineRequest, saveConnection: contextSave, clearTag: contextClearTag } = useKlub()

  const [localConns, setLocalConns]   = useState<Connection[] | null>(null)
  const [editingConn, setEditingConn] = useState<string | null>(null)
  const [savingConn, setSavingConn]   = useState<string | null>(null)
  const [filterEvent, setFilterEvent] = useState<string>('all')
  const [filterTag, setFilterTag]     = useState<string>('all')
  const [respondingId, setRespondingId] = useState<string | null>(null)

  const conns: Connection[] = (localConns ?? rawConnections).map(c => ({
    ...c,
    tags: (c as any).tags || [],
    follow_up: (c as any).follow_up || false,
  }))

  const eventNames = [...new Set(conns.map(c => c.event_name).filter(Boolean))]

  const filtered = useMemo(() => conns.filter(c => {
    const eventMatch = filterEvent === 'all' || c.event_name === filterEvent
    const tagMatch   = filterTag === 'all'   || (c as any).tags?.includes(filterTag)
    return eventMatch && tagMatch
  }), [conns, filterEvent, filterTag])

  function updateConn(id: string, patch: Partial<Connection>) {
    setLocalConns(prev => (prev ?? conns).map(c => c.id === id ? { ...c, ...patch } : c))
  }

  function toggleTag(conn: Connection, tag: string) {
    const tags = ((conn as any).tags || []).includes(tag)
      ? ((conn as any).tags || []).filter((t: string) => t !== tag)
      : [...((conn as any).tags || []), tag]
    updateConn(conn.id, { ...(conn as any), tags })
  }

  async function saveConnection(conn: Connection) {
    setSavingConn(conn.id)
    await contextSave(conn)
    setSavingConn(null)
    setEditingConn(null)
  }

  async function handleAccept(conn: Connection) {
    setRespondingId(conn.id)
    await acceptRequest(conn)
    setRespondingId(null)
  }

  async function handleDecline(conn: Connection) {
    setRespondingId(conn.id)
    await declineRequest(conn)
    setRespondingId(null)
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

        {/* ── INCOMING REQUESTS ── */}
        {incomingRequests.length > 0 && (
          <div style={{
            marginBottom: 24,
            border: '1.5px solid var(--mk-yellow)',
            borderRadius: 'var(--r-sm)',
            background: 'rgba(252,184,19,0.05)',
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '12px 18px 10px',
              borderBottom: '1px solid rgba(252,184,19,0.18)',
            }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: 'var(--ink-1)' }}>
                Connection Requests
              </span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                minWidth: 20, height: 20, padding: '0 6px',
                borderRadius: 999, background: 'var(--mk-yellow)', color: 'var(--mk-navy)',
                fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700,
              }}>
                {incomingRequests.length}
              </span>
            </div>
            {incomingRequests.map((conn, i) => {
              const p = conn.profile
              const c = av(i)
              const busy = respondingId === conn.id
              return (
                <div key={conn.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '14px 18px',
                  borderBottom: i < incomingRequests.length - 1 ? '1px solid rgba(252,184,19,0.10)' : 'none',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                    background: c.bg, color: c.fg,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14,
                  }}>
                    {getInitials(p?.full_name)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--ink-1)' }}>
                      {p?.full_name || 'Member'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-body)', marginTop: 2 }}>
                      {p?.role_category ? p.role_category.charAt(0).toUpperCase() + p.role_category.slice(1) : 'Maker'}
                      {conn.event_name ? ` · met at ${conn.event_name}` : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button
                      onClick={() => handleAccept(conn)}
                      disabled={busy}
                      style={{
                        padding: '8px 18px', borderRadius: 999, border: 'none', cursor: busy ? 'default' : 'pointer',
                        background: 'var(--mk-violet)', color: '#fff',
                        fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 700,
                        opacity: busy ? 0.5 : 1, transition: 'opacity 0.15s',
                      }}
                    >
                      {busy ? '…' : 'Accept'}
                    </button>
                    <button
                      onClick={() => handleDecline(conn)}
                      disabled={busy}
                      style={{
                        padding: '8px 18px', borderRadius: 999,
                        border: '1.5px solid var(--hairline-strong)', cursor: busy ? 'default' : 'pointer',
                        background: 'transparent', color: 'var(--ink-2)',
                        fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600,
                        opacity: busy ? 0.5 : 1, transition: 'opacity 0.15s',
                      }}
                    >
                      Decline
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* ── FILTER BAR ── */}
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
            const tags = (conn as any).tags || []
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
                      {(conn as any).follow_up && (
                        <span style={{ padding: '2px 9px', borderRadius: 999, background: 'rgba(252,184,19,0.18)', color: 'var(--mk-yellow-deep)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700 }}>↻ Follow up</span>
                      )}
                      {conn.direction === 'incoming' && (
                        <span style={{ padding: '2px 9px', borderRadius: 999, background: 'rgba(91,91,214,0.12)', color: 'var(--mk-violet)', fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700 }}>They connected with you</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-body)', marginBottom: conn.notes || tags.length > 0 ? 8 : 0 }}>
                      {conn.profile?.role_category ? conn.profile.role_category.charAt(0).toUpperCase() + conn.profile.role_category.slice(1) : 'Maker'}
                      {conn.event_name ? ` · ${conn.event_name}` : ''}
                      {' · '}
                      {new Date(conn.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    {conn.notes && !isEditing && (
                      <div style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13, color: 'var(--ink-2)', padding: '9px 13px', borderLeft: '3px solid var(--accent)', background: 'rgba(252,184,19,0.08)', borderRadius: '0 var(--r-xs) var(--r-xs) 0', lineHeight: 1.5, marginBottom: tags.length > 0 ? 8 : 0 }}>
                        {conn.notes}
                      </div>
                    )}
                    {tags.length > 0 && !isEditing && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {tags.map((tag: string) => (
                          <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(252,184,19,0.18)', color: 'var(--mk-yellow-deep)', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>
                            {tag}
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
                        {[...ACTION_TAGS, ...tags.filter((t: string) => !ACTION_TAGS.includes(t))].map((tag: string) => {
                          const selected = tags.includes(tag)
                          return (
                            <button key={tag} onClick={() => toggleTag(conn, tag)} style={{ padding: '7px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 700, border: `1px solid ${selected ? 'var(--mk-navy)' : 'var(--hairline-strong)'}`, background: selected ? 'var(--mk-navy)' : 'transparent', color: selected ? '#fff' : 'var(--ink-2)', transition: 'all 0.12s' }}>{tag}</button>
                          )
                        })}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-2)', cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 500 }}>
                        <input type="checkbox" checked={(conn as any).follow_up || false} onChange={e => updateConn(conn.id, { ...(conn as any), follow_up: e.target.checked })} style={{ accentColor: 'var(--mk-yellow)', width: 15, height: 15 }} />
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
