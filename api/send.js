// Vercel serverless function: sends emails through Resend.
// Required environment variables (Vercel → Project → Settings → Environment Variables):
//   RESEND_API_KEY  – API key from resend.com
//   RESEND_FROM     – verified sender, e.g. "ספיד Automation <hello@your-domain.co.il>"
//   REPLY_TO        – optional: where client replies go (e.g. your Gmail)
// The endpoint is protected by middleware.js (sign-in with ADMIN_USER / ADMIN_PASSWORD).
const isEmail = s => typeof s === 'string' && /^[^\s@<>,]+@[^\s@<>,]+\.[^\s@<>,]+$/.test(s.trim());

// Typing RESEND_FROM with a Hebrew keyboard often adds invisible direction marks or flips the
// brackets. Pull out the address and the display name and rebuild the "Name <email>" form.
const DEFAULT_NAME = 'ספיד Automation';
function normalizeFrom(raw) {
  const clean = String(raw || '').replace(/[‎‏‪-‮⁦-⁩﻿"'״]/g, '').trim();
  const m = clean.match(/[^\s@<>,]+@[^\s@<>,]+\.[^\s@<>,]+/);
  if (!m) return null;
  const email = m[0];
  const name = clean.replace(email, '').replace(/[<>]/g, ' ').replace(/\s+/g, ' ').trim() || DEFAULT_NAME;
  return `"${name}" <${email}>`;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  // Access is checked by middleware.js: only a signed-in session reaches this function.
  const { RESEND_API_KEY, REPLY_TO } = process.env;
  const RESEND_FROM = normalizeFrom(process.env.RESEND_FROM);
  if (!RESEND_API_KEY || !process.env.RESEND_FROM) {
    return res.status(500).json({ error: 'חסרים משתני סביבה ב-Vercel: RESEND_API_KEY, RESEND_FROM' });
  }
  if (!RESEND_FROM) {
    return res.status(500).json({ error: 'בכתובת השולח (RESEND_FROM ב-Vercel) אין כתובת מייל. צריך לכתוב בה למשל: hello@gospid.co.il' });
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
    else if (isEmail(REPLY_TO)) item.reply_to = REPLY_TO.trim();
    // Attachments: only PDFs from this site's own public /guide folder (Resend downloads them by URL).
    if (Array.isArray(m.attachments) && m.attachments.length) {
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const files = [];
      for (const a of m.attachments.slice(0, 3)) {
        let u;
        try { u = new URL(String(a && a.path)); } catch { continue; }
        if (u.protocol === 'https:' && u.host === host && /^\/guide\/[\w.-]+\.pdf$/.test(u.pathname)) {
          files.push({ filename: String(a.filename || 'summary.pdf').slice(0, 120), path: u.href });
        }
      }
      if (files.length) item.attachments = files;
    }
    payload.push(item);
  }

  const post = (url, body) => fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  // If Resend rejects the display name in "from", retry once with the bare address.
  const bareFrom = RESEND_FROM.match(/<([^>]+)>/)[1];
  const withFrom = (body, from) => Array.isArray(body) ? body.map(x => ({ ...x, from })) : { ...body, from };
  const call = async (url, body) => {
    const r = await post(url, body);
    if (r.ok) return r;
    const data = await r.clone().json().catch(() => ({}));
    return /from/i.test(String(data.message || '')) ? post(url, withFrom(body, bareFrom)) : r;
  };

  try {
    // Resend's batch endpoint doesn't take attachments, so emails with a PDF go out one by one.
    if (payload.some(p => p.attachments)) {
      const results = [];
      for (const item of payload) {
        const r = await call('https://api.resend.com/emails', item);
        const data = await r.json().catch(() => ({}));
        if (!r.ok) {
          return res.status(502).json({ error: (data.message || `Resend החזיר שגיאה ${r.status}`) + (results.length ? ` (נשלחו ${results.length} לפני השגיאה)` : ''), sent: results.length });
        }
        results.push(data);
      }
      return res.status(200).json({ ok: true, sent: results.length, data: results });
    }
    const r = await call('https://api.resend.com/emails/batch', payload);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: data.message || `Resend החזיר שגיאה ${r.status}` });
    return res.status(200).json({ ok: true, sent: payload.length, data });
  } catch (e) {
    return res.status(502).json({ error: 'לא הצלחתי להתחבר ל-Resend' });
  }
};
