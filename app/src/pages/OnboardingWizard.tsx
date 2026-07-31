import { useState, useCallback, type KeyboardEvent } from 'react'
import { useUser, useSession } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { upsertProfile, setProfileGoals } from '../supabase'
import { useKlub } from '../KlubContext'
import './OnboardingWizard.css'

// ── Industry options ──
const INDUSTRIES = [
  'Advertising & Marketing',
  'Architecture & Interior Design',
  'Consulting & Strategy',
  'Design & Creative',
  'Education & Training',
  'Fashion & Lifestyle',
  'Finance & Fintech',
  'Health & Wellness',
  'Media & Publishing',
  'Music & Audio',
  'Photography & Film',
  'Technology & Engineering',
  'E-commerce & Retail',
  'Other',
]

// ── Skill definitions ──
const TECH_SKILLS = [
  'Design tools (Figma / Adobe)',
  'Web or app development',
  'No-code & automation',
  'Video & photo editing',
  'Data & analytics',
  'AI tools & prompting',
]

const BUSINESS_SKILLS = [
  'Client acquisition & sales',
  'Project management',
  'Copywriting & content',
  'Public speaking & pitching',
  'Finance & budgeting',
  'Social media & marketing',
]

// ── All possible goals ──
const ALL_GOALS = [
  'Land new clients',
  'Find freelance projects',
  'Get hired full-time',
  'Find a co-founder',
  'Find collaborators for a project',
  'Give or receive mentorship',
  'Learn from peers in my field',
  'Get feedback on my work',
  'Build my reputation in Berlin',
  'Meet like-minded people',
  'Expand my professional network',
  'Find my next event or community',
  'Other',
]

// Goals to exclude based on whether the person is looking to hire or offer services.
const GOAL_EXCLUSIONS: Record<'hire' | 'freelancer', string[]> = {
  hire: ['Get hired full-time', 'Find freelance projects'],
  freelancer: ['Get hired full-time', 'Find a co-founder'],
}

