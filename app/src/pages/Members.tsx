import { useState, useMemo } from 'react'
import { useKlub } from '../KlubContext'
import { type Connection, ACTION_TAGS, getInitials } from '../supabase'
import './Members.css'

const AV_COLORS = [
  { bg: '#c5a059', fg: '#0a1340' },
  { bg: '#3b6dd9', fg: '#ffffff' },
  { bg: '#3b6dd9', fg: '#ffffff' },
  { bg: '#0a1340', fg: '#ffffff' },
  { bg: '#7ba0e8', fg: '#0a1340' },
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
  const [search, setSearch]         = useState('')
  const [onlyFollowUp, setOnlyFollowUp] = useState(false)

  const conns: Connection[] = (localConns ?? rawConnections).map(c => ({
    ...c,
    tags: (c as any).tags || [],
    follow_up: (c as any).follow_up || false,
  }))

  const eventNames = [...new Set(conns.map(c => c.event_name).filter(Boolean))]

  const filtered = useMemo(() => conns.filter(c => {
    const eventMatch = filterEvent === 'all' || c.event_name === filterEvent
    const tagMatch   = filterTag === 'all'   || (c as any).tags?.includes(filterTag)
    const fuMatch = !onlyFollowUp || !!(c as any).follow_up
    const q = search.trim().toLowerCase()
    const textMatch = !q || [c.profile?.full_name, c.profile?.bio, c.event_name, c.notes].some(v => v?.toLowerCase().includes(q))
    return eventMatch && tagMatch && fuMatch && textMatch
  }), [conns, filterEvent, filterTag, onlyFollowUp, search])

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

  const followUpCount = conns.filter(c => (c as any).follow_up).length
  const activeFilters = (filterEvent !== 'all' ? 1 : 0) + (filterTag !== 'all' ? 1 : 0) + (onlyFollowUp ? 1 : 0) + (search.trim() ? 1 : 0)
  const clearFilters = () => { setFilterEvent('all'); setFilterTag('all'); setOnlyFollowUp(false); setSearch('') }
  const roleOf = (p?: { role_category?: string | null }) => p?.role_category ? p.role_category.charAt(0).toUpperCase() + p.role_category.slice(1) : 'Maker'
  const withHttp = (u: string) => u.startsWith('http') ? u : `https://${u}`

  if (loading) return <div className="mkw-loading">Loading…</div>

  return (
    <>
      <div className="mkw-pagehead">
        <div>
          <div className="eyebrow">Your people</div>
          <h1>Network</h1>
          <p className="sub">{conns.length === 0 ? 'People you connect with at events are kept here.' : `${conns.length} connection${conns.length !== 1 ? 's' : ''}${followUpCount ? ` · ${followUpCount} to follow up` : ''}`}</p>
        </div>
      </div>

      <div className="mkw-main-body net">
        {/* ── Requests ── */}
        {incomingRequests.length > 0 && (
          <section className="net-requests" aria-label="Connection requests">
            <h2>Connection requests <span className="net-n">{incomingRequests.length}</span></h2>
            {incomingRequests.map((conn, i) => {
              const p = conn.profile
              const c = av(i)
              const busy = respondingId === conn.id
              return (
                <div key={conn.id} className="net-request">
                  <span className="net-av" style={{ background: c.bg, color: c.fg }}>{getInitials(p?.full_name)}</span>
                  <div className="net-main">
                    <b>{p?.full_name || 'Member'}</b>
                    <span>{roleOf(p)}{conn.event_name ? ` · met at ${conn.event_name}` : ''}</span>
                  </div>
                  <div className="net-actions">
                    <button type="button" className="mk-btn mk-btn-primary mk-btn-sm" onClick={() => handleAccept(conn)} disabled={busy}>{busy ? 'Working…' : 'Accept'}</button>
                    <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => handleDecline(conn)} disabled={busy}>Decline</button>
                  </div>
                </div>
              )
            })}
          </section>
        )}

        {/* ── Find and filter ── */}
        {conns.length > 0 && (
          <div className="net-tools">
            <input type="search" className="net-search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, event or note" aria-label="Search connections" />
            <div className="net-filters">
              <button type="button" className={`net-chip${onlyFollowUp ? ' active' : ''}`} aria-pressed={onlyFollowUp} onClick={() => setOnlyFollowUp(v => !v)}>
                Follow up <span>{followUpCount}</span>
              </button>
              <select value={filterEvent} onChange={e => setFilterEvent(e.target.value)} className={`mkw-filter-select${filterEvent !== 'all' ? ' active' : ''}`} aria-label="Filter by event">
                <option value="all">All events</option>
                {eventNames.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              <select value={filterTag} onChange={e => setFilterTag(e.target.value)} className={`mkw-filter-select${filterTag !== 'all' ? ' active' : ''}`} aria-label="Filter by action item">
                <option value="all">All action items</option>
                {ACTION_TAGS.map(tag => <option key={tag} value={tag}>{tag}</option>)}
              </select>
              {activeFilters > 0 && <button type="button" className="net-clear" onClick={clearFilters}>Clear filters</button>}
            </div>
            {activeFilters > 0 && <p className="net-count" role="status">Showing {filtered.length} of {conns.length}</p>}
          </div>
        )}

        {filtered.length === 0 && (
          <div className="net-empty">
            <b>{conns.length === 0 ? 'No connections yet' : 'No one matches these filters'}</b>
            <p>{conns.length === 0 ? 'Scan someone’s QR code at an event, or connect with people from a past event’s attendee list.' : 'Try removing a filter.'}</p>
            {conns.length === 0
              ? <a href="/events" className="mk-btn mk-btn-primary mk-btn-sm">See events</a>
              : <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm" onClick={clearFilters}>Clear filters</button>}
          </div>
        )}

        {/* ── People ── */}
        <ul className="net-list">
          {filtered.map((conn, i) => {
            const isEditing = editingConn === conn.id
            const c = av(i)
            const tags: string[] = (conn as any).tags || []
            const p = conn.profile
            return (
              <li key={conn.id} className={`net-card${isEditing ? ' editing' : ''}`}>
                <div className="net-card-row">
                  <span className="net-av net-av--lg" style={{ background: c.bg, color: c.fg }}>{getInitials(p?.full_name)}</span>
                  <div className="net-main">
                    <b className="net-name">
                      {p?.full_name || 'Member'}
                      {(conn as any).follow_up && <span className="net-tag net-tag--gold">Follow up</span>}
                      {conn.direction === 'incoming' && <span className="net-tag net-tag--blue">Connected with you</span>}
                    </b>
                    <span className="net-meta">
                      {p?.bio || roleOf(p)}
                      {conn.event_name ? ` · ${conn.event_name}` : ''} · {new Date(conn.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                    {conn.notes && !isEditing && <p className="net-note">{conn.notes}</p>}
                    {tags.length > 0 && !isEditing && (
                      <div className="net-tags">{tags.map(tag => <span key={tag} className="net-tag net-tag--gold">{tag}</span>)}</div>
                    )}
                  </div>
                  <div className="net-links">
                    {p?.linkedin_url && <a className="net-link" href={withHttp(p.linkedin_url)} target="_blank" rel="noreferrer">LinkedIn</a>}
                    {p?.instagram_url && <a className="net-link" href={withHttp(p.instagram_url)} target="_blank" rel="noreferrer">Instagram</a>}
                    {p?.website_url && <a className="net-link" href={withHttp(p.website_url)} target="_blank" rel="noreferrer">Website</a>}
                    <button type="button" className="mkw-row-action" aria-expanded={isEditing} onClick={() => setEditingConn(isEditing ? null : conn.id)}>{isEditing ? 'Cancel' : 'Edit'}</button>
                  </div>
                </div>

                {isEditing && (
                  <div className="net-edit">
                    <div>
                      <label className="net-label" htmlFor={`note-${conn.id}`}>Note</label>
                      <textarea id={`note-${conn.id}`} className="mkw-form-textarea" rows={2} placeholder="How did you meet? What did you talk about?" value={conn.notes || ''} onChange={e => updateConn(conn.id, { notes: e.target.value })} />
                    </div>
                    <div>
                      <div className="net-label">Action items</div>
                      <div className="net-tags">
                        {[...ACTION_TAGS, ...tags.filter(t => !ACTION_TAGS.includes(t))].map(tag => {
                          const selected = tags.includes(tag)
                          return <button key={tag} type="button" aria-pressed={selected} className={`net-chip${selected ? ' active' : ''}`} onClick={() => toggleTag(conn, tag)}>{tag}</button>
                        })}
                      </div>
                    </div>
                    <div className="net-edit-foot">
                      <label className="net-check">
                        <input type="checkbox" checked={(conn as any).follow_up || false} onChange={e => updateConn(conn.id, { ...(conn as any), follow_up: e.target.checked })} />
                        Remind me to follow up
                      </label>
                      <button type="button" className="mk-btn mk-btn-primary mk-btn-sm" onClick={() => saveConnection(conn)} disabled={savingConn === conn.id}>
                        {savingConn === conn.id ? 'Saving…' : 'Save changes'}
                      </button>
                    </div>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </div>
    </>
  )
}
