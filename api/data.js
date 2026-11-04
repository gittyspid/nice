// Vercel serverless function: keeps the admin's data in Upstash Redis, so it's the same on every device.
// Environment variables are added by the Vercel "Upstash for Redis" integration (prefix KV):
//   KV_REST_API_URL, KV_REST_API_TOKEN   (UPSTASH_REDIS_REST_URL / _TOKEN are accepted too)
// Access is checked by middleware.js: only a signed-in session reaches this function.
//
// GET  /api/data          -> { db, v }     (db is null when nothing is stored yet)
// PUT  /api/data {db, v}  -> { ok, v }     v is the version the browser last saw; if the stored
//                                          version is newer, answers 409 with the stored data instead
const KEY = 'speed-admin:db';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return res.status(503).json({ error: 'האחסון בענן עוד לא מחובר (חסרים KV_REST_API_URL ו-KV_REST_API_TOKEN ב-Vercel)' });

  const redis = async cmd => {
    const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd) });
    const data = await r.json().catch(() => ({}));
    if (!r.ok || data.error) throw new Error(data.error || `Upstash ${r.status}`);
    return data.result;
  };
  const read = async () => { const raw = await redis(['GET', KEY]); return raw ? JSON.parse(raw) : { v: 0, db: null }; };

  try {
    if (req.method === 'GET') {
      const cur = await read();
      return res.status(200).json({ db: cur.db, v: cur.v || 0 });
    }
    if (req.method === 'PUT' || req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
      const db = body.db;
      if (!db || typeof db !== 'object' || !Array.isArray(db.students) || !Array.isArray(db.sessions)) {
        return res.status(400).json({ error: 'נתונים לא תקינים' });
      }
      const cur = await read();
      if ((cur.v || 0) > (+body.v || 0)) return res.status(409).json({ error: 'conflict', db: cur.db, v: cur.v });
      const v = Date.now();
      await redis(['SET', KEY, JSON.stringify({ v, db })]);
      return res.status(200).json({ ok: true, v });
    }
    return res.status(405).json({ error: 'method not allowed' });
  } catch (e) {
    return res.status(502).json({ error: 'לא הצלחתי להתחבר לאחסון בענן: ' + e.message });
  }
};
