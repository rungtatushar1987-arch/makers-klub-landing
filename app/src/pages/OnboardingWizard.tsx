import { useState, useCallback, type KeyboardEvent } from 'react'
import { useUser, useSession } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { upsertProfile, type Profile } from '../supabase'
import { useKlub } from '../KlubContext'
import {
  INDUSTRIES, MAX_INDUSTRIES, MAX_SERVICES, EXPERIENCE_LEVELS, SOCIAL_PLATFORMS,
  INCOME_GOAL_OPTIONS, CLIENT_CAPACITY_OPTIONS, LEAD_AVAILABILITY_OPTIONS,
} from '../profileOptions'
import './OnboardingWizard.css'

type OnboardingWizardProps = {
  // When provided (rendered as a modal from the Profile page), the wizard
  // calls this instead of navigating — passes the saved profile on finish,
  // or nothing when just backing out.
  onClose?: (savedProfile?: Profile) => void
}

// ── AI polish helper ──
async function polishWithAI(
  field: 'priority',
  text: string,
  discipline: string,
  token: string | null | undefined
): Promise<string> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const response = await fetch(`${supabaseUrl}/functions/v1/polish-text`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ field, text, discipline }),
  })
  if (!response.ok) throw new Error('AI service error')
  const data = await response.json()
  if (!data.result) throw new Error('No response from AI')
  return data.result
}

