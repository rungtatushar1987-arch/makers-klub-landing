import { useEffect, useState, useMemo, type KeyboardEvent } from 'react'
import { useUser, useSession } from '@clerk/clerk-react'
import { getSupabaseClient, calcProfileProgress, type Profile } from '../supabase'
import { useKlub } from '../KlubContext'
import OnboardingWizard from './OnboardingWizard'
import {
  INDUSTRIES, MAX_INDUSTRIES, MAX_SERVICES, EXPERIENCE_LEVELS,
  INCOME_GOAL_OPTIONS, CLIENT_CAPACITY_OPTIONS, LEAD_AVAILABILITY_OPTIONS,
} from '../profileOptions'
import './Profile.css'
import './OnboardingWizard.css'

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
  const [showWizard, setShowWizard] = useState(false)
  const [locationInput, setLocationInput] = useState('')
  const [serviceInput, setServiceInput] = useState('')

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

  function toggleIndustry(ind: string) {
    setProfile(prev => {
      const cur = prev.industries || []
      if (cur.includes(ind)) return { ...prev, industries: cur.filter(i => i !== ind) }
      if (cur.length >= MAX_INDUSTRIES) return prev
      return { ...prev, industries: [...cur, ind] }
    })
  }

  function addLocation() {
    const val = locationInput.trim()
    if (!val) { setLocationInput(''); return }
    setProfile(prev => {
      const cur = prev.locations || []
      if (cur.includes(val)) return prev
      return { ...prev, locations: [...cur, val] }
    })
    setLocationInput('')
  }
  function removeLocation(loc: string) {
    setProfile(prev => ({ ...prev, locations: (prev.locations || []).filter(l => l !== loc) }))
  }
  function handleLocationKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addLocation() }
    else if (e.key === 'Backspace' && locationInput === '' && (profile.locations || []).length > 0) {
      setProfile(prev => ({ ...prev, locations: (prev.locations || []).slice(0, -1) }))
    }
  }

  function addService() {
    const val = serviceInput.trim()
    if (!val) { setServiceInput(''); return }
    setProfile(prev => {
      const cur = prev.services || []
      if (cur.includes(val) || cur.length >= MAX_SERVICES) return prev
      return { ...prev, services: [...cur, val] }
    })
    setServiceInput('')
  }
  function removeService(s: string) {
    setProfile(prev => {
      const nextPricing = { ...(prev.service_pricing || {}) }
      delete nextPricing[s]
      return { ...prev, services: (prev.services || []).filter(x => x !== s), service_pricing: nextPricing }
    })
  }
  function handleServiceKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addService() }
    else if (e.key === 'Backspace' && serviceInput === '' && (profile.services || []).length > 0) {
      setProfile(prev => ({ ...prev, services: (prev.services || []).slice(0, -1) }))
    }
  }

  function setServiceExperience(service: string, level: string) {
    setProfile(prev => ({
      ...prev,
      service_pricing: { ...(prev.service_pricing || {}), [service]: { experience: level, hourlyRate: prev.service_pricing?.[service]?.hourlyRate ?? '' } },
    }))
  }
  function setServiceRate(service: string, rate: string) {
    setProfile(prev => ({
      ...prev,
      service_pricing: { ...(prev.service_pricing || {}), [service]: { experience: prev.service_pricing?.[service]?.experience ?? '', hourlyRate: rate } },
    }))
  }

  const { pct, fieldsLeft, isComplete } = calcProfileProgress(savedProfile)
  const isDirty = JSON.stringify(profile) !== JSON.stringify(savedProfile)

  const savedHasSocial =
    !!savedProfile.linkedin_url?.trim() ||
    !!savedProfile.instagram_url?.trim() ||
    !!savedProfile.website_url?.trim()
  const isProfileUnlocked =
    !!savedProfile.full_name?.trim() &&
    !!savedProfile.bio?.trim() &&
    savedHasSocial

  const hasSocial =
    !!profile.linkedin_url?.trim() ||
    !!profile.instagram_url?.trim() ||
    !!profile.website_url?.trim()

  const canSave = !!profile.full_name?.trim() && !!profile.bio?.trim() && hasSocial

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
            </div>

            <div className="prof-section">
              <div className="prof-section-label">Services & business profile</div>

              {!isComplete && (
                <>
                  <p className="prof-field-hint" style={{ marginTop: 0, marginBottom: 14 }}>
                    Tell us what you offer, your rates, and your business goals so we can match you with the right people and events.
                  </p>
                  <button type="button" className="mk-btn mk-btn-navy" onClick={() => setShowWizard(true)}>
                    {pct > 0 ? 'Continue completing your profile →' : 'Complete your profile →'}
                  </button>
                </>
              )}

              {isComplete && (
                <>
                  <div className="mkw-form-group">
                    <label className="mkw-form-label">Looking to</label>
                    <div className="ow-tech-chips">
                      {([
                        { value: 'hire' as const, label: 'Hire' },
                        { value: 'freelancer' as const, label: 'Provide service (freelancer)' },
                      ]).map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`ow-tech-chip ${profile.looking_to === opt.value ? 'ow-tech-chip-selected' : ''}`}
                          onClick={() => update('looking_to', opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mkw-form-group">
                    <label className="mkw-form-label">Industries you have experience working in</label>
                    <div className="ow-goal-grid">
                      {INDUSTRIES.map(ind => {
                        const selected = (profile.industries || []).includes(ind)
                        const disabled = !selected && (profile.industries || []).length >= MAX_INDUSTRIES
                        return (
                          <button
                            key={ind}
                            type="button"
                            className={`ow-goal-chip ${selected ? 'ow-goal-chip-selected' : ''} ${disabled ? 'ow-goal-chip-disabled' : ''}`}
                            onClick={() => toggleIndustry(ind)}
                            disabled={disabled}
                          >
                            {ind}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  <div className="mkw-form-group">
                    <label className="mkw-form-label">Locations you are available to work in</label>
                    <div className="ow-tag-input-box">
                      {(profile.locations || []).map(loc => (
                        <span key={loc} className="ow-tag-chip">
                          {loc}
                          <button type="button" className="ow-tag-remove" onClick={() => removeLocation(loc)}>×</button>
                        </span>
                      ))}
                      <input
                        className="ow-tag-input"
                        type="text"
                        value={locationInput}
                        onChange={e => setLocationInput(e.target.value)}
                        onKeyDown={handleLocationKeyDown}
                        onBlur={addLocation}
                        placeholder={(profile.locations || []).length === 0 ? 'e.g. Berlin, Remote…' : ''}
                      />
                    </div>
                  </div>

                  <div className="mkw-form-group">
                    <label className="mkw-form-label">Primary services you offer</label>
                    <div className="ow-tag-input-box">
                      {(profile.services || []).map(s => (
                        <span key={s} className="ow-tag-chip">
                          {s}
                          <button type="button" className="ow-tag-remove" onClick={() => removeService(s)}>×</button>
                        </span>
                      ))}
                      {(profile.services || []).length < MAX_SERVICES && (
                        <input
                          className="ow-tag-input"
                          type="text"
                          value={serviceInput}
                          onChange={e => setServiceInput(e.target.value)}
                          onKeyDown={handleServiceKeyDown}
                          onBlur={addService}
                          placeholder={(profile.services || []).length === 0 ? 'e.g. Logo design, Brand strategy…' : ''}
                        />
                      )}
                    </div>
                    <div className="ow-field-footer">
                      <span className="ow-char-count">{(profile.services || []).length} / {MAX_SERVICES}</span>
                    </div>
                  </div>

                  {(profile.services || []).length > 0 && (
                    <div className="mkw-form-group">
                      <label className="mkw-form-label">Service pricing</label>
                      <div className="ow-pricing-rows">
                        {(profile.services || []).map(service => (
                          <div key={service} className="ow-pricing-row">
                            <span className="ow-pricing-service">{service}</span>
                            <select
                              className="mkw-form-select ow-pricing-select"
                              value={profile.service_pricing?.[service]?.experience || ''}
                              onChange={e => setServiceExperience(service, e.target.value)}
                            >
                              <option value="">Experience</option>
                              {EXPERIENCE_LEVELS.map(level => (
                                <option key={level} value={level}>{level}</option>
                              ))}
                            </select>
                            <div className="ow-pricing-rate-wrap">
                              <input
                                className="ow-pricing-rate-input"
                                type="number"
                                min={0}
                                value={profile.service_pricing?.[service]?.hourlyRate || ''}
                                onChange={e => setServiceRate(service, e.target.value)}
                                placeholder="45"
                              />
                              <span className="ow-pricing-rate-suffix">€/hr</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="mkw-form-group">
                    <label className="mkw-form-label">Income goal</label>
                    <div className="ow-option-list">
                      {INCOME_GOAL_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`ow-option-card ${profile.income_goal === opt.value ? 'ow-option-card-selected' : ''}`}
                          onClick={() => update('income_goal', opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mkw-form-group">
                    <label className="mkw-form-label">Long-term retainer clients you can realistically balance</label>
                    <div className="ow-option-list">
                      {CLIENT_CAPACITY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`ow-option-card ${profile.client_capacity === opt.value ? 'ow-option-card-selected' : ''}`}
                          onClick={() => update('client_capacity', opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mkw-form-group">
                    <label className="mkw-form-label">Availability for new project leads</label>
                    <div className="ow-option-list">
                      {LEAD_AVAILABILITY_OPTIONS.map(opt => (
                        <button
                          key={opt.value}
                          type="button"
                          className={`ow-option-card ${profile.lead_availability === opt.value ? 'ow-option-card-selected' : ''}`}
                          onClick={() => update('lead_availability', opt.value)}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mkw-form-group">
                    <label className="mkw-form-label">Biggest challenge right now</label>
                    <textarea
                      className="mkw-form-textarea"
                      value={profile.current_focus || ''}
                      onChange={e => update('current_focus', e.target.value)}
                      placeholder="e.g. Land 2 new retainer clients by Q3, or ship my first SaaS product"
                      rows={3}
                      maxLength={200}
                    />
                    <div className="ow-field-footer">
                      <span className="ow-char-count">{(profile.current_focus || '').length} / 200</span>
                    </div>
                  </div>
                </>
              )}
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
              disabled={saving || (isComplete ? !isDirty : (!isProfileUnlocked && !canSave))}
            >
              {saving ? 'Saving…' : isProfileUnlocked ? 'Save profile' : 'Save & unlock →'}
            </button>
          </div>

          <div className="prof-right">
            <div className="prof-qr-card">
              <div className="prof-qr-pwa-icon">
                <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="10" y="2" width="24" height="40" rx="4" fill="var(--mk-navy)" />
                  <rect x="13" y="6" width="18" height="28" rx="2" fill="white" opacity="0.08" />
                  <rect x="18" y="36" width="8" height="2" rx="1" fill="white" opacity="0.4" />
                  <rect x="15" y="10" width="6" height="6" rx="1" fill="var(--mk-yellow)" />
                  <rect x="23" y="10" width="6" height="6" rx="1" fill="var(--mk-yellow)" opacity="0.6" />
                  <rect x="15" y="18" width="6" height="6" rx="1" fill="var(--mk-yellow)" opacity="0.6" />
                  <rect x="23" y="18" width="6" height="6" rx="1" fill="var(--mk-yellow)" />
                  <rect x="15" y="26" width="6" height="2" rx="1" fill="var(--mk-yellow)" opacity="0.4" />
                  <rect x="23" y="26" width="6" height="2" rx="1" fill="var(--mk-yellow)" opacity="0.4" />
                </svg>
              </div>
              <div className="prof-qr-title">Use the app to access your QR</div>
              <div className="prof-qr-sub">Your personal QR code lives in the Makers Klub app. Open it on your phone to show your QR at events — or scan someone else's to connect instantly.</div>
              <a href="https://app.makersklub.com" target="_blank" rel="noopener noreferrer" className="prof-qr-app-link">Open app →</a>
            </div>

            {isComplete ? (
              <div className="prof-complete-banner">
                <div className="prof-complete-banner-pct">{pct}%</div>
                <div className="prof-complete-banner-text">Profile complete</div>
              </div>
            ) : (() => {
              const FIELD_LABEL: Record<string, string> = {
                linkedin_url: 'a LinkedIn', instagram_url: 'an Instagram', website_url: 'a website',
              }
              const socialFields = ['linkedin_url', 'instagram_url', 'website_url'] as const
              const nudges = socialFields
                .filter(f => !savedProfile[f]?.trim())
                .map(f => `Members with ${FIELD_LABEL[f]} get more collabs at our events`)
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

            <div className="prof-events-card">
              <div className="prof-events-num">{upcomingCount}</div>
              <div className="prof-events-title">upcoming event{upcomingCount !== 1 ? 's' : ''} waiting to be discovered</div>
              <div className="prof-events-sub">Complete your profile so we can match you to the right events and people in the Klub.</div>
              <a href="/events" className="prof-events-link">Browse events →</a>
            </div>
          </div>
        </div>
      </div>

      {showWizard && (
        <div className="prof-wizard-overlay">
          <OnboardingWizard
            onClose={(updated) => {
              setShowWizard(false)
              if (updated) { setProfile(updated); setSavedProfile(updated) }
            }}
          />
        </div>
      )}
    </>
  )
}
