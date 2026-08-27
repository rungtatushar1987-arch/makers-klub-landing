import { useState } from 'react'
import { useUser, useSession } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { upsertProfile, type Profile } from '../supabase'
import { useKlub } from '../KlubContext'
import { INTERESTS, LOOKING_FOR_OPTIONS } from '../profileOptions'
import MultiSelectDropdown from '../components/MultiSelectDropdown'
import './OnboardingWizard.css'

type OnboardingWizardProps = {
  // When provided (rendered as a modal from the Profile page), the wizard
  // calls this instead of navigating — passes the saved profile on finish,
  // or nothing when just backing out.
  onClose?: (savedProfile?: Profile) => void
}

export default function OnboardingWizard({ onClose }: OnboardingWizardProps = {}) {
  const { user } = useUser()
  const { session } = useSession()
  const navigate = useNavigate()
  const { profile, refresh } = useKlub()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [roleCategory, setRoleCategory] = useState(profile?.role_category || '')
  const [bio, setBio] = useState(profile?.bio || '')
  const [interests, setInterests] = useState<string[]>(profile?.industries || [])
  const [lookingTo, setLookingTo] = useState(profile?.looking_to || '')

  const valid =
    roleCategory.trim().length > 0 &&
    bio.trim().length > 0 &&
    interests.length > 0 &&
    lookingTo !== ''

  function toggleInterest(interest: string) {
    setInterests(prev => prev.includes(interest) ? prev.filter(i => i !== interest) : [...prev, interest])
  }

  async function handleFinish() {
    if (!user || !valid || saving) return
    setSaving(true)
    setError(null)

    const token = await session?.getToken()

    const savedProfile = await upsertProfile(user.id, {
      role_category: roleCategory.trim(),
      bio: bio.trim(),
      industries: interests,
      looking_to: lookingTo,
      full_name: profile?.full_name || user.fullName || '',
      email: profile?.email || user.primaryEmailAddress?.emailAddress || null,
      onboarding_complete: true,
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

  return (
    <div className="ow-page">
      <div className="ow-inner">
        <button type="button" className="ow-exit-link" onClick={handleExit}>← Back to profile</button>

        <div className="ow-header">
          <div className="ow-logo">makers klub</div>
        </div>

        <div className="ow-card">
          <h1 className="ow-heading">Welcome — let's set you up</h1>
          <p className="ow-sub">A few quick things so other members know who you are.</p>

          <div className="ow-fields">
            <div className="mkw-form-group">
              <label className="mkw-form-label">Role <span className="ow-req">*</span></label>
              <input
                className="mkw-form-input"
                type="text"
                value={roleCategory}
                onChange={e => setRoleCategory(e.target.value)}
                placeholder="e.g. Brand strategist, UX designer, Motion designer…"
                maxLength={60}
                autoFocus
              />
            </div>

            <div className="mkw-form-group">
              <label className="mkw-form-label">One-line bio <span className="ow-req">*</span></label>
              <input
                className="mkw-form-input"
                type="text"
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="What you do + what you're working on right now"
              />
            </div>

            <div className="mkw-form-group">
              <label className="mkw-form-label">Interests <span className="ow-req">*</span></label>
              <MultiSelectDropdown
                options={INTERESTS}
                selected={interests}
                onToggle={toggleInterest}
                placeholder="Select your interests…"
              />
            </div>

            <div className="mkw-form-group">
              <label className="mkw-form-label">What are you looking for? <span className="ow-req">*</span></label>
              <div className="ow-option-list">
                {LOOKING_FOR_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    className={`ow-option-card ${lookingTo === opt.value ? 'ow-option-card-selected' : ''}`}
                    onClick={() => setLookingTo(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && <div className="ow-error">{error}</div>}

          <button className="mk-btn mk-btn-primary ow-cta" onClick={handleFinish} disabled={!valid || saving}>
            {saving ? 'Saving…' : "Let's go →"}
          </button>
        </div>
      </div>
    </div>
  )
}
