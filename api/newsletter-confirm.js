import { createClient } from '@supabase/supabase-js'
import { mailerConfigured, sendMail, confirmedEmail } from './_mailer.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export default async function handler(req, res) {
  const token = String((req.query && req.query.token) || '')
  let outcome = 'invalid'

  if (UUID_RE.test(token) && process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
      const { data: row, error: readError } = await supabase
        .from('newsletter_subscribers')
        .select('email, status')
        .eq('token', token)
        .maybeSingle()
      if (readError) throw readError

      if (row && row.status === 'confirmed') {
        outcome = 'confirmed' // already confirmed: no second email
      } else if (row) {
        const { error } = await supabase
          .from('newsletter_subscribers')
          .update({ status: 'confirmed', confirmed_at: new Date().toISOString() })
          .eq('token', token)
        if (error) throw error
        outcome = 'confirmed'
        if (mailerConfigured()) {
          try {
            await sendMail({ to: row.email, ...confirmedEmail() })
          } catch (mailError) {
            console.error('newsletter-confirm: confirmation email failed', mailError)
          }
        }
      }
    } catch (err) {
      console.error('newsletter-confirm:', err)
      outcome = 'error'
    }
  }

  res.setHeader('Location', `/?newsletter=${outcome}#newsletter`)
  return res.status(302).end()
}
