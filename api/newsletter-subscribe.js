import { createClient } from '@supabase/supabase-js'
import { mailerConfigured, sendMail, confirmEmail } from './_mailer.js'

const SITE_URL = process.env.SITE_URL || 'https://www.thesoloprenuers.club'
const RESEND_COOLDOWN_MS = 60 * 1000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const email = String((req.body && req.body.email) || '').trim().toLowerCase()
  if (!EMAIL_RE.test(email) || email.length > 254) {
    return res.status(400).json({ error: 'Please enter a valid email address.' })
  }

  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !mailerConfigured()) {
    console.error('newsletter-subscribe: missing SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, GMAIL_USER or GMAIL_APP_PASSWORD')
    return res.status(500).json({ error: 'Signup is not available right now.' })
  }

  try {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    })

    const { data: existing, error: readError } = await supabase
      .from('newsletter_subscribers')
      .select('status, token, last_sent_at')
      .eq('email', email)
      .maybeSingle()
    if (readError) throw readError

    // Already confirmed, or a confirmation went out a moment ago: answer the same way, send nothing.
    if (existing && existing.status === 'confirmed') return res.status(200).json({ success: true })
    if (existing && existing.last_sent_at && Date.now() - new Date(existing.last_sent_at).getTime() < RESEND_COOLDOWN_MS) {
      return res.status(200).json({ success: true })
    }

    let token = existing && existing.token
    if (!existing) {
      const { data: created, error: insertError } = await supabase
        .from('newsletter_subscribers')
        .insert({ email })
        .select('token')
        .single()
      if (insertError) throw insertError
      token = created.token
    }

    const link = `${SITE_URL}/api/newsletter-confirm?token=${encodeURIComponent(token)}`
    try {
      await sendMail({ to: email, ...confirmEmail(link) })
    } catch (mailError) {
      console.error('newsletter-subscribe: email failed', mailError)
      return res.status(502).json({ error: 'We could not send the confirmation email. Please try again.' })
    }

    await supabase.from('newsletter_subscribers').update({ last_sent_at: new Date().toISOString() }).eq('email', email)
    return res.status(200).json({ success: true })
  } catch (err) {
    console.error('newsletter-subscribe:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
