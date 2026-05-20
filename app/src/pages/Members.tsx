import { useEffect, useState, useMemo } from 'react'
import { useUser } from '@clerk/clerk-react'
import { supabase, type Profile, ACTION_TAGS, getInitials, getAvatarColor } from '../supabase'

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
  const { user } = useUser()
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)
  const [editingConn, setEditingConn] = useState<string | null>(null)
  const [savingConn, setSavingConn] = useState<string | null>(null)

  // Filters
  const [filterEvent, setFilterEvent] = useState<string>('all')
  const [filterTag, setFilterTag] = useState<string>('all')

  useEffect(() => {
    async function load() {
      const { data: connsData } = await supabase
        .from('connections')
        .select('*')
        .eq('clerk_user_id', user?.id)
        .order('created_at', { ascending: false })

      if (!connsData) { setLoading(false); return }

      const ids = connsData.map((c: Connection) => c.connected_clerk_user_id)
      const { data: profilesData } = ids.length > 0
        ? await supabase.from('profiles').select('*').in('clerk_user_id', ids)
        : { data: [] }

      const profileMap = new Map((profilesData || []).map((p: Profile) => [p.clerk_user_id, p]))

      setConnections(connsData.map((c: Connection) => ({
        ...c,
        tags: c.tags || [],
        follow_up: c.follow_up || false,
        action_tags: c.action_tags || [],
        remind_followup: c.remind_followup || false,
        profile: profileMap.get(c.connected_clerk_user_id)
      })))
      setLoading(false)
    }
    if (user) load()
  }, [user])

  // Derived stats
  const followupCount = connections.filter(c => c.tags?.length > 0).length
  const eventNames = [...new Set(connections.map(c => c.event_name).filter(Boolean))]

  // Filtered list
  const filtered = useMemo(() => {
    return connections.filter(c => {
      const eventMatch = filterEvent === 'all' || c.event_name === filterEvent
      const tagMatch = filterTag === 'all' || c.tags?.includes(filterTag)
      return eventMatch && tagMatch
    })
  }, [connections, filterEvent, filterTag])

  function updateConn(id: string, patch: Partial<Connection>) {
    setConnections(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c))
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
    await supabase.from('connections').update({ tags }).eq('id', conn.id)
  }

  async function saveConnection(conn: Connection) {
    setSavingConn(conn.id)
    await supabase.from('connections').update({
      notes: conn.notes,
      tags: conn.tags,
      follow_up: conn.follow_up
    }).eq('id', conn.id)
    setSavingConn(null)
    setEditingConn(null)
  }

  const activeFilters = (filterEvent !== 'all' ? 1 : 0) + (filterTag !== 'all' ? 1 : 0)

  if (loading) return <div className="mkw-loading">Loading…</div>

  return (
    <div>
      {/* Sticky header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: 'var(--mk-cream)',
        borderBottom: '1px solid var(--border-1)',
        marginBottom: 28,
        paddingBottom: 20,
        paddingTop: 4,
      }}>
        <div className="mkw-pagehead" style={{ marginBottom: 16, paddingBottom: 16 }}>
          <div>
            <div className="eyebrow">Your people · {connections.length} connections</div>
            <h1>Network</h1>
            <p className="sub">Everyone you've met at Makers Klub events.</p>
          </div>
          <div className="actions">
            <button className="mk-btn mk-btn-ochre">Export contacts →</button>
          </div>
        </div>

        {/* Filter row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--fg-3)', letterSpacing: 0.3, whiteSpace: 'nowrap' }}>Filter by</span>
          <select
            value={filterEvent}
            onChange={e => setFilterEvent(e.target.value)}
            style={{
              padding: '7px 14px', borderRadius: 999,
              border: `1.5px solid ${filterEvent !== 'all' ? 'var(--mk-navy)' : 'var(--border-1)'}`,
              background: filterEvent !== 'all' ? 'var(--mk-navy)' : 'var(--mk-white)',
              color: filterEvent !== 'all' ? '#fff' : 'var(--fg-2)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-body)', outline: 'none',
            }}
          >
            <option value="all">All events</option>
            {eventNames.map(name => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <select
            value={filterTag}
            onChange={e => setFilterTag(e.target.value)}
            style={{
              padding: '7px 14px', borderRadius: 999,
              border: `1.5px solid ${filterTag !== 'all' ? 'var(--mk-navy)' : 'var(--border-1)'}`,
              background: filterTag !== 'all' ? 'var(--mk-navy)' : 'var(--mk-white)',
              color: filterTag !== 'all' ? '#fff' : 'var(--fg-2)',
              fontSize: 12, fontWeight: 500, cursor: 'pointer',
              fontFamily: 'var(--font-body)', outline: 'none',
            }}
          >
            <option value="all">All action items</option>
            {ACTION_TAGS.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
          {activeFilters > 0 && (
            <button
              onClick={() => { setFilterEvent('all'); setFilterTag('all') }}
              style={{ background: 'none', border: 'none', color: 'var(--fg-3)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)', textDecoration: 'underline' }}
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Results count */}
      {activeFilters > 0 && (
        <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: 16 }}>
          Showing {filtered.length} of {connections.length} connections
        </div>
      )}

      {filtered.length === 0 && (
        <div className="mkw-empty">
          {connections.length === 0
            ? 'No connections yet. Come to an event.'
            : 'No connections match these filters.'}
        </div>
      )}

      {/* Connection list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {filtered.map((conn, i) => {
          const isEditing = editingConn === conn.id
          return (
            <div key={conn.id} style={{
              background: 'var(--mk-white)',
              border: `1px solid ${isEditing ? 'var(--mk-navy)' : 'var(--border-1)'}`,
              borderRadius: 14, overflow: 'hidden',
              transition: 'border-color 0.15s'
            }}>
              {/* Main row */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, padding: '18px 20px' }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                  background: getAvatarColor(i), color: i === 2 ? '#fff' : '#0f1e3d',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15
                }}>
                  {getInitials(conn.profile?.full_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'var(--mk-navy)', marginBottom: 2 }}>
                    {conn.profile?.full_name || 'Member'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--fg-3)', marginBottom: conn.tags?.length > 0 || conn.notes ? 8 : 0 }}>
                    {conn.profile?.role_category
                      ? conn.profile.role_category.charAt(0).toUpperCase() + conn.profile.role_category.slice(1)
                      : 'Maker'}
                    {conn.event_name ? ` · ${conn.event_name}` : ''}
                    {' · '}
                    {new Date(conn.created_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                  {conn.notes && !isEditing && (
                  <div style={{
                  fontFamily: 'var(--font-display)', fontStyle: 'italic', fontSize: 13,
                  color: 'var(--fg-2)', padding: '8px 12px',
                  borderLeft: '3px solid var(--mk-ochre)',
                  background: 'var(--mk-cream-2)', borderRadius: '0 6px 6px 0',
                  lineHeight: 1.5, marginBottom: conn.tags?.length > 0 ? 8 : 0
                  }}>
                      {conn.notes}
                    </div>
                  )}
                  {conn.tags?.length > 0 && !isEditing && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {conn.tags.map(tag => (
                        <span key={tag} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: 'rgba(244,168,51,0.15)', color: '#8a5d10',
                          fontSize: 11, fontWeight: 700, padding: '3px 10px',
                          borderRadius: 999, letterSpacing: 0.3
                        }}>
                          {tag}
                          <button
                            onClick={() => clearTag(conn, tag)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a5d10', fontSize: 13, padding: 0, lineHeight: 1, opacity: 0.7 }}
                          >×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0, alignItems: 'flex-start' }}>
                  {conn.profile?.linkedin_url && (
                    <a href={conn.profile.linkedin_url} target="_blank" rel="noreferrer" title="LinkedIn" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 999,
                      border: '1.5px solid var(--border-1)',
                      background: 'var(--mk-white)',
                      fontSize: 11, fontWeight: 600, color: 'var(--fg-2)',
                      textDecoration: 'none', whiteSpace: 'nowrap'
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                      LinkedIn
                    </a>
                  )}
                  {conn.profile?.instagram_url && (
                    <a href={conn.profile.instagram_url.startsWith('http') ? conn.profile.instagram_url : `https://${conn.profile.instagram_url}`} target="_blank" rel="noreferrer" title="Instagram" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 999,
                      border: '1.5px solid var(--border-1)',
                      background: 'var(--mk-white)',
                      fontSize: 11, fontWeight: 600, color: 'var(--fg-2)',
                      textDecoration: 'none', whiteSpace: 'nowrap'
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                      Instagram
                    </a>
                  )}
                  {conn.profile?.website_url && (
                    <a href={conn.profile.website_url.startsWith('http') ? conn.profile.website_url : `https://${conn.profile.website_url}`} target="_blank" rel="noreferrer" title="Website" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      padding: '5px 10px', borderRadius: 999,
                      border: '1.5px solid var(--border-1)',
                      background: 'var(--mk-white)',
                      fontSize: 11, fontWeight: 600, color: 'var(--fg-2)',
                      textDecoration: 'none', whiteSpace: 'nowrap'
                    }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                      Website
                    </a>
                  )}
                  <button
                    className="mkw-row-action"
                    onClick={() => setEditingConn(isEditing ? null : conn.id)}
                  >
                    {isEditing ? 'Cancel' : 'Edit'}
                  </button>
                </div>
              </div>

              {/* Edit panel */}
              {isEditing && (
                <div style={{
                  borderTop: '1px solid var(--border-1)',
                  padding: '18px 20px',
                  background: 'var(--mk-cream)',
                  display: 'flex', flexDirection: 'column', gap: 16
                }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 8 }}>Note</div>
                    <textarea
                      className="mkw-form-textarea"
                      rows={2}
                      placeholder="How did you meet? What did you talk about?"
                      value={conn.notes || ''}
                      onChange={e => updateConn(conn.id, { notes: e.target.value })}
                      style={{ fontSize: 13 }}
                    />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 8 }}>Action items</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {[...ACTION_TAGS, ...conn.tags.filter(t => !ACTION_TAGS.includes(t))].map(tag => {
                        const selected = conn.tags.includes(tag)
                        return (
                          <button
                            key={tag}
                            onClick={() => toggleTag(conn, tag)}
                            style={{
                              padding: '7px 14px', borderRadius: 999,
                              border: `1.5px solid ${selected ? 'var(--mk-navy)' : 'var(--border-1)'}`,
                              background: selected ? 'var(--mk-navy)' : 'var(--mk-white)',
                              color: selected ? '#fff' : 'var(--fg-2)',
                              fontSize: 12, fontWeight: 500, cursor: 'pointer',
                              fontFamily: 'var(--font-body)', transition: 'all 0.12s'
                            }}
                          >{tag}</button>
                        )
                      })}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--fg-2)', cursor: 'pointer', fontWeight: 500 }}>
                      <input
                        type="checkbox"
                        checked={conn.follow_up}
                        onChange={e => updateConn(conn.id, { follow_up: e.target.checked })}
                        style={{ accentColor: 'var(--mk-ochre)', width: 15, height: 15 }}
                      />
                      Remind me to follow up
                    </label>
                    <button
                      className="mk-btn mk-btn-ochre mk-btn-sm"
                      onClick={() => saveConnection(conn)}
                      disabled={savingConn === conn.id}
                    >
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
  )
}
