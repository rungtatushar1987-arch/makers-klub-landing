import { useEffect, useMemo, useState } from 'react'
import { useSession } from '@clerk/clerk-react'
import { getSupabaseClient, type Resource, RESOURCE_CATEGORIES } from '../supabase'
import './Resources.css'

// "https://www.notion.so/x" -> "notion.so"
function hostOf(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return '' }
}

export default function Resources() {
  const { session } = useSession()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>('All')
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (!session) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const token = await session.getToken()
      const db = getSupabaseClient(token)
      const { data } = await db.from('resources').select('*').order('created_at', { ascending: false })
      if (!cancelled) {
        setResources((data as Resource[]) || [])
        setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [session])

  const categoriesPresent = useMemo(() => [...new Set(resources.map(r => r.category).filter(Boolean))] as string[], [resources])
  const tabs = ['All', ...RESOURCE_CATEGORIES.filter(c => categoriesPresent.includes(c))]
  const q = query.trim().toLowerCase()
  const shown = useMemo(() => resources.filter(r =>
    (category === 'All' || r.category === category) &&
    (!q || [r.title, r.description, r.category].some(v => v?.toLowerCase().includes(q)))
  ), [resources, category, q])
  const countIn = (c: string) => c === 'All' ? resources.length : resources.filter(r => r.category === c).length

  if (loading) return <div className="mkw-loading">Loading…</div>

  return (
    <>
      <div className="mkw-pagehead">
        <div>
          <div className="eyebrow">Berlin · Makers Klub</div>
          <h1>Resources</h1>
          <p className="sub">Templates, guides and tools curated for freelancers.</p>
        </div>
      </div>

      <div className="mkw-main-body res">
        {resources.length > 0 && (
          <div className="res-bar">
            <input
              type="search"
              className="res-search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search resources"
              aria-label="Search resources"
            />
            {tabs.length > 2 && (
              <div className="res-pills" role="group" aria-label="Filter by category">
                {tabs.map(t => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={category === t}
                    onClick={() => setCategory(t)}
                    className={`res-pill${category === t ? ' active' : ''}`}
                  >
                    {t} <span>{countIn(t)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {resources.length === 0 && (
          <div className="res-empty">
            <b>No resources yet</b>
            <p>Templates, guides and tools will appear here as the organisers add them.</p>
          </div>
        )}
        {resources.length > 0 && shown.length === 0 && (
          <div className="res-empty">
            <b>Nothing matches “{query || category}”</b>
            <p>Try a different word, or clear the filter.</p>
            <button type="button" className="mk-btn mk-btn-ghost mk-btn-sm" onClick={() => { setQuery(''); setCategory('All') }}>Clear filters</button>
          </div>
        )}

        <div className="res-grid">
          {shown.map(r => (
            <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="res-card">
              {r.category && <span className="res-category-chip">{r.category}</span>}
              <span className="res-card-title">{r.title}</span>
              {r.description && <p className="res-card-desc">{r.description}</p>}
              <span className="res-card-link">
                <span>{hostOf(r.url)}</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17L17 7M8 7h9v9" /></svg>
                <span className="sr-only">(opens in a new tab)</span>
              </span>
            </a>
          ))}
        </div>
      </div>
    </>
  )
}
