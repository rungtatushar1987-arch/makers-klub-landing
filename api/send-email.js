import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { email, name } = req.body;

    if (!email || !name) {
      return res.status(400).json({ error: "Email and name are required" });
    }

    console.log("Attempting to send email to:", email);

    const data = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: email,
      subject: "You're on the Makers Klub waitlist! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: sans-serif; padding: 40px; background: #faf9fc;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 16px;">
            <h1 style="color: #013dc4;">🎉 You're on the list, ${name}!</h1>
            <p>Welcome to Makers Klub — the premium networking platform for creative professionals in Berlin.</p>
            <p>We'll be in touch personally when we launch.</p>
            <p style="margin-top: 40px; color: #6b6b80; font-size: 14px;">Makers Klub · Berlin, Germany</p>
          </div>
        </body>
        </html>
      `
    });

    console.log("Email sent successfully:", data);

    return res.status(200).json({
      success: true,
      id: data.id
    });

  } catch (error) {
    console.error("Handler error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message
    });
  }
}
