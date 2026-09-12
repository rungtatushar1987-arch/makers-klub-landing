import { useEffect, useState } from 'react'
import { useUser, useSession } from '@clerk/clerk-react'
import { getSupabaseClient, getInitials, type Gig, type GigType, type Profile, GIG_TYPES } from '../supabase'
import './Gigs.css'

function typeLabel(type: GigType) {
  return GIG_TYPES.find(t => t.value === type)?.label || type
}

export default function Gigs() {
  const { user } = useUser()
  const { session } = useSession()

  const [approvedGigs, setApprovedGigs] = useState<Gig[]>([])
  const [myGigs, setMyGigs] = useState<Gig[]>([])
  const [posterProfiles, setPosterProfiles] = useState<Map<string, Profile>>(new Map())
  const [loading, setLoading] = useState(true)
  const [postFormOpen, setPostFormOpen] = useState(false)
  const [modalGig, setModalGig] = useState<Gig | null>(null)

  useEffect(() => {
    if (!user || !session) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const token = await session.getToken()
      const db = getSupabaseClient(token)
      const [{ data: approvedData }, { data: mineData }] = await Promise.all([
        db.from('gigs').select('*').eq('status', 'approved').order('created_at', { ascending: false }),
        db.from('gigs').select('*').eq('clerk_user_id', user.id).order('created_at', { ascending: false }),
      ])
      if (cancelled) return
      const approved = (approvedData as Gig[]) || []
      const mine = (mineData as Gig[]) || []

      const posterIds = [...new Set(approved.map(g => g.clerk_user_id))].filter(id => id !== user.id)
      let profileMap = new Map<string, Profile>()
      if (posterIds.length > 0) {
        const { data: profilesData } = await db.from('profiles').select('*').in('clerk_user_id', posterIds)
        profileMap = new Map((profilesData || []).map((p: Profile) => [p.clerk_user_id, p]))
      }

      if (!cancelled) {
        setApprovedGigs(approved)
        setMyGigs(mine)
        setPosterProfiles(profileMap)
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [user, session])

  function handlePosted(gig: Gig) {
    setMyGigs(prev => [gig, ...prev])
    setPostFormOpen(false)
  }

  if (loading) return <div className="mkw-loading">Loading…</div>

  return (
    <>
      <div className="mkw-pagehead">
        <div>
          <div className="eyebrow">Berlin · Makers Klub</div>
          <h1>Gigs Board</h1>
          <p className="sub">Find collaborators, freelance work, or someone to hire.</p>
        </div>
        <div className="actions">
          <button className="mk-btn mk-btn-primary mk-btn-sm" onClick={() => setPostFormOpen(true)}>
            + Post a gig
          </button>
        </div>
      </div>

      <div className="mkw-main-body">
        <div className="gig-grid">

          <div className="gig-col-left">
            {approvedGigs.length === 0 && (
              <div className="mkw-empty">No gigs yet — be the first to post one.</div>
            )}
            <div className="gig-card-list">
              {approvedGigs.map(gig => {
                const poster = gig.clerk_user_id === user?.id ? null : posterProfiles.get(gig.clerk_user_id)
                return (
                  <div key={gig.id} className="gig-card" onClick={() => setModalGig(gig)}>
                    <div className="gig-card-inner">
                      <div className="gig-card-info">
                        <div className="gig-card-title-row">
                          <span className="gig-card-title">{gig.title}</span>
                          <span className="gig-type-badge">{typeLabel(gig.type)}</span>
                        </div>
                        <p className="gig-card-desc">{gig.description}</p>
                        <div className="gig-card-meta">
                          {poster ? `Posted by ${poster.full_name || 'a member'}` : gig.clerk_user_id === user?.id ? 'Posted by you' : 'Posted by a member'}
                          {gig.budget && <> · {gig.budget}</>}
                          {gig.timeline && <> · {gig.timeline}</>}
                        </div>
                      </div>
                      <span className="gig-card-chevron">›</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="gig-col-right">
            <div className="mkw-card">
              <div className="mkw-h3">
                <span>My gigs</span>
              </div>
              {myGigs.length === 0 ? (
                <p style={{ fontSize: 13, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>
                  You haven't posted a gig yet.
                </p>
              ) : (
                <div className="mkw-rows">
                  {myGigs.map(gig => (
                    <div key={gig.id} className="mkw-row">
                      <div className="mkw-row-main">
                        <div className="mkw-row-name">{gig.title}</div>
                        <div className="mkw-row-meta">{typeLabel(gig.type)}</div>
                      </div>
                      <span className={`mkw-chip-tag ${gig.status === 'approved' ? 'green' : 'ochre'}`}>
                        {gig.status === 'approved' ? 'Approved' : 'Pending review'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {modalGig && (
        <GigModal gig={modalGig} poster={posterProfiles.get(modalGig.clerk_user_id)} onClose={() => setModalGig(null)} />
      )}

      {postFormOpen && (
        <PostGigModal onClose={() => setPostFormOpen(false)} onPosted={handlePosted} />
      )}
    </>
  )
}

function GigModal({ gig, poster, onClose }: { gig: Gig; poster?: Profile; onClose: () => void }) {
  const dateStr = new Date(gig.created_at).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(10,19,64,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', zIndex: 201,
        transform: 'translate(-50%, -50%)',
        width: 'min(520px, calc(100vw - 48px))',
        maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
        background: 'var(--surface)',
        backdropFilter: 'blur(20px) saturate(160%)', WebkitBackdropFilter: 'blur(20px) saturate(160%)',
        border: '1px solid var(--glass-border)', borderRadius: 20,
        boxShadow: '0 32px 80px rgba(10,19,64,0.22), 0 0 0 1px rgba(255,255,255,0.5)',
        padding: 32,
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', background: 'rgba(12,19,48,0.08)', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)' }}>×</button>
        <div style={{ marginBottom: 12 }}>
          <span className="gig-type-badge">{typeLabel(gig.type)}</span>
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 24, letterSpacing: '-0.4px', lineHeight: 1.2, color: 'var(--ink-1)', marginBottom: 20 }}>{gig.title}</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <div className="mkw-row-av" style={{ width: 36, height: 36, borderRadius: '50%', fontSize: 13, background: 'var(--mk-navy)' }}>
            {getInitials(poster?.full_name)}
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600, color: 'var(--ink-1)' }}>{poster?.full_name || 'A member'}</div>
            <div style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>Posted {dateStr}</div>
          </div>
        </div>
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 1.6, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 10 }}>Details</div>
          <p style={{ fontSize: 14, color: 'var(--ink-2)', lineHeight: 1.7, fontFamily: 'var(--font-body)', whiteSpace: 'pre-wrap' }}>{gig.description}</p>
        </div>
        {(gig.budget || gig.timeline) && (
          <div style={{ display: 'flex', gap: 24, marginBottom: 8 }}>
            {gig.budget && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Budget</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', fontFamily: 'var(--font-display)' }}>{gig.budget}</div>
              </div>
            )}
            {gig.timeline && (
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--ink-3)', marginBottom: 4 }}>Timeline</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink-1)', fontFamily: 'var(--font-display)' }}>{gig.timeline}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}

function PostGigModal({ onClose, onPosted }: { onClose: () => void; onPosted: (gig: Gig) => void }) {
  const { user } = useUser()
  const { session } = useSession()
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [timeline, setTimeline] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    if (!title.trim()) { setError("Add a title so people know what you need"); return }
    if (!description.trim()) { setError("Describe what you're looking for"); return }
    setError('')
    setSubmitting(true)
    const token = await session?.getToken()
    const db = getSupabaseClient(token)
    const { data, error: dbError } = await db.from('gigs').insert({
      clerk_user_id: user.id,
      title: title.trim(),
      description: description.trim(),
      type: 'freelance',
      budget: budget.trim() ? `€${budget.trim()}` : null,
      timeline: timeline.trim() || null,
    }).select().single()
    setSubmitting(false)
    if (dbError || !data) { setError('Something went wrong — please try again'); return }
    onPosted(data as Gig)
  }

  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(10,19,64,0.45)', backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }} />
      <div style={{
        position: 'fixed', top: '50%', left: '50%', zIndex: 201,
        transform: 'translate(-50%, -50%)',
        width: 'min(520px, calc(100vw - 48px))',
        maxHeight: 'calc(100vh - 80px)', overflowY: 'auto',
        background: 'var(--surface)',
        border: '1px solid var(--glass-border)', borderRadius: 20,
        boxShadow: '0 32px 80px rgba(10,19,64,0.22), 0 0 0 1px rgba(255,255,255,0.5)',
        padding: 32,
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, width: 32, height: 32, borderRadius: '50%', background: 'rgba(12,19,48,0.08)', border: 'none', cursor: 'pointer', fontSize: 16, color: 'var(--ink-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-body)' }}>×</button>
        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, color: 'var(--ink-1)', marginBottom: 20 }}>Post a gig</h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="mkw-form-group">
            <label className="mkw-form-label">Title</label>
            <input
              className="mkw-form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Brand designer for fintech app"
              maxLength={80}
            />
          </div>

          <div className="mkw-form-group">
            <label className="mkw-form-label">Description</label>
            <textarea
              className="mkw-form-textarea"
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the project, what skills you need, and what you're offering in return…"
              maxLength={500}
            />
            <div style={{ fontSize: 11, color: 'var(--ink-3)', textAlign: 'right' }}>{description.length}/500</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="mkw-form-group">
              <label className="mkw-form-label">Budget <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <div className="gig-budget-wrap">
                <span className="gig-budget-currency">€</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="mkw-form-input gig-budget-input"
                  value={budget}
                  onChange={e => setBudget(e.target.value)}
                  placeholder="500"
                />
              </div>
            </div>
            <div className="mkw-form-group">
              <label className="mkw-form-label">Timeline <span style={{ fontWeight: 400 }}>(optional)</span></label>
              <input
                className="mkw-form-input"
                value={timeline}
                onChange={e => setTimeline(e.target.value)}
                placeholder="e.g. 2 weeks, ongoing"
                maxLength={40}
              />
            </div>
          </div>

          {error && <div style={{ fontSize: 12, color: 'var(--danger)' }}>{error}</div>}

          <p style={{ fontSize: 12, color: 'var(--ink-3)', fontFamily: 'var(--font-body)' }}>
            Your gig will be reviewed before it goes live — usually within a few hours.
          </p>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm" onClick={onClose}>Cancel</button>
            <button type="submit" className="mk-btn mk-btn-primary mk-btn-sm" disabled={submitting}>
              {submitting ? 'Posting…' : 'Post gig →'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
