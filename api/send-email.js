import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: 'Email and name are required' });
    }

    const safeName = name.replace(/[<>]/g, '');

    const { data, error } = await resend.emails.send({
      from: 'Makers Klub <hello@makersklub.com>',
      to: email,
      subject: "You're on the Makers Klub waitlist! 🎉",
      html: `<h2>You're on the list, ${safeName}!</h2>`
    });

    if (error) {
      console.error('Resend error:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }

    return res.status(200).json({ success: true, id: data.id });

  } catch (error) {
    console.error('Handler error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
