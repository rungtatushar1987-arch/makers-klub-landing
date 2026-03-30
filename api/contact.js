export const config = {
  api: {
    bodyParser: true,
  },
};

export default async function handler(req, res) {
  console.log("Handler called, method:", req.method);
  console.log("Body:", JSON.stringify(req.body));
  console.log("KEY present:", !!process.env.WEB3FORMS_KEY);

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { name, email, interest, message } = req.body || {};

    if (!name || !email || !message) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const response = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_key: process.env.WEB3FORMS_KEY,
        subject: "New Enquiry — Makers Klub",
        name,
        email,
        interest: interest || "Not specified",
        message,
      }),
    });

    const data = await response.json();
    console.log("Web3Forms response:", JSON.stringify(data));

    if (data.success) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(500).json({ error: "Submission failed", details: data });
    }
  } catch (err) {
    console.log("Caught error:", err.message);
    return res.status(500).json({ error: "Server error", details: err.message });
  }
}