// Vercel Routing Middleware: locks the whole site (pages and /api) behind a username and password.
// Required environment variables (Vercel → Project → Settings → Environment Variables):
//   ADMIN_USER      – the username for signing in
//   ADMIN_PASSWORD  – the password (the same one the send function checks)
// If either is missing, the site stays closed.

export const config = { matcher: '/:path*' };

function safeEqual(a, b) {
  a = String(a || '');
  b = String(b || '');
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function decodeBasic(header) {
  if (!header || !header.startsWith('Basic ')) return null;
  try {
    const bin = atob(header.slice(6).trim());
    const bytes = Uint8Array.from(bin, c => c.charCodeAt(0));
    const text = new TextDecoder().decode(bytes);
    const i = text.indexOf(':');
    return i < 0 ? null : { user: text.slice(0, i), pass: text.slice(i + 1) };
  } catch {
    return null;
  }
}

const deny = (status, msg) => new Response(msg, {
  status,
  headers: {
    'WWW-Authenticate': 'Basic realm="Speed Automations Admin", charset="UTF-8"',
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store',
  },
});

export default function middleware(request) {
  const { ADMIN_USER, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_USER || !ADMIN_PASSWORD) {
    return new Response('The site is locked: ADMIN_USER and ADMIN_PASSWORD must be set in Vercel.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }
  const cred = decodeBasic(request.headers.get('authorization'));
  const okUser = cred ? safeEqual(cred.user, ADMIN_USER) : false;
  const okPass = cred ? safeEqual(cred.pass, ADMIN_PASSWORD) : false;
  if (!(okUser && okPass)) return deny(401, 'Sign-in required');
  // returning nothing lets the request continue to the page or function
}
