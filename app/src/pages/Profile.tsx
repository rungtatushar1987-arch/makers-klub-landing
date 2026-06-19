import { useEffect, useState, useMemo } from 'react'
import { useUser, useSession } from '@clerk/clerk-react'
import { getSupabaseClient, type Profile } from '../supabase'
import { useKlub } from '../KlubContext'
import './Profile.css'

const ROLE_OPTIONS = ['founder', 'designer', 'photographer', 'videographer', 'creator', 'developer', 'other']
const ROLE_LABELS: Record<string, string> = {
  founder: 'Founder / Business Owner',
  designer: 'Brand / UI Designer',
  photographer: 'Photographer',
  videographer: 'Videographer',
  creator: 'Content Creator',
  developer: 'Developer',
  other: 'Other',
}

function calcProgress(p: Partial<Profile>): { pct: number; fieldsLeft: number; isComplete: boolean } {
  const has = [
    !!p.full_name?.trim(),
    !!p.bio?.trim(),
    !!p.role_category,
    !!p.linkedin_url?.trim(),
    !!p.instagram_url?.trim(),
    !!p.website_url?.trim(),
  ]
  const filled = has.filter(Boolean).length
  return { pct: Math.round((filled / 6) * 100), fieldsLeft: 6 - filled, isComplete: filled === 6 }
}

