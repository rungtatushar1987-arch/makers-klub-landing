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
      subject: "Welcome to Makers Klub",
      headers: {
        "List-Unsubscribe": "<mailto:hello@makersklub.com?subject=unsubscribe>",
        "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
      },
      text: `Welcome to Makers Klub.

You're on the waitlist — and we're glad you found us. Makers Klub is still early, and that's exactly why this is a good time to be here.

We're building a community for freelancers, founders, and solopreneurs in creative industries in Berlin — through events, working sessions, and the kind of introductions you can't engineer on LinkedIn. Follow along as we grow.

As a thank you for signing up, you get 15% off your first co-working day. Use code MAKERS15 at checkout.

See upcoming events: https://luma.com/calendar/cal-GBRc6zCvxA5bqnz
Follow us on Instagram: https://www.instagram.com/themakersklub/

See you in the room.
— Tushar
Founder, Makers Klub · Berlin
makersklub.com`,
      html: `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Welcome to Makers Klub</title>
</head>
<body style="margin:0;padding:0;background:#f5f1ea;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="padding:48px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:520px;" cellpadding="0" cellspacing="0" role="presentation">

          <!-- Logo -->
          <tr>
            <td style="padding-bottom:28px;">
              <img src="${LOGO_URL}" alt="Makers Klub" width="48" height="48" style="display:block;border:0;" />
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:12px;padding:40px;">

              <p style="margin:0 0 20px;font-size:21px;font-weight:600;color:#0f1e3d;line-height:1.3;">
                Welcome to Makers Klub.
              </p>

              <p style="margin:0 0 14px;font-size:14px;color:#5a5a6a;line-height:1.75;">
                You're on the waitlist — and we're glad you found us. Makers Klub is still early, and that's exactly why this is a good time to be here.
              </p>

              <p style="margin:0 0 28px;font-size:14px;color:#5a5a6a;line-height:1.75;">
                We're building a community for freelancers, founders, and solopreneurs in creative industries in Berlin — through events, working sessions, and the kind of introductions you can't engineer on LinkedIn. Follow along as we grow.
              </p>

              <!-- Discount block -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:24px;">
                <tr>
                  <td style="background:#f5f1ea;border-radius:10px;padding:20px 24px;border:1px solid #e8e2d8;">
                    <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#013dc4;text-transform:uppercase;letter-spacing:1px;">Your welcome discount</p>
                    <p style="margin:0 0 14px;font-size:14px;color:#5a5a6a;line-height:1.65;">As a thank you for signing up, you get <strong style="color:#0f1e3d;">15% off</strong> your first co-working day. Use this code at checkout:</p>
                    <table cellpadding="0" cellspacing="0" role="presentation">
                      <tr>
                        <td style="background:#ffffff;border-radius:6px;padding:10px 18px;border:1px solid #e8e2d8;">
                          <p style="margin:0;font-size:16px;font-weight:700;color:#0f1e3d;letter-spacing:2px;">MAKERS15</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA 1 -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin-bottom:10px;">
                <tr>
                  <td style="background:#013dc4;border-radius:6px;text-align:center;">
                    <a href="https://luma.com/calendar/cal-GBRc6zCvxA5bqnz"
                       style="display:block;padding:13px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;">
                      See upcoming events →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- CTA 2 -->
              <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
                <tr>
                  <td style="border:1px solid #e8e2d8;border-radius:6px;text-align:center;">
                    <a href="https://www.instagram.com/themakersklub/"
                       style="display:block;padding:13px 24px;font-size:14px;font-weight:500;color:#0f1e3d;text-decoration:none;">
                      Follow us on Instagram →
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Signature -->
              <div style="margin-top:36px;padding-top:20px;border-top:1px solid #f0ece4;">
                <p style="margin:0;font-size:13px;color:#0f1e3d;font-weight:500;">Tushar Rungta</p>
                <p style="margin:2px 0 0;font-size:13px;color:#9b9b9b;">Founder, Makers Klub</p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;">
              <p style="margin:0;font-size:12px;color:#aaaaaa;line-height:1.6;">
                Makers Klub · Berlin ·
                <a href="https://www.makersklub.com" style="color:#aaaaaa;">makersklub.com</a><br/>
                You're receiving this because you signed up to Makers Klub.
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
