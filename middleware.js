// Vercel Routing Middleware: locks the whole site (pages and /api) behind a designed login page.
// Required environment variables (Vercel → Project → Settings → Environment Variables):
//   ADMIN_USER      – the username for signing in
//   ADMIN_PASSWORD  – the password (the same one the send function checks)
// If either is missing, the site stays closed.
// Routes handled here: GET/POST /login, GET /logout. /logo.png stays public for the login page.

export const config = { matcher: '/:path*' };

// The logo is embedded so the login page never depends on another request.
const LOGO = "data:image/png;base64,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";

const COOKIE = 'sa_session';
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const enc = new TextEncoder();

function safeEqual(a, b) {
  a = String(a || '');
  b = String(b || '');
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

const b64url = bytes => btoa(String.fromCharCode(...new Uint8Array(bytes)))
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function sign(text, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(text)));
}

// The token changes whenever the username or password changes, so old sessions stop working.
const secretOf = (user, pass) => `speed-admin|${user}|${pass}`;

async function makeToken(user, pass) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  return `${exp}.${await sign(String(exp), secretOf(user, pass))}`;
}

async function validToken(token, user, pass) {
  if (!token) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !(+exp > Date.now() / 1000)) return false;
  return safeEqual(sig, await sign(exp, secretOf(user, pass)));
}

