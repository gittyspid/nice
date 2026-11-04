// Vercel Routing Middleware: locks the whole site (pages and /api) behind a designed login page.
// Required environment variables (Vercel → Project → Settings → Environment Variables):
//   ADMIN_USER      – the username for signing in
//   ADMIN_PASSWORD  – the password (the same one the send function checks)
// If either is missing, the site stays closed.
// Routes handled here: GET/POST /login, GET /logout. /logo.png stays public for the login page.

export const config = { matcher: '/:path*' };

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
<link rel="icon" type="image/png" href="/logo.png">
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
    <div class="logo"><img src="/logo.png" alt="ספיד אוטומציות"></div>
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

const redirect = (to, extra = {}) => new Response(null, { status: 303, headers: { Location: to, ...noStore, ...extra } });

export default async function middleware(request) {
  const url = new URL(request.url);
  const path = url.pathname;
  const { ADMIN_USER, ADMIN_PASSWORD } = process.env;

  // The logo is public so the login page can show it.
  if (path === '/logo.png') return;

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
      const pass = String(form.get('pass') || '');
      const next = safeNext(String(form.get('next') || '/'));
      const okUser = safeEqual(user, ADMIN_USER);
      const okPass = safeEqual(pass, ADMIN_PASSWORD);
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

  if (await validToken(readCookie(request, COOKIE), ADMIN_USER, ADMIN_PASSWORD)) return; // signed in: continue

  if (path.startsWith('/api/')) return Response.json({ error: 'צריך להתחבר מחדש' }, { status: 401, headers: noStore });
  return loginPage({ next: safeNext(path + url.search), status: 401 });
}
