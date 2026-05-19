import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const LOGO_URL = "https://ld1getdcu5h4jiyg.public.blob.vercel-storage.com/images/Main%20Logo%20%283%29.png";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;
    const fields = body?.data?.fields || [];

    const emailField = fields.find((f) => f.label === "Email");
    const roleField = fields.find((f) =>
      f.label.includes("Founder, business owner or a creative freelancer")
    );

    const email = emailField?.value;
    const role = Array.isArray(roleField?.value)
      ? roleField.value[0]
      : roleField?.value || "";

    if (!email) {
      console.error("No email found in Tally payload", JSON.stringify(fields));
      return res.status(400).json({ error: "No email in payload" });
    }

    console.log(`Sending confirmation to ${email} (${role})`);

    const data = await resend.emails.send({
      from: "Makers Klub <hello@makersklub.com>",
      to: email,
      subject: "You're on the Makers Klub waitlist",
      headers: {
        "List-Unsubscribe": "<mailto:hello@makersklub.com?subject=unsubscribe>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      text: `You're on the Makers Klub waitlist.

Thanks for applying. We review every application personally, so it might take a few days before you hear back.

In the meantime, come to one of our events — they're a good way to meet the community before committing to anything.

See upcoming events: https://luma.com/calendar/cal-GBRc6zCvxA5bqnz

See you in the room.
— Tushar, Makers Klub

makersklub.com · Berlin`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>You're on the Makers Klub waitlist</title>
</head>
<body style="margin:0;padding:0;background:#f5f1ea;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:540px;" cellpadding="0" cellspacing="0" role="presentation">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:24px;">
              <img src="${LOGO_URL}"
                   alt="Makers Klub"
                   width="64"
                   height="64"
                   style="display:block;border:0;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;padding:40px;">

              <p style="margin:0 0 24px;font-size:22px;font-weight:600;color:#0f1e3d;line-height:1.3;">
                You're on the waitlist.
              </p>

              <p style="margin:0 0 16px;font-size:15px;color:#4a4a5a;line-height:1.7;">
                Thanks for applying. We go through every application personally, so it might take a few days before you hear back.
              </p>

              <p style="margin:0 0 16px;font-size:15px;color:#4a4a5a;line-height:1.7;">
                In the meantime, the best way to get a feel for Makers Klub is to come to one of our events. Open to everyone — a good way to meet the community before committing to anything.
              </p>

              <p style="margin:0 0 32px;font-size:15px;color:#4a4a5a;line-height:1.7;">
                See you in the room.
              </p>

              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="background:#013dc4;border-radius:6px;">
                    <a href="https://luma.com/calendar/cal-GBRc6zCvxA5bqnz"
                       style="display:inline-block;padding:13px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      See upcoming events →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Signature -->
              <p style="margin:40px 0 0;font-size:14px;color:#9b9b9b;line-height:1.6;">
                — Tushar<br/>
                Founder, Makers Klub
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">
                Makers Klub · Berlin ·
                <a href="https://www.makersklub.com" style="color:#aaaaaa;">makersklub.com</a><br/>
                You're receiving this because you applied to join Makers Klub.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log("Confirmation email sent:", data.id);
    return res.status(200).json({ success: true, id: data.id });

  } catch (error) {
    console.error("Webhook error:", error);
    return res.status(500).json({ error: "Internal server error", message: error.message });
  }
}
