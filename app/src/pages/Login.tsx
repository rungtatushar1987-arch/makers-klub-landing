import { useState, useEffect } from 'react'
import { useSignIn, useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import './Signup.css'

export default function Login() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const { isSignedIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    if (isLoaded && isSignedIn) navigate('/home', { replace: true })
  }, [isLoaded, isSignedIn])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!isLoaded) return
    setError('')
    setLoading(true)

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      })

      if (result.status === 'complete') {
        await setActive({ session: result.createdSessionId })
        navigate('/home')
      } else {
        setError('Sign in incomplete. Please try again.')
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage ?? err.message ?? 'Invalid email or password.')
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
        <div className="mkw-signup-head">
          <p className="mkw-signup-eyebrow">Welcome back</p>
          <h1 className="mkw-signup-title">Sign in</h1>
          <p className="mkw-signup-sub">No account? <a href="/signup">Create one</a></p>
        </div>

        <form onSubmit={handleSubmit} className="mkw-signup-form">
          <div className="mkw-form-group">
            <label className="mkw-form-label">Email</label>
            <input
              className="mkw-form-input"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div className="mkw-form-group">
            <label className="mkw-form-label">Password</label>
            <input
              className="mkw-form-input"
              type="password"
              placeholder="Your password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="mkw-signup-error">{error}</p>}

          <button
            type="submit"
            className="mk-btn mk-btn-ochre mk-btn-lg mkw-signup-submit"
            disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in →'}
          </button>
        </form>
      </div>
    </div>
  )
}
