import { useEffect, useRef, useState } from 'react'
import { useUser, useSession } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { upsertProfile, type Profile } from '../supabase'
import { useKlub } from '../KlubContext'
import {
  INDUSTRIES,
  INCOME_GOAL_OPTIONS, CLIENT_CAPACITY_OPTIONS, LEAD_AVAILABILITY_OPTIONS,
} from '../profileOptions'
import './OnboardingWizard.css'

type OnboardingWizardProps = {
  // When provided (rendered as a modal from the Profile page), the wizard
  // calls this instead of navigating — passes the saved profile on finish,
  // or nothing when just backing out.
  onClose?: (savedProfile?: Profile) => void
}

function MultiSelectDropdown({
  options, selected, onToggle, placeholder,
}: {
  options: string[]
  selected: string[]
  onToggle: (option: string) => void
  placeholder: string
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  return (
    <div className="ow-multiselect" ref={ref}>
      <div
        className="ow-multiselect-trigger"
        role="button"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o) } }}
      >
        {selected.length === 0 ? (
          <span className="ow-multiselect-placeholder">{placeholder}</span>
        ) : (
          <div className="ow-multiselect-chips">
            {selected.map(item => (
              <span key={item} className="ow-tag-chip">
                {item}
                <button type="button" className="ow-tag-remove" onClick={e => { e.stopPropagation(); onToggle(item) }}>×</button>
              </span>
            ))}
          </div>
        )}
        <span className={`ow-multiselect-caret ${open ? 'ow-multiselect-caret-open' : ''}`}>▾</span>
      </div>

      {open && (
        <div className="ow-multiselect-panel">
          {options.map(opt => {
            const isSelected = selected.includes(opt)
            return (
              <button
                key={opt}
                type="button"
                className={`ow-multiselect-option ${isSelected ? 'ow-multiselect-option-selected' : ''}`}
                onClick={() => onToggle(opt)}
              >
                <span className="ow-multiselect-checkbox">{isSelected ? '✓' : ''}</span>
                {opt}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
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

  // Step 2
  const [incomeGoal, setIncomeGoal] = useState(profile?.income_goal || '')
  const [clientCapacity, setClientCapacity] = useState(profile?.client_capacity || '')
  const [leadAvailability, setLeadAvailability] = useState(profile?.lead_availability || '')

  const step1Valid = fullName.trim().length > 0 && lookingTo !== '' && industries.length > 0
  const step2Valid = incomeGoal !== '' && clientCapacity !== '' && leadAvailability !== ''

  function handleLookingToChange(val: 'hire' | 'freelancer') {
    setLookingTo(val)
  }

  function toggleIndustry(ind: string) {
    setIndustries(prev => prev.includes(ind) ? prev.filter(i => i !== ind) : [...prev, ind])
  }

  async function handleFinish() {
    if (!user || !step2Valid) return
    setSaving(true)
    setError(null)

    const token = await session?.getToken()

    const savedProfile = await upsertProfile(user.id, {
      full_name: fullName.trim(),
      looking_to: lookingTo || null,
      industries: industries.length > 0 ? industries : null,
      income_goal: incomeGoal || null,
      client_capacity: clientCapacity || null,
      lead_availability: leadAvailability || null,
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

  const progress = (step / 2) * 100

  return (
    <div className="ow-page">
      <div className="ow-inner">
        <button type="button" className="ow-exit-link" onClick={handleExit}>← Back to profile</button>

        <div className="ow-header">
          <div className="ow-logo">makers klub</div>
          <div className="ow-step-label">Step {step} of 2</div>
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
                <label className="mkw-form-label">Choose the industries you have experience working in <span className="ow-req">*</span></label>
                <MultiSelectDropdown
                  options={INDUSTRIES}
                  selected={industries}
                  onToggle={toggleIndustry}
                  placeholder="Select industries…"
                />
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
            </div>

            {error && <div className="ow-error">{error}</div>}

            <div className="ow-nav-row">
              <button className="mk-btn mk-btn-ghost" onClick={() => setStep(1)}>← Back</button>
              <button className="mk-btn mk-btn-primary ow-cta" onClick={handleFinish} disabled={!step2Valid || saving}>
                {saving ? 'Saving…' : 'Save profile →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
