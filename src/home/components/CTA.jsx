import { useState } from 'react'
import './CTA.css'

export default function CTA() {
  const [submitted, setSubmitted] = useState(false)

  function handleSubmit(e) {
    e.preventDefault()
    setSubmitted(true)
  }

  return (
    <section className="sc-cta-final on-navy" id="join">
      <p className="eyebrow sc-cta-eyebrow">Membership</p>
      <h2 className="h-xl">
        Ready to build a network
        <br />
        that <em>actually works?</em>
      </h2>
      <p className="body-copy sc-cta-desc">
        Join the waitlist. We'll reach out personally when spots open in Berlin. No spam, no
        newsletters — just a direct invite.
      </p>

      {!submitted ? (
        <>
          <form className="sc-cta-form" onSubmit={handleSubmit}>
            <input type="email" placeholder="your@email.com" required />
            <button type="submit" className="btn-solid">Join the Waitlist →</button>
          </form>
          <p className="sc-cta-note">No spam. No credit card. Just your spot in the queue.</p>
        </>
      ) : (
        <div className="sc-success-message">
          <h3>You're on the list</h3>
          <p>We'll be in touch personally when a spot opens. Keep doing great work.</p>
        </div>
      )}
    </section>
  )
}
