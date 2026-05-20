import { useEffect, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { supabase, type Profile } from '../supabase'

const ROLE_OPTIONS = ['founder', 'designer', 'photographer', 'videographer', 'creator', 'developer', 'other']

export default function Profile() {
  const { user } = useUser()
  const [profile, setProfile] = useState<Partial<Profile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('profiles').select('*').eq('clerk_user_id', user?.id).single()
      if (data) setProfile(data)
      setLoading(false)
    }
    if (user) load()
  }, [user])

  async function save() {
    setSaving(true)
    const slug = profile.slug || (profile.full_name
      ? profile.full_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      : undefined)
    await supabase.from('profiles').upsert({ ...profile, clerk_user_id: user?.id, slug })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function update(field: keyof Profile, value: string) {
    setProfile(prev => ({ ...prev, [field]: value }))
  }

  if (loading) return <div className="mkw-loading">Loading…</div>

  return (
    <div>
      <div className="mkw-pagehead">
        <div>
          <div className="eyebrow">Account</div>
          <h1>My <em>brief.</em></h1>
          <p className="sub">Your profile is how other members get to know you before the session. Keep it honest and specific.</p>
        </div>
      </div>

      {saved && (
        <div style={{ background: 'rgba(74,222,128,0.15)', color: '#1e7a3f', padding: '12px 20px', borderRadius: 8, marginBottom: 24, fontSize: 14, fontWeight: 600 }}>
          Brief saved.
        </div>
      )}

      <div className="mkw-form">
        <div className="mkw-form-group">
          <label className="mkw-form-label">Full name</label>
          <input className="mkw-form-input" value={profile.full_name || ''} onChange={e => update('full_name', e.target.value)} placeholder="Your name" />
        </div>

        <div className="mkw-form-group">
          <label className="mkw-form-label">One-line bio</label>
          <textarea className="mkw-form-textarea" value={profile.bio || ''} onChange={e => update('bio', e.target.value)} placeholder="What you do + what you're working on right now" />
        </div>

        <div className="mkw-form-group">
          <label className="mkw-form-label">Role</label>
          <select className="mkw-form-select" value={profile.role_category || ''} onChange={e => update('role_category', e.target.value)}>
            <option value="">Select your role</option>
            {ROLE_OPTIONS.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
          </select>
        </div>

        <div style={{ borderTop: '1px solid var(--border-1)', paddingTop: 20, marginTop: 4 }}>
          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: 'var(--fg-3)', marginBottom: 16 }}>Socials</p>

          <div className="mkw-form-group" style={{ marginBottom: 16 }}>
            <label className="mkw-form-label">Instagram</label>
            <input className="mkw-form-input" value={profile.instagram_url || ''} onChange={e => update('instagram_url', e.target.value)} placeholder="https://instagram.com/yourhandle" />
          </div>

          <div className="mkw-form-group" style={{ marginBottom: 16 }}>
            <label className="mkw-form-label">LinkedIn</label>
            <input className="mkw-form-input" value={profile.linkedin_url || ''} onChange={e => update('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/yourname" />
          </div>

          <div className="mkw-form-group">
            <label className="mkw-form-label">Website</label>
            <input className="mkw-form-input" value={profile.website_url || ''} onChange={e => update('website_url', e.target.value)} placeholder="https://yourwebsite.com" />
          </div>
        </div>

        <button className="mk-btn mk-btn-ochre" onClick={save} disabled={saving} style={{ width: 'fit-content' }}>
          {saving ? 'Saving…' : 'Save brief →'}
        </button>
      </div>
    </div>
  )
}
