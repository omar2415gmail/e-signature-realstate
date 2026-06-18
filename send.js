// api/send.js — يستقبل العقد الموقّع (PDF) ويرسله لإيميل المؤجّر عبر Resend.
// لا يخزّن أي بيانات. يتطلب متغيّر بيئة واحد: RESEND_API_KEY

const OWNER_EMAIL = "omar2415@gmail.com"; // إيميل استقبال العقود

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { pdfBase64, filename, subject, summaryHtml } = body || {};

    if (!pdfBase64) return res.status(400).json({ error: "missing pdf" });
    if (!process.env.RESEND_API_KEY) {
      return res.status(500).json({ error: "RESEND_API_KEY not set" });
    }

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "آثار العقارية <onboarding@resend.dev>",
        to: [OWNER_EMAIL],
        subject: subject || "عقد إيجار موقّع",
        html: summaryHtml || "وصل عقد إيجار موقّع جديد. الملف مرفق.",
        attachments: [
          { filename: filename || "contract.pdf", content: pdfBase64 },
        ],
      }),
    });

    const data = await r.json();
    if (!r.ok) return res.status(502).json({ error: data });
    return res.status(200).json({ ok: true, id: data.id });
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