function getFilteredGoals(lookingTo: 'hire' | 'freelancer' | ''): string[] {
  if (!lookingTo) return ALL_GOALS
  const excluded = new Set(GOAL_EXCLUSIONS[lookingTo])
  return ALL_GOALS.filter(g => !excluded.has(g))
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

const MAX_GOALS = 3
const MAX_INDUSTRIES = 3
const MAX_SERVICES = 5

export default function OnboardingWizard() {
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
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [customGoal, setCustomGoal] = useState('')

  // Step 3
  const [priority, setPriority] = useState(profile?.current_focus || '')
  const [polishingPriority, setPolishingPriority] = useState(false)
  const [priorityOriginal, setPriorityOriginal] = useState<string | null>(null)
  const [skills, setSkills] = useState<Record<string, number>>({})

  const step1Valid = fullName.trim().length > 0 && lookingTo !== '' && industries.length > 0 && locations.length > 0 && services.length > 0
  const step2Valid = selectedGoals.length > 0 && (selectedGoals.includes('Other') ? customGoal.trim().length > 0 : true)
  const step3Valid = priority.trim().length > 0

  const filteredGoals = getFilteredGoals(lookingTo)

  function toggleGoal(goal: string) {
    setSelectedGoals(prev => {
      if (prev.includes(goal)) return prev.filter(g => g !== goal)
      if (prev.length >= MAX_GOALS) return prev
      return [...prev, goal]
    })
  }

  function handleLookingToChange(val: 'hire' | 'freelancer') {
    setLookingTo(val)
    const nowFiltered = getFilteredGoals(val)
    setSelectedGoals(prev => prev.filter(g => nowFiltered.includes(g)))
  }

  function toggleIndustry(ind: string) {
    setIndustries(prev => {
      if (prev.includes(ind)) return prev.filter(i => i !== ind)
      if (prev.length >= MAX_INDUSTRIES) return prev
      return [...prev, ind]
    })
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

  function setSkillRating(skill: string, rating: number) {
    setSkills(prev => ({ ...prev, [skill]: rating }))
  }

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
      current_focus: priority.trim(),
      skills: Object.keys(skills).length > 0 ? skills : null,
      onboarding_complete: true,
      email: user.primaryEmailAddress?.emailAddress || null,
    }, token)

    if (!savedProfile) {
      setError('Something went wrong saving your profile. Please try again.')
      setSaving(false)
      return
    }

    const resolvedGoals = selectedGoals.map(g => g === 'Other' ? customGoal.trim() : g)
    const isCustom = selectedGoals.map(g => g === 'Other')
    await setProfileGoals(savedProfile.id, resolvedGoals, isCustom, token)

    await refresh()
    navigate('/home', { replace: true })
  }

  const progress = (step / 3) * 100

  return (
    <div className="ow-page">
      <div className="ow-inner">
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
            <h1 className="ow-heading">What are your goals for the next 3 months?</h1>
            <p className="ow-sub">Pick up to {MAX_GOALS}. We use this to surface the right connections.</p>

            <div className="ow-goal-grid">
              {filteredGoals.map(goal => {
                const selected = selectedGoals.includes(goal)
                const disabled = !selected && selectedGoals.length >= MAX_GOALS
                return (
                  <button
                    key={goal}
                    type="button"
                    className={`ow-goal-chip ${selected ? 'ow-goal-chip-selected' : ''} ${disabled ? 'ow-goal-chip-disabled' : ''}`}
                    onClick={() => toggleGoal(goal)}
                    disabled={disabled}
                  >
                    {goal}
                  </button>
                )
              })}
            </div>

            {selectedGoals.includes('Other') && (
              <div className="mkw-form-group" style={{ marginTop: 12 }}>
                <input
                  className="mkw-form-input"
                  type="text"
                  value={customGoal}
                  onChange={e => setCustomGoal(e.target.value)}
                  placeholder="Describe what you're looking for…"
                  maxLength={80}
                />
              </div>
            )}

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
            <h1 className="ow-heading">Almost there</h1>
            <p className="ow-sub">Two quick things to help us match you with the right people and events.</p>

            <div className="ow-fields">
              <div className="mkw-form-group">
                <label className="mkw-form-label">What is your biggest challenge right now? <span className="ow-req">*</span></label>
                <textarea
                  className="mkw-form-textarea"
                  value={priority}
                  onChange={e => { setPriority(e.target.value); setPriorityOriginal(null) }}
                  placeholder="e.g. Land 2 new retainer clients by Q3, or ship my first SaaS product"
                  rows={3}
                  maxLength={200}
                  autoFocus
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

            <div className="ow-skills-block">
              <div className="ow-skills-block-label">Rate your skills <span className="ow-skills-optional">(optional)</span></div>
              <p className="ow-skills-hint">Tap a dot to rate yourself. We use this to surface the right collaborators.</p>

              <div className="ow-skill-section">
                <div className="ow-skill-section-label">Tech skills</div>
                {TECH_SKILLS.map(skill => (
                  <div key={skill} className="ow-skill-row">
                    <span className="ow-skill-name">{skill}</span>
                    <div className="ow-skill-dots">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type="button"
                          className={`ow-dot ${(skills[skill] ?? 0) >= n ? 'ow-dot-filled' : ''}`}
                          onClick={() => setSkillRating(skill, skills[skill] === n ? 0 : n)}
                          aria-label={`Rate ${skill} ${n} out of 5`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="ow-skill-section">
                <div className="ow-skill-section-label">Business skills</div>
                {BUSINESS_SKILLS.map(skill => (
                  <div key={skill} className="ow-skill-row">
                    <span className="ow-skill-name">{skill}</span>
                    <div className="ow-skill-dots">
                      {[1, 2, 3, 4, 5].map(n => (
                        <button
                          key={n}
                          type="button"
                          className={`ow-dot ${(skills[skill] ?? 0) >= n ? 'ow-dot-filled' : ''}`}
                          onClick={() => setSkillRating(skill, skills[skill] === n ? 0 : n)}
                          aria-label={`Rate ${skill} ${n} out of 5`}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {error && <div className="ow-error">{error}</div>}

            <div className="ow-nav-row">
              <button className="mk-btn mk-btn-ghost" onClick={() => setStep(2)}>← Back</button>
              <button className="mk-btn mk-btn-primary ow-cta" onClick={handleFinish} disabled={!step3Valid || saving}>
                {saving ? 'Setting up…' : 'Enter Makers Klub →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