function readCookie(request, name) {
  const all = request.headers.get('cookie') || '';
  for (const part of all.split(';')) {
    const i = part.indexOf('=');
    if (i > -1 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return '';
}

const safeNext = n => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/login')) ? n : '/';

const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const noStore = { 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' };

function loginPage({ error = '', user = '', next = '/', status = 200, closed = false } = {}) {
  const html = `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>כניסה · ספיד אוטומציות</title>
<link rel="icon" type="image/png" href="${LOGO}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Rubik:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
:root{--bg:#FBF8F5;--ink:#1E1B1A;--muted:#857C75;--line:#F0E8E1;--orange:#E8620C;--orange-h:#CF560A;--lav:#FFE6D5;--mint:#DDF3E6;--peach:#FFEBC8;--pink:#FDE1DA;--pink-d:#C24B37;--shadow:0 1px 2px rgba(40,30,25,.04),0 18px 50px rgba(232,98,12,.10)}
*{box-sizing:border-box}
html,body{margin:0;height:100%}
body{font-family:'Rubik','Segoe UI',Arial,sans-serif;background:var(--bg);color:var(--ink);display:grid;place-items:center;padding:24px;position:relative;overflow:hidden;font-size:15px}
.blob{position:fixed;border-radius:50%;filter:blur(10px);opacity:.75;z-index:0}
.b1{width:420px;height:420px;background:var(--lav);top:-140px;right:-120px}
.b2{width:340px;height:340px;background:var(--mint);bottom:-120px;left:-90px}
.b3{width:220px;height:220px;background:var(--peach);bottom:12%;right:8%;opacity:.6}
.card{position:relative;z-index:1;width:100%;max-width:400px;background:#fff;border:1px solid #F3ECE6;border-radius:26px;box-shadow:var(--shadow);padding:34px 32px 26px;overflow:hidden}
@media (max-width:440px){body{padding:16px}.card{padding:30px 22px 22px}}
.card:before{content:"";position:absolute;inset:0 0 auto 0;height:5px;border-radius:26px 26px 0 0;background:linear-gradient(90deg,#F26A12,#FFB27A)}
.brand{display:flex;flex-direction:column;align-items:center;text-align:center;margin-bottom:24px}
.logo{width:76px;height:76px;border-radius:22px;background:#fff;display:grid;place-items:center;box-shadow:0 1px 2px rgba(40,30,25,.05),0 10px 26px rgba(232,98,12,.16);padding:12px;margin-bottom:14px}
.logo img{width:100%;height:100%;object-fit:contain}
h1{margin:0;font-size:22px;font-weight:700;letter-spacing:-.2px}
.sub{margin:4px 0 0;color:var(--muted);font-size:14px}
label{display:block;font-size:13px;font-weight:600;margin:0 0 6px;color:#4A403A}
.field{margin-bottom:14px}
.wrap{position:relative}
input{width:100%;font:inherit;color:inherit;background:#FFFCFA;border:1px solid var(--line);border-radius:14px;padding:12px 14px;outline:none;transition:.15s;direction:ltr;text-align:right}
input:focus{border-color:#F6B88E;background:#fff;box-shadow:0 0 0 4px rgba(232,98,12,.12)}
input.pw{padding-left:46px}
.eye{position:absolute;left:8px;top:50%;transform:translateY(-50%);border:0;background:transparent;cursor:pointer;width:34px;height:34px;border-radius:10px;color:var(--muted);display:grid;place-items:center}
.eye:hover{background:#FDF1E8;color:var(--orange)}
.err{display:flex;gap:8px;align-items:center;background:var(--pink);color:var(--pink-d);border-radius:12px;padding:10px 14px;font-size:14px;font-weight:500;margin-bottom:16px}
.btn{width:100%;border:0;border-radius:14px;padding:13px 16px;font:inherit;font-weight:600;font-size:16px;cursor:pointer;background:var(--orange);color:#fff;box-shadow:0 8px 20px rgba(232,98,12,.28);transition:.15s;margin-top:6px}
.btn:hover{background:var(--orange-h);transform:translateY(-1px)}
.btn:disabled{opacity:.7;cursor:default;transform:none}
.foot{text-align:center;color:var(--muted);font-size:12.5px;margin-top:18px;display:flex;align-items:center;justify-content:center;gap:6px}
.lock{width:14px;height:14px}
</style>
</head>
<body>
<span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span>
<main class="card">
  <div class="brand">
    <div class="logo"><img src="${LOGO}" alt="ספיד אוטומציות" width="52" height="48"></div>
    <h1>ספיד אוטומציות</h1>
    <p class="sub">ניהול סשנים ודיוורים</p>
  </div>
  ${closed ? `<div class="err">האתר נעול: צריך להגדיר ב-Vercel את ADMIN_USER ואת ADMIN_PASSWORD.</div>` : `
  ${error ? `<div class="err" role="alert">⚠ ${esc(error)}</div>` : ''}
  <form method="post" action="/login" id="f" autocomplete="on">
    <input type="hidden" name="next" value="${esc(next)}">
    <div class="field">
      <label for="u">שם משתמש</label>
      <input id="u" name="user" type="text" value="${esc(user)}" autocomplete="username" autocapitalize="none" spellcheck="false" required ${user ? '' : 'autofocus'}>
    </div>
    <div class="field">
      <label for="p">סיסמה</label>
      <div class="wrap">
        <input id="p" class="pw" name="pass" type="password" autocomplete="current-password" required ${user ? 'autofocus' : ''}>
        <button class="eye" type="button" id="eye" aria-label="הצגת הסיסמה" title="הצגת הסיסמה">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
    </div>
    <button class="btn" type="submit" id="go">כניסה</button>
  </form>`}
  <div class="foot"><svg class="lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>אזור אישי · הכניסה למורשים בלבד</div>
</main>
<script>
  var e=document.getElementById('eye'),p=document.getElementById('p'),f=document.getElementById('f'),g=document.getElementById('go');
  if(e) e.onclick=function(){var s=p.type==='password';p.type=s?'text':'password';e.setAttribute('aria-label',s?'הסתרת הסיסמה':'הצגת הסיסמה');p.focus();};
  if(f) f.onsubmit=function(){g.disabled=true;g.textContent='נכנסים…';};
</script>
</body>
</html>`;
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', ...noStore } });
}

// Explicitly tells Vercel to continue to the page or function (same as next() from @vercel/functions).
const pass = () => new Response(null, { headers: { "x-middleware-next": "1" } });

const redirect = (to, extra = {}) => new Response(null, { status: 303, headers: { Location: to, ...noStore, ...extra } });

export default async function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const { ADMIN_USER, ADMIN_PASSWORD } = process.env;

  // The logo is public so the login page can show it.
  if (path === '/logo.png') return pass();

  if (!ADMIN_USER || !ADMIN_PASSWORD) {
    if (path.startsWith('/api/')) return Response.json({ error: 'locked' }, { status: 503, headers: noStore });
    return loginPage({ closed: true, status: 503 });
  }

  const cookieBase = `${COOKIE}=`;
  const cookieAttrs = '; Path=/; HttpOnly; Secure; SameSite=Lax';

  if (path === '/logout') {
    return redirect('/login', { 'Set-Cookie': `${cookieBase}${cookieAttrs}; Max-Age=0` });
  }

  if (path === '/login') {
    if (request.method === 'POST') {
      let form;
      try { form = await request.formData(); } catch { form = new FormData(); }
      const user = String(form.get('user') || '').trim();
      const password = String(form.get('pass') || '');
      const next = safeNext(String(form.get('next') || '/'));
      const okUser = safeEqual(user, ADMIN_USER);
      const okPass = safeEqual(password, ADMIN_PASSWORD);
      if (okUser && okPass) {
        const token = await makeToken(ADMIN_USER, ADMIN_PASSWORD);
        return redirect(next, { 'Set-Cookie': `${cookieBase}${encodeURIComponent(token)}${cookieAttrs}; Max-Age=${MAX_AGE}` });
      }
      await new Promise(r => setTimeout(r, 600)); // slows down guessing
      return loginPage({ error: 'שם המשתמש או הסיסמה שגויים', user, next, status: 401 });
    }
    if (await validToken(readCookie(request, COOKIE), ADMIN_USER, ADMIN_PASSWORD)) return redirect('/');
    return loginPage({ next: safeNext(url.searchParams.get('next') || '/') });
  }

  if (await validToken(readCookie(request, COOKIE), ADMIN_USER, ADMIN_PASSWORD)) return pass(); // signed in: continue

  if (path.startsWith('/api/')) return Response.json({ error: 'צריך להתחבר מחדש' }, { status: 401, headers: noStore });
  return loginPage({ next: safeNext(path + url.search), status: 401 });
}
