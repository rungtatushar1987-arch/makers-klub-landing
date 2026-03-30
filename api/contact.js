export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, interest, message } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Makers Klub Website <hello@makersklub.com>",
        to: "contact@tusharrungta.com",
        reply_to: email,
        subject: "New Enquiry — Makers Klub",
        html: `
          <h2>New Enquiry from ${name}</h2>
          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Interested in:</strong> ${interest || "Not specified"}</p>
          <p><strong>Message:</strong></p>
          <p>${message}</p>
        `,
      }),
    });

    const data = await response.json();

    if (data.id) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ error: "Failed to send email", details: data });
    }
  } catch (err) {
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}