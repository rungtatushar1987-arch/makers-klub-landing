import { useState } from 'react'
import './Newsletter.css'
import { NEWSLETTER } from '../content'

// Landing from the confirmation email: /?newsletter=confirmed#newsletter
function initialNotice() {
  const flag = new URLSearchParams(window.location.search).get('newsletter')
  if (flag === 'confirmed') return { kind: 'ok', text: NEWSLETTER.confirmed }
  if (flag === 'invalid' || flag === 'error') return { kind: 'error', text: NEWSLETTER.invalid }
  return null
}

export default function Newsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('idle') // idle | sending
  const [notice, setNotice] = useState(initialNotice)

  async function onSubmit(e) {
    e.preventDefault()
    if (status === 'sending') return
    setStatus('sending')
    setNotice(null)
    try {
      const res = await fetch('/api/newsletter-subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Something went wrong. Please try again.')
      setNotice({ kind: 'ok', text: NEWSLETTER.confirmationSent })
      setEmail('')
    } catch (err) {
      setNotice({ kind: 'error', text: err.message })
    } finally {
      setStatus('idle')
    }
  }

  return (
    <section className="sc-news" id="newsletter">
      <div className="sc-news-inner">
        <div>
          <div className="sc-mast-label">
            <span className="sc-mast-eyebrow">{NEWSLETTER.eyebrow}</span>
          </div>
          <h2 className="h-xl sc-news-title">{NEWSLETTER.title}</h2>
          {NEWSLETTER.body && <p className="body-copy">{NEWSLETTER.body}</p>}
        </div>
        <form className="sc-news-form" onSubmit={onSubmit}>
          <label className="sc-news-label" htmlFor="sc-news-email">Email</label>
          <div className="sc-news-row">
            <input
              id="sc-news-email"
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button type="submit" className="btn-solid" disabled={status === 'sending'}>
              {status === 'sending' ? 'Sending…' : 'Subscribe →'}
            </button>
          </div>
          <label className="sc-news-consent">
            <input type="checkbox" name="consent" required />
            <span>{NEWSLETTER.consent}</span>
          </label>
          {notice && (
            <p className="sc-news-notice" data-kind={notice.kind} role="status">{notice.text}</p>
          )}
        </form>
      </div>
    </section>
  )
}
