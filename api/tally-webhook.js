import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = req.body;

    // Tally sends data inside body.data.fields as an array
    const fields = body?.data?.fields || [];

    // Parse fields by label
    const emailField = fields.find((f) => f.label === "Email");
    const roleField = fields.find((f) =>
      f.label.includes("Founder, business owner or a creative freelancer")
    );
    const referralField = fields.find((f) =>
      f.label.includes("How did you hear")
    );

    const email = emailField?.value;
    const role = Array.isArray(roleField?.value)
      ? roleField.value.join(", ")
      : roleField?.value || "creative professional";
    const referral = referralField?.value || "";

    if (!email) {
      console.error("No email found in Tally payload", JSON.stringify(fields));
      return res.status(400).json({ error: "No email in payload" });
    }

    console.log(`Sending confirmation to ${email} (${role})`);

    const data = await resend.emails.send({
      from: "Tushar at Makers Klub <hello@makersklub.com>",
      to: email,
      subject: "You're on the Makers Klub waitlist",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="margin: 0; padding: 0; background: #f5f1ea; font-family: 'Inter', Arial, sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="padding: 48px 20px;">
            <tr>
              <td align="center">
                <table width="100%" style="max-width: 560px; background: #ffffff; border-radius: 16px; overflow: hidden;">
                  
                  <!-- Header -->
                  <tr>
                    <td style="background: #0f1e3d; padding: 32px 40px;">
                      <p style="margin: 0; font-size: 18px; font-weight: 700; color: #ffffff; letter-spacing: -0.3px;">Makers Klub</p>
                      <p style="margin: 4px 0 0; font-size: 13px; color: rgba(255,255,255,0.5);">Berlin</p>
                    </td>
                  </tr>

                  <!-- Body -->
                  <tr>
                    <td style="padding: 40px 40px 32px;">
                      <p style="margin: 0 0 24px; font-size: 24px; font-weight: 300; color: #0f1e3d; line-height: 1.3;">
                        You're on the waitlist.
                      </p>
                      <p style="margin: 0 0 16px; font-size: 15px; color: #4a4a5a; line-height: 1.65;">
                        Thanks for applying. We review every application personally, so it might take a few days before you hear back from us.
                      </p>
                      <p style="margin: 0 0 16px; font-size: 15px; color: #4a4a5a; line-height: 1.65;">
                        In the meantime, the best way to get a feel for what Makers Klub is — is to come to one of our events. They're open to everyone and a good way to meet the community before committing to anything.
                      </p>
                      <p style="margin: 0 0 32px; font-size: 15px; color: #4a4a5a; line-height: 1.65;">
                        See you in the room.
                      </p>

                      <!-- CTA -->
                      <table cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="background: #0f1e3d; border-radius: 100px;">
                            <a href="https://luma.com/calendar/cal-GBRc6zCvxA5bqnz"
                               style="display: inline-block; padding: 14px 28px; font-size: 14px; font-weight: 600; color: #ffffff; text-decoration: none;">
                              See upcoming events →
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style="padding: 24px 40px 32px; border-top: 1px solid #f0ece4;">
                      <p style="margin: 0; font-size: 13px; color: #9b9b9b; line-height: 1.6;">
                        Makers Klub · Berlin<br/>
                        <a href="https://www.makersklub.com" style="color: #013dc4; text-decoration: none;">makersklub.com</a>
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
