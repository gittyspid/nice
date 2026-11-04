// Vercel serverless function: sends emails through Resend.
// Required environment variables (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  – API key from resend.com
//   RESEND_FROM     – verified sender, e.g. "ספיד אוטומציות <hello@your-domain.co.il>"
//   ADMIN_PASSWORD  – password the admin page must send; protects the endpoint from strangers
const crypto = require('crypto');

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
const isEmail = s => typeof s === 'string' && /^[^\s@<>,]+@[^\s@<>,]+\.[^\s@<>,]+$/.test(s.trim());

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  const { RESEND_API_KEY, RESEND_FROM, ADMIN_PASSWORD } = process.env;
  if (!RESEND_API_KEY || !RESEND_FROM || !ADMIN_PASSWORD) {
    return res.status(500).json({ error: 'חסרים משתני סביבה ב-Vercel: RESEND_API_KEY, RESEND_FROM, ADMIN_PASSWORD' });
  }
  if (!safeEqual(req.headers['x-admin-password'], ADMIN_PASSWORD)) {
    return res.status(401).json({ error: 'סיסמת השליחה שגויה' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (body.test) return res.status(200).json({ ok: true, from: RESEND_FROM });

  const emails = Array.isArray(body.emails) ? body.emails : [];
  if (!emails.length || emails.length > 50) return res.status(400).json({ error: 'צריך בין 1 ל-50 מיילים' });

  const payload = [];
  for (const m of emails) {
    const to = (Array.isArray(m.to) ? m.to : [m.to]).filter(isEmail);
    if (!to.length || !m.subject || !m.html) return res.status(400).json({ error: 'מייל חסר נמען, נושא או תוכן' });
    const item = { from: RESEND_FROM, to, subject: String(m.subject).slice(0, 300), html: String(m.html) };
    if (m.text) item.text = String(m.text);
    if (isEmail(m.replyTo)) item.reply_to = m.replyTo.trim();
    payload.push(item);
  }

  try {
    const r = await fetch('https://api.resend.com/emails/batch', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: data.message || `Resend החזיר שגיאה ${r.status}` });
    return res.status(200).json({ ok: true, sent: payload.length, data });
  } catch (e) {
    return res.status(502).json({ error: 'לא הצלחתי להתחבר ל-Resend' });
  }
};
