import { useState, useEffect } from 'react'
import { useSignUp } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import './Signup.css'

type Step = 'details' | 'verify'

export default function Signup() {
  const { isLoaded, signUp, setActive } = useSignUp()
  const navigate = useNavigate()

  // Pick up the Clerk invite ticket from the URL if present
  const ticket = new URLSearchParams(window.location.search).get('__clerk_ticket') ?? undefined

  const [step, setStep] = useState<Step>('details')

  // Step 1 fields
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName]   = useState('')
  const [email, setEmail]         = useState('')
  const [password, setPassword]   = useState('')

  // When loaded with a ticket, Clerk pre-populates signUp.emailAddress — use it
  useEffect(() => {
    if (isLoaded && ticket && signUp?.emailAddress) {
      setEmail(signUp.emailAddress)
    }
  }, [isLoaded, ticket, signUp?.emailAddress])

  // Step 2 field
  const [code, setCode] = useState('')

  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)

  // ── Step 1: create the sign-up ──────────────────────────────────────────
  async function handleDetails(e: React.FormEvent) {
    e.preventDefault()
    if (!isLoaded) return
    setError('')
    setLoading(true)

    try {
      await signUp.create({
        firstName,
        lastName,
        emailAddress: email,
        password,
        ...(ticket ? { ticket } : {}),
      })

      // Send email verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' })
      setStep('verify')
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage ?? err.message ?? 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  // ── Step 2: verify the email code ───────────────────────────────────────
  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!isLoaded) return
    setError('')
    setLoading(true)

    try {
      const result = await signUp.attemptEmailAddressVerification({ code })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        navigate('/home')
      } else {
        setError('Verification incomplete. Please try again.')
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage ?? err.message ?? 'Invalid code.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mkw-login">
      {/* Brand */}
      <div className="mkw-login-brand">
        <img src="/logo.svg" alt="Makers Klub" className="mkw-login-logo" />
        <span className="mkw-login-name">Makers Klub</span>
      </div>

      {/* Card */}
      <div className="mkw-signup-card">

        {step === 'details' && (
          <>
            <div className="mkw-signup-head">
              <p className="mkw-signup-eyebrow">Join the platform</p>
              <h1 className="mkw-signup-title">Create your account</h1>
              <p className="mkw-signup-sub">Already have one? <a href="/login">Sign in</a></p>
            </div>

            <form onSubmit={handleDetails} className="mkw-signup-form">
              <div className="mkw-signup-row">
                <div className="mkw-form-group">
                  <label className="mkw-form-label">First name</label>
                  <input
                    className="mkw-form-input"
                    type="text"
                    placeholder="Ada"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
                <div className="mkw-form-group">
                  <label className="mkw-form-label">Last name</label>
                  <input
                    className="mkw-form-input"
                    type="text"
                    placeholder="Lovelace"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="mkw-form-group">
                <label className="mkw-form-label">Email</label>
                <input
                  className="mkw-form-input"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={!!ticket}
                  style={ticket ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                />
              </div>

              <div className="mkw-form-group">
                <label className="mkw-form-label">Password</label>
                <input
                  className="mkw-form-input"
                  type="password"
                  placeholder="8+ characters"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={8}
                />
              </div>

              {error && <p className="mkw-signup-error">{error}</p>}

              <button
                type="submit"
                className="mk-btn mk-btn-ochre mk-btn-lg mkw-signup-submit"
                disabled={loading}
              >
                {loading ? 'Creating account…' : 'Continue →'}
              </button>
            </form>
          </>
        )}

        {step === 'verify' && (
          <>
            <div className="mkw-signup-head">
              <p className="mkw-signup-eyebrow">One more step</p>
              <h1 className="mkw-signup-title">Check your email</h1>
              <p className="mkw-signup-sub">
                We sent a 6-digit code to <strong>{email}</strong>
              </p>
            </div>

            <form onSubmit={handleVerify} className="mkw-signup-form">
              <div className="mkw-form-group">
                <label className="mkw-form-label">Verification code</label>
                <input
                  className="mkw-form-input mkw-code-input"
                  type="text"
                  inputMode="numeric"
                  placeholder="000000"
                  value={code}
                  onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  required
                  autoFocus
                  maxLength={6}
                />
              </div>

              {error && <p className="mkw-signup-error">{error}</p>}

              <button
                type="submit"
                className="mk-btn mk-btn-ochre mk-btn-lg mkw-signup-submit"
                disabled={loading || code.length < 6}
              >
                {loading ? 'Verifying…' : 'Verify & enter →'}
              </button>

              <button
                type="button"
                className="mkw-signup-resend"
                onClick={async () => {
                  setError('')
                  try {
                    await signUp?.prepareEmailAddressVerification({ strategy: 'email_code' })
                  } catch (err: any) {
                    setError(err.errors?.[0]?.longMessage ?? 'Could not resend code.')
                  }
                }}
              >
                Resend code
              </button>
            </form>
          </>
        )}

      </div>
    </div>
  )
}
