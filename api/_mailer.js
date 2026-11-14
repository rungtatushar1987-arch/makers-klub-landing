import nodemailer from 'nodemailer'

// Sends from the club's Gmail account over SMTP. Needs two Vercel settings:
//   GMAIL_USER          the sending address (also the From address)
//   GMAIL_APP_PASSWORD  a Google "app password" for that account (2-step verification must be on)
// Files starting with "_" in /api are helpers, not routes.

export function mailerConfigured() {
  return Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
}

export async function sendMail({ to, subject, html, text }) {
  const user = process.env.GMAIL_USER
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass: process.env.GMAIL_APP_PASSWORD },
  })
  return transporter.sendMail({
    from: `"The Solopreneurs Club" <${user}>`,
    to,
    subject,
    text,
    html,
  })
}

const wrap = (inner) => `<!DOCTYPE html>
<html><body style="font-family: -apple-system, 'Segoe UI', sans-serif; padding: 32px; background: #f6f6f6;">
  <div style="max-width: 560px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 16px;">${inner}</div>
</body></html>`

export function confirmEmail(link) {
  return {
    subject: 'Confirm your email',
    text: `Thanks for signing up to The Solopreneurs Club newsletter.\n\nConfirm your email address: ${link}\n\nIf you did not sign up, you can ignore this email.`,
    html: wrap(`
    <h1 style="color: #0a1129; font-size: 24px; margin: 0 0 16px;">Confirm your email</h1>
    <p style="color: #39405e; font-size: 16px; line-height: 1.5;">Thanks for signing up to The Solopreneurs Club newsletter. Please confirm your email address to start receiving new sessions and resources.</p>
    <p style="margin: 28px 0;"><a href="${link}" style="background: #cdb27e; color: #1c1405; text-decoration: none; font-weight: 700; padding: 14px 28px; border-radius: 999px; display: inline-block;">Confirm my email</a></p>
    <p style="color: #767d9b; font-size: 13px; line-height: 1.5;">If you did not sign up, you can ignore this email and nothing will happen.</p>`),
  }
}

export function confirmedEmail() {
  return {
    subject: 'Your email is confirmed',
    text: 'Thanks, your email is confirmed. You are on the list for The Solopreneurs Club newsletter: new sessions and resources, straight to your inbox.',
    html: wrap(`
    <h1 style="color: #0a1129; font-size: 24px; margin: 0 0 16px;">You are on the list</h1>
    <p style="color: #39405e; font-size: 16px; line-height: 1.5;">Thanks, your email is confirmed. You will now get new sessions and resources from The Solopreneurs Club, straight to your inbox.</p>
    <p style="color: #767d9b; font-size: 13px; line-height: 1.5;">You can unsubscribe at any time by replying to any of our emails.</p>`),
  }
}