export default function OnboardingWizard({ onClose }: OnboardingWizardProps = {}) {
  const { user } = useUser()
  const { session } = useSession()
  const navigate = useNavigate()
  const { profile, refresh } = useKlub()

  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Step 1
  const [fullName, setFullName] = useState(profile?.full_name || user?.fullName || '')
  const [lookingTo, setLookingTo] = useState<'hire' | 'freelancer' | ''>(
    profile?.looking_to === 'hire' || profile?.looking_to === 'freelancer' ? profile.looking_to : ''
  )
  const [industries, setIndustries] = useState<string[]>(profile?.industries || [])
  const [locations, setLocations] = useState<string[]>(profile?.locations || [])
  const [locationInput, setLocationInput] = useState('')
  const [services, setServices] = useState<string[]>(profile?.services || [])
  const [serviceInput, setServiceInput] = useState('')

  // Step 2
  const initialSocialUrls: Record<string, string> = {
    ...(profile?.social_links || {}),
    ...(profile?.linkedin_url ? { LinkedIn: profile.linkedin_url } : {}),
    ...(profile?.instagram_url ? { Instagram: profile.instagram_url } : {}),
  }
  const [servicePricing, setServicePricing] = useState<Record<string, { experience: string; hourlyRate: string }>>(profile?.service_pricing || {})
  const [website, setWebsite] = useState(profile?.website_url || '')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(Object.keys(initialSocialUrls))
  const [socialUrls, setSocialUrls] = useState<Record<string, string>>(initialSocialUrls)

  // Step 3
  const [incomeGoal, setIncomeGoal] = useState(profile?.income_goal || '')
  const [clientCapacity, setClientCapacity] = useState(profile?.client_capacity || '')
  const [leadAvailability, setLeadAvailability] = useState(profile?.lead_availability || '')
  const [priority, setPriority] = useState(profile?.current_focus || '')
  const [polishingPriority, setPolishingPriority] = useState(false)
  const [priorityOriginal, setPriorityOriginal] = useState<string | null>(null)

  const step1Valid = fullName.trim().length > 0 && lookingTo !== '' && industries.length > 0 && locations.length > 0 && services.length > 0
  const step2Valid = website.trim().length > 0 && services.every(s => !!servicePricing[s]?.experience && !!servicePricing[s]?.hourlyRate?.trim())
  const step3Valid = incomeGoal !== '' && clientCapacity !== '' && leadAvailability !== '' && priority.trim().length > 0

  function handleLookingToChange(val: 'hire' | 'freelancer') {
    setLookingTo(val)
  }

  function toggleIndustry(ind: string) {
    setIndustries(prev => {
      if (prev.includes(ind)) return prev.filter(i => i !== ind)
      if (prev.length >= MAX_INDUSTRIES) return prev
      return [...prev, ind]
    })
  }

  function setServiceExperience(service: string, level: string) {
    setServicePricing(prev => ({ ...prev, [service]: { experience: level, hourlyRate: prev[service]?.hourlyRate ?? '' } }))
  }
  function setServiceRate(service: string, rate: string) {
    setServicePricing(prev => ({ ...prev, [service]: { experience: prev[service]?.experience ?? '', hourlyRate: rate } }))
  }

  function togglePlatform(platform: string) {
    setSelectedPlatforms(prev => {
      if (prev.includes(platform)) {
        setSocialUrls(urls => {
          const next = { ...urls }
          delete next[platform]
          return next
        })
        return prev.filter(p => p !== platform)
      }
      return [...prev, platform]
    })
  }
  function setSocialUrl(platform: string, url: string) {
    setSocialUrls(prev => ({ ...prev, [platform]: url }))
  }

  // LinkedIn/Instagram map to their own dedicated profile columns; everything
  // else selected here goes into the generic social_links blob.
  function buildOtherSocialLinks(): Record<string, string> | null {
    const extras: Record<string, string> = {}
    selectedPlatforms.forEach(p => {
      if (p === 'LinkedIn' || p === 'Instagram') return
      const url = socialUrls[p]?.trim()
      if (url) extras[p] = url
    })
    return Object.keys(extras).length > 0 ? extras : null
  }

  function addLocation() {
    const val = locationInput.trim()
    if (!val || locations.includes(val)) { setLocationInput(''); return }
    setLocations(prev => [...prev, val])
    setLocationInput('')
  }
  function removeLocation(loc: string) {
    setLocations(prev => prev.filter(l => l !== loc))
  }
  function handleLocationKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addLocation() }
    else if (e.key === 'Backspace' && locationInput === '' && locations.length > 0) {
      setLocations(prev => prev.slice(0, -1))
    }
  }

  function addService() {
    const val = serviceInput.trim()
    if (!val || services.includes(val) || services.length >= MAX_SERVICES) { setServiceInput(''); return }
    setServices(prev => [...prev, val])
    setServiceInput('')
  }
  function removeService(s: string) {
    setServices(prev => prev.filter(x => x !== s))
  }
  function handleServiceKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addService() }
    else if (e.key === 'Backspace' && serviceInput === '' && services.length > 0) {
      setServices(prev => prev.slice(0, -1))
    }
  }

  const handlePolishPriority = useCallback(async () => {
    if (!priority.trim() || polishingPriority) return
    setPolishingPriority(true)
    try {
      setPriorityOriginal(priority)
      const token = await session?.getToken()
      const polished = await polishWithAI('priority', priority, services.join(', ') || industries.join(', '), token)
      setPriority(polished)
    } catch {
      // silently fail
    } finally {
      setPolishingPriority(false)
    }
  }, [priority, services, industries, polishingPriority, session])

  async function handleFinish() {
    if (!user || !step3Valid) return
    setSaving(true)
    setError(null)

    const token = await session?.getToken()

    const savedProfile = await upsertProfile(user.id, {
      full_name: fullName.trim(),
      looking_to: lookingTo || null,
      industries: industries.length > 0 ? industries : null,
      locations: locations.length > 0 ? locations : null,
      services: services.length > 0 ? services : null,
      service_pricing: Object.keys(servicePricing).length > 0 ? servicePricing : null,
      website_url: website.trim() || null,
      linkedin_url: socialUrls['LinkedIn']?.trim() || null,
      instagram_url: socialUrls['Instagram']?.trim() || null,
      social_links: buildOtherSocialLinks(),
      income_goal: incomeGoal || null,
      client_capacity: clientCapacity || null,
      lead_availability: leadAvailability || null,
      current_focus: priority.trim(),
      onboarding_complete: true,
      email: user.primaryEmailAddress?.emailAddress || null,
    }, token)

    if (!savedProfile) {
      setError('Something went wrong saving your profile. Please try again.')
      setSaving(false)
      return
    }

    await refresh()
    if (onClose) {
      onClose(savedProfile)
    } else {
      navigate('/profile', { replace: true })
    }
  }

  function handleExit() {
    if (onClose) onClose()
    else navigate('/profile')
  }

  const progress = (step / 3) * 100

  return (
    <div className="ow-page">
      <div className="ow-inner">
        <button type="button" className="ow-exit-link" onClick={handleExit}>← Back to profile</button>

        <div className="ow-header">
          <div className="ow-logo">makers klub</div>
          <div className="ow-step-label">Step {step} of 3</div>
        </div>

        <div className="ow-progress-bg">
          <div className="ow-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* ════════════ STEP 1 ════════════ */}
        {step === 1 && (
          <div className="ow-card">
            <h1 className="ow-heading">Who are you?</h1>
            <p className="ow-sub">This is how you'll appear to other members.</p>

            <div className="ow-fields">
              <div className="mkw-form-group">
                <label className="mkw-form-label">Full name <span className="ow-req">*</span></label>
                <input
                  className="mkw-form-input"
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your name"
                  autoFocus
                />
              </div>

              <div className="mkw-form-group">
                <label className="mkw-form-label">Are you looking to <span className="ow-req">*</span></label>
                <div className="ow-tech-chips">
                  {([
                    { value: 'hire' as const, label: 'Hire' },
                    { value: 'freelancer' as const, label: 'Provide service (freelancer)' },
                  ]).map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`ow-tech-chip ${lookingTo === opt.value ? 'ow-tech-chip-selected' : ''}`}
                      onClick={() => handleLookingToChange(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mkw-form-group">
                <label className="mkw-form-label">Choose 3 industries you have experience working in <span className="ow-req">*</span></label>
                <div className="ow-goal-grid">
                  {INDUSTRIES.map(ind => {
                    const selected = industries.includes(ind)
                    const disabled = !selected && industries.length >= MAX_INDUSTRIES
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
                <label className="mkw-form-label">Choose the locations you are available to work in <span className="ow-req">*</span></label>
                <div className="ow-hint" style={{ marginBottom: 6 }}>P.S We only recommend you to businesses in your area</div>
                <div className="ow-tag-input-box">
                  {locations.map(loc => (
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
                    placeholder={locations.length === 0 ? 'e.g. Berlin, Remote…' : ''}
                  />
                </div>
              </div>

              <div className="mkw-form-group">
                <label className="mkw-form-label">List 5 primary services you offer <span className="ow-req">*</span></label>
                <div className="ow-tag-input-box">
                  {services.map(s => (
                    <span key={s} className="ow-tag-chip">
                      {s}
                      <button type="button" className="ow-tag-remove" onClick={() => removeService(s)}>×</button>
                    </span>
                  ))}
                  {services.length < MAX_SERVICES && (
                    <input
                      className="ow-tag-input"
                      type="text"
                      value={serviceInput}
                      onChange={e => setServiceInput(e.target.value)}
                      onKeyDown={handleServiceKeyDown}
                      onBlur={addService}
                      placeholder={services.length === 0 ? 'e.g. Logo design, Brand strategy…' : ''}
                    />
                  )}
                </div>
                <div className="ow-field-footer">
                  <span className="ow-char-count">{services.length} / {MAX_SERVICES}</span>
                </div>
              </div>
            </div>

            <button className="mk-btn mk-btn-primary ow-cta" onClick={() => setStep(2)} disabled={!step1Valid}>
              Continue →
            </button>
          </div>
        )}

        {/* ════════════ STEP 2 ════════════ */}
        {step === 2 && (
          <div className="ow-card">
            <h1 className="ow-heading">Price your services</h1>
            <p className="ow-sub">
              Set an approximate rate for each service so we can match you with the right budget.
            </p>

            <div className="ow-pricing-rows">
              {services.map(service => (
                <div key={service} className="ow-pricing-row">
                  <span className="ow-pricing-service">{service}</span>
                  <select
                    className="mkw-form-select ow-pricing-select"
                    value={servicePricing[service]?.experience || ''}
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
                      value={servicePricing[service]?.hourlyRate || ''}
                      onChange={e => setServiceRate(service, e.target.value)}
                      placeholder="45"
                    />
                    <span className="ow-pricing-rate-suffix">€/hr</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="ow-fields" style={{ marginTop: 24 }}>
              <div className="mkw-form-group">
                <label className="mkw-form-label">Portfolio link <span className="ow-req">*</span></label>
                <input
                  className="mkw-form-input"
                  type="text"
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://yourportfolio.com"
                />
              </div>

              <div className="mkw-form-group">
                <label className="mkw-form-label">Social links <span className="ow-skills-optional">(optional)</span></label>
                <div className="ow-goal-grid">
                  {SOCIAL_PLATFORMS.map(platform => (
                    <button
                      key={platform}
                      type="button"
                      className={`ow-goal-chip ${selectedPlatforms.includes(platform) ? 'ow-goal-chip-selected' : ''}`}
                      onClick={() => togglePlatform(platform)}
                    >
                      {platform}
                    </button>
                  ))}
                </div>

                {selectedPlatforms.length > 0 && (
                  <div className="ow-social-url-list">
                    {selectedPlatforms.map(platform => (
                      <input
                        key={platform}
                        className="mkw-form-input"
                        type="text"
                        value={socialUrls[platform] || ''}
                        onChange={e => setSocialUrl(platform, e.target.value)}
                        placeholder={`${platform} URL`}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="ow-nav-row">
              <button className="mk-btn mk-btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="mk-btn mk-btn-primary ow-cta" onClick={() => setStep(3)} disabled={!step2Valid}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* ════════════ STEP 3 ════════════ */}
        {step === 3 && (
          <div className="ow-card">
            <h1 className="ow-heading">Your business goals</h1>
            <p className="ow-sub">This helps us match you with the right opportunities.</p>

            <div className="ow-fields">
              <div className="mkw-form-group">
                <label className="mkw-form-label">Where are you currently focusing your income goals? <span className="ow-req">*</span></label>
                <div className="ow-option-list">
                  {INCOME_GOAL_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`ow-option-card ${incomeGoal === opt.value ? 'ow-option-card-selected' : ''}`}
                      onClick={() => setIncomeGoal(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mkw-form-group">
                <label className="mkw-form-label">How many long-term retainer clients can you realistically balance? <span className="ow-req">*</span></label>
                <div className="ow-option-list">
                  {CLIENT_CAPACITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`ow-option-card ${clientCapacity === opt.value ? 'ow-option-card-selected' : ''}`}
                      onClick={() => setClientCapacity(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mkw-form-group">
                <label className="mkw-form-label">What is your current availability for new project leads? <span className="ow-req">*</span></label>
                <div className="ow-option-list">
                  {LEAD_AVAILABILITY_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      className={`ow-option-card ${leadAvailability === opt.value ? 'ow-option-card-selected' : ''}`}
                      onClick={() => setLeadAvailability(opt.value)}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mkw-form-group">
                <label className="mkw-form-label">What is your biggest challenge right now? <span className="ow-req">*</span></label>
                <textarea
                  className="mkw-form-textarea"
                  value={priority}
                  onChange={e => { setPriority(e.target.value); setPriorityOriginal(null) }}
                  placeholder="e.g. Land 2 new retainer clients by Q3, or ship my first SaaS product"
                  rows={3}
                  maxLength={200}
                />
                <div className="ow-field-footer">
                  <span className="ow-char-count">{priority.length} / 200</span>
                  {priority.trim().length > 10 && (
                    <div className="ow-ai-row">
                      {priorityOriginal !== null && (
                        <button type="button" className="ow-revert-btn" onClick={() => { setPriority(priorityOriginal); setPriorityOriginal(null) }}>
                          ↩ Revert
                        </button>
                      )}
                      <button
                        type="button"
                        className="ow-polish-btn"
                        onClick={handlePolishPriority}
                        disabled={polishingPriority}
                      >
                        {polishingPriority ? '✦ Writing…' : '✦ Write with AI'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {error && <div className="ow-error">{error}</div>}

            <div className="ow-nav-row">
              <button className="mk-btn mk-btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="mk-btn mk-btn-primary ow-cta" onClick={handleFinish} disabled={!step3Valid || saving}>
                {saving ? 'Saving…' : 'Save profile →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
