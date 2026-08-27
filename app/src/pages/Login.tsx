import { useState, useEffect } from 'react'
import { useSignIn, useAuth } from '@clerk/clerk-react'
import { useNavigate } from 'react-router-dom'
import { supabase, getInitials, type Event, type Profile } from '../supabase'
import './Signup.css'

function formatEventWhen(dateStr: string): string {
  const d = new Date(dateStr)
  const day = d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

export default function Login() {
  const { isLoaded, signIn, setActive } = useSignIn()
  const { isSignedIn } = useAuth()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const [events, setEvents]     = useState<Event[]>([])
  const [profiles, setProfiles] = useState<Profile[]>([])

  useEffect(() => {
    if (isLoaded && isSignedIn) navigate('/home', { replace: true })
  }, [isLoaded, isSignedIn])

  // Public teaser content — same open-SELECT tables the PWA landing reads.
  useEffect(() => {
    (async () => {
      const [{ data: eventRows }, { data: profileRows }] = await Promise.all([
        supabase.from('events').select('*').order('date'),
        supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      ])
      const now = new Date()
      setEvents((eventRows ?? []).filter(e => new Date(e.date) >= now).slice(0, 5))
      setProfiles((profileRows ?? []).slice(0, 5))
    })()
  }, [])

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
      } else if (result.status === 'needs_second_factor') {
        setError('This account has two-factor authentication enabled, which this sign-in form doesn\'t support yet. Please contact support.')
      } else if (result.status === 'needs_new_password') {
        setError('Your password needs to be reset before you can sign in. Please contact support.')
      } else {
        // Surface the raw status so an unexpected case is diagnosable instead
        // of a dead-end generic message.
        setError(`Sign in incomplete (${result.status}). Please try again or contact support.`)
      }
    } catch (err: any) {
      setError(err.errors?.[0]?.longMessage ?? err.message ?? 'Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mkw-login mkw-login-landing">
      {/* Brand */}
      <div className="mkw-login-brand">
        <div className="mkw-brand-logo">
          <img src="logo.svg" alt="Makers Klub" />
        </div>
        <span className="mkw-login-name">Makers Klub</span>
      </div>
      <p className="mkw-login-tagline">Build connections that matter</p>

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

      {/* Live teaser — who's in the Klub and what's coming up */}
      {(profiles.length > 0 || events.length > 0) && (
        <div className="mkw-teaser">
          {profiles.length > 0 && (
            <div className="mkw-teaser-section">
              <div className="mkw-teaser-label">Who's Attending</div>
              <div className="mkw-teaser-list">
                {profiles.map(p => (
                  <div key={p.clerk_user_id} className="mkw-teaser-row">
                    <div className="mkw-teaser-av" style={{ background: p.avatar_color || '#0f1e3d' }}>
                      {getInitials(p.full_name)}
                    </div>
                    <div className="mkw-teaser-info">
                      <div className="mkw-teaser-name">{p.full_name || 'Member'}</div>
                      {p.role_category && <div className="mkw-teaser-role">{p.role_category}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {events.length > 0 && (
            <div className="mkw-teaser-section">
              <div className="mkw-teaser-label">Popular Events in Berlin</div>
              <div className="mkw-teaser-list">
                {events.map(e => (
                  <div key={e.id} className="mkw-teaser-row">
                    <div className="mkw-teaser-thumb" style={{ background: e.cover_color || '#0f1e3d' }} />
                    <div className="mkw-teaser-info">
                      <div className="mkw-teaser-name">{e.title}</div>
                      <div className="mkw-teaser-role">{formatEventWhen(e.date)} · {e.location}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
