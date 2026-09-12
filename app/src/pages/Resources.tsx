import { useEffect, useState } from 'react'
import { useSession } from '@clerk/clerk-react'
import { getSupabaseClient, type Resource, RESOURCE_CATEGORIES } from '../supabase'
import './Resources.css'

export default function Resources() {
  const { session } = useSession()
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState<string>('All')

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

  if (loading) return <div className="mkw-loading">Loading…</div>

  const categoriesPresent = [...new Set(resources.map(r => r.category).filter(Boolean))] as string[]
  const tabs = ['All', ...RESOURCE_CATEGORIES.filter(c => categoriesPresent.includes(c))]
  const shown = category === 'All' ? resources : resources.filter(r => r.category === category)

  return (
    <>
      <div className="mkw-pagehead">
        <div>
          <div className="eyebrow">Berlin · Makers Klub</div>
          <h1>Resources</h1>
          <p className="sub">Templates, guides, and tools curated for freelancers.</p>
        </div>
      </div>

      <div className="mkw-main-body">
        {tabs.length > 1 && (
          <div className="res-tabs">
            {tabs.map(t => (
              <button
                key={t}
                onClick={() => setCategory(t)}
                className={`res-tab${category === t ? ' active' : ''}`}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {shown.length === 0 && (
          <div className="mkw-empty">No resources yet — check back soon.</div>
        )}

        <div className="res-grid">
          {shown.map(r => (
            <a key={r.id} href={r.url} target="_blank" rel="noreferrer" className="res-card">
              <div className="res-card-top">
                <span className="res-card-title">{r.title}</span>
                {r.category && <span className="res-category-chip">{r.category}</span>}
              </div>
              {r.description && <p className="res-card-desc">{r.description}</p>}
              <span className="res-card-link">Open ↗</span>
            </a>
          ))}
        </div>
      </div>
    </>
  )
}