export default function Profile() {
  const { user } = useUser()
  const { session } = useSession()
  const { events } = useKlub()
  const [profile, setProfile] = useState<Partial<Profile>>({})
  const [savedProfile, setSavedProfile] = useState<Partial<Profile>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [socialError, setSocialError] = useState(false)

  const upcomingCount = useMemo(() => {
    const now = new Date()
    return events.filter(e => new Date(e.date) >= now).length
  }, [events])

  useEffect(() => {
    async function load() {
      const token = await session?.getToken()
      const db = getSupabaseClient(token)
      const { data } = await db.from('profiles').select('*').eq('clerk_user_id', user?.id).single()
      if (data) { setProfile(data); setSavedProfile(data) }
      setLoading(false)
    }
    if (user && session) load()
  }, [user, session])

  function update(field: keyof Profile, value: string) {
    setProfile(prev => ({ ...prev, [field]: value }))
    if (['linkedin_url', 'instagram_url', 'website_url'].includes(field)) setSocialError(false)
  }

  const { pct, fieldsLeft, isComplete } = calcProgress(savedProfile)

  const savedHasSocial =
    !!savedProfile.linkedin_url?.trim() ||
    !!savedProfile.instagram_url?.trim() ||
    !!savedProfile.website_url?.trim()
  const isProfileUnlocked =
    !!savedProfile.full_name?.trim() &&
    !!savedProfile.bio?.trim() &&
    !!savedProfile.role_category &&
    savedHasSocial

  const hasSocial =
    !!profile.linkedin_url?.trim() ||
    !!profile.instagram_url?.trim() ||
    !!profile.website_url?.trim()

  const canSave = !!profile.full_name?.trim() && !!profile.bio?.trim() && !!profile.role_category && hasSocial

  async function save() {
    if (!isProfileUnlocked && !canSave) { if (!hasSocial) setSocialError(true); return }
    setSaving(true)
    const slug = profile.slug || (profile.full_name
      ? profile.full_name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + user?.id.slice(-6)
      : undefined)
    const token = await session?.getToken()
    const db = getSupabaseClient(token)
    await db.from('profiles').upsert({ ...profile, clerk_user_id: user?.id, slug })
    const updated = { ...profile, slug }
    setSavedProfile(updated)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  if (loading) return <div className="mkw-loading">Loading…</div>

  return (
    <>
      <div className="mkw-pagehead">
        <div>
          <div className="eyebrow">Account</div>
          <h1>My Profile</h1>
        </div>
      </div>

      <div className="mkw-main-body">
        {saved && <div className="prof-saved-toast">✓ Profile saved</div>}

        <div className="prof-layout">
          <div className="prof-left">
            {!isComplete && (
              <div className="prof-progress-card">
                <div className="prof-progress-label">Your profile</div>
                <div className="prof-progress-row">
                  <span className="prof-progress-sub">{pct}% complete{fieldsLeft > 0 ? ` · ${fieldsLeft} field${fieldsLeft !== 1 ? 's' : ''} left` : ' · all done!'}</span>
                  <span className="prof-progress-pct">{pct}%</span>
                </div>
                <div className="prof-progress-bar-bg">
                  <div className="prof-progress-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            )}

            <div className="prof-section">
              <div className="prof-section-label">Personal</div>
              <div className="mkw-form-group">
                <label className="mkw-form-label">Full name *</label>
                <input className="mkw-form-input" value={profile.full_name || ''} onChange={e => update('full_name', e.target.value)} placeholder="Your name" />
              </div>
              <div className="mkw-form-group">
                <label className="mkw-form-label">One-line bio *</label>
                <textarea className="mkw-form-textarea" value={profile.bio || ''} onChange={e => update('bio', e.target.value)} placeholder="What you do + what you're working on right now" />
              </div>
              <div className="mkw-form-group">
                <label className="mkw-form-label">I am a… *</label>
                <select className="mkw-form-select" value={profile.role_category || ''} onChange={e => update('role_category', e.target.value)}>
                  <option value="">Select your role</option>
                  {ROLE_OPTIONS.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
                <p className="prof-field-hint">We'll use this to recommend events and matches for you</p>
              </div>
            </div>

            <div className="prof-section">
              <div className="prof-section-label">Social links</div>
              {!isProfileUnlocked && (
                <div className={socialError ? 'prof-social-error' : 'prof-social-req'}>
                  {socialError ? '⚠ Add at least one link to unlock your QR code' : 'At least one link required to unlock your QR code'}
                </div>
              )}
              <div className="mkw-form-group">
                <label className="mkw-form-label">LinkedIn</label>
                <input className="mkw-form-input" value={profile.linkedin_url || ''} onChange={e => update('linkedin_url', e.target.value)} placeholder="https://linkedin.com/in/yourname" />
              </div>
              <div className="mkw-form-group">
                <label className="mkw-form-label">Instagram</label>
                <input className="mkw-form-input" value={profile.instagram_url || ''} onChange={e => update('instagram_url', e.target.value)} placeholder="https://instagram.com/yourhandle" />
              </div>
              <div className="mkw-form-group">
                <label className="mkw-form-label">Website</label>
                <input className="mkw-form-input" value={profile.website_url || ''} onChange={e => update('website_url', e.target.value)} placeholder="https://yourwebsite.com" />
              </div>
            </div>

            <button
              className={`mk-btn ${isProfileUnlocked || canSave ? 'mk-btn-primary' : 'mk-btn-ghost'} prof-save-btn`}
              onClick={save}
              disabled={saving || (!isProfileUnlocked && !canSave)}
            >
              {saving ? 'Saving…' : isProfileUnlocked ? 'Save profile' : 'Save & unlock →'}
            </button>
          </div>

          <div className="prof-right">
            <div className="prof-qr-card">
              <div className="prof-qr-blur-wrap">
                <div className="prof-qr-blur-grid">
                  {[1,0,1,0,1, 0,1,0,1,0, 1,0,1,0,1, 0,1,0,1,0, 1,0,1,0,1].map((on, i) => (
                    <div key={i} className={on ? 'prof-qr-dot' : 'prof-qr-dot-empty'} />
                  ))}
                </div>
                <div className="prof-qr-lock">{isProfileUnlocked ? '✓' : '🔒'}</div>
              </div>
              <div className="prof-qr-title">{isProfileUnlocked ? 'Your QR code is live' : 'Your QR code is locked'}</div>
              <div className="prof-qr-sub">At Makers Klub events, members scan each other's QR codes on the app to connect instantly. Complete your profile to unlock yours.</div>
              {!isComplete && <div className="prof-qr-hint">{fieldsLeft} field{fieldsLeft !== 1 ? 's' : ''} left to complete your profile</div>}
            </div>

            <div className="prof-events-card">
              <div className="prof-events-num">{upcomingCount}</div>
              <div className="prof-events-title">upcoming event{upcomingCount !== 1 ? 's' : ''} waiting to be discovered</div>
              <div className="prof-events-sub">Complete your profile so we can match you to the right events and people in the Klub.</div>
              <a href="/events" className="prof-events-link">Browse events →</a>
            </div>

            {(() => {
              const ROLE_PLURAL: Record<string, string> = {
                founder: 'Founders', designer: 'Designers', photographer: 'Photographers',
                videographer: 'Videographers', creator: 'Creators', developer: 'Developers', other: 'Members',
              }
              const FIELD_LABEL: Record<string, string> = {
                linkedin_url: 'a LinkedIn', instagram_url: 'an Instagram', website_url: 'a website',
              }
              const rolePlural = ROLE_PLURAL[savedProfile.role_category || ''] || 'Members'
              const socialFields = ['linkedin_url', 'instagram_url', 'website_url'] as const
              const nudges = socialFields
                .filter(f => !savedProfile[f]?.trim())
                .map(f => `${rolePlural} with ${FIELD_LABEL[f]} get more collabs at our events`)
              if (nudges.length === 0) return null
              return (
                <div className="prof-tip-card">
                  <div className="prof-tip-label">Complete your profile</div>
                  {nudges.map((msg, i) => (
                    <div key={i} className="prof-tip-nudge">↑ {msg}</div>
                  ))}
                </div>
              )
            })()}
          </div>
        </div>
      </div>
    </>
  )
}
