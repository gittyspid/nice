// Builds a public summary page (and PDF) for every program session.
// Content comes from defaultModules() in index.html; the design comes from guide/summary.html.
// Usage (from the claude-admin folder):  node tools/build-summaries.cjs
// Output: guide/summary-<id>.html and, when Chrome is found, guide/summary-<id>.pdf
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const fnStart = app.indexOf('function defaultModules(){');
const fnEnd = app.indexOf('function defaults(){');
if (fnStart < 0 || fnEnd < fnStart) throw new Error('defaultModules() not found in index.html');
const modules = new Function(app.slice(fnStart, fnEnd) + '\nreturn defaultModules();')();

const tpl = fs.readFileSync(path.join(root, 'guide', 'summary.html'), 'utf8');
const style = tpl.match(/<style>[\s\S]*?<\/style>/)[0];
const head = tpl.slice(0, tpl.indexOf('<title>'));
const footer = tpl.match(/<footer>[\s\S]*?<\/footer>/)[0];

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const headline = m => esc(m.headline).replace('Claude Code', '<em>Claude Code</em>').replace(/(Vercel|Supabase)/, '<em>$1</em>');
const promptHtml = t => esc(t).replace(/\[([^\]]+)\]/g, '<span class="ph">$1</span>');

function page(m) {
  return `${head}<title>סיכום סשן ${m.num}: ${esc(m.title)} | ספיד Automation</title>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;700;800&display=swap" rel="stylesheet">
${style}
${m.steps.length>5?"<style>@media print{body{zoom:.6}}</style>":""}
</head>
<body>
<div class="page">

  <header>
    <div class="brand"><img src="img/logo.png" alt="ספיד Automation"><span>ספיד <b>Automation</b></span></div>
    <div class="doc-type">סיכום סשן ${m.num}</div>
  </header>

  <h1>${headline(m)}</h1>
  <p class="lead">${esc(m.lead.replace(/^תודה על הסשן!\s*/, ''))}</p>

  <div class="meta">
    <div><small>משך הסשן</small><b>שעתיים</b></div>
    <div><small>נושא</small><b>${esc(m.short)}</b></div>
    <div><small>תוצר</small><b>${esc(m.product || m.short)}</b></div>
  </div>

  <h2>מה עשינו בסשן</h2>
  <ol class="tl">
${m.steps.map((x, i) => `    <li><span class="n">${i + 1}</span><div class="box">
      <h3>${esc(x.t)}</h3>
      ${x.d ? `<p>${esc(x.d)}</p>` : ''}
      ${(x.links || []).map(l => `<span class="link">${esc(l)}</span>`).join(' ')}
    </div></li>`).join('\n')}
  </ol>

  <div class="two">
    <div class="card">
      <h4>מה יש לך עכשיו</h4>
      <ul class="check">
${m.have.map(t => `        <li>${esc(t)}</li>`).join('\n')}
      </ul>
    </div>
    <div class="card">
      <h4>הצעדים הבאים</h4>
      <ul class="todo">
${m.next.map(t => `        <li>${esc(t)}</li>`).join('\n')}
      </ul>
    </div>
  </div>

  <h2>להמשך העבודה: פרומפט לדוגמה</h2>
  <div class="prompt">${promptHtml(m.prompt)}</div>
  <div class="tip"><b>טיפ:</b> ${esc(m.tip)}</div>

  ${footer}

</div>
</body>
</html>
`;
}

const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome']
  .find(p => fs.existsSync(p));

for (const m of modules) {
  const html = path.join(root, 'guide', `summary-${m.id}.html`);
  fs.writeFileSync(html, page(m));
  let pdfNote = 'no Chrome found, PDF skipped';
  if (chrome) {
    const pdf = path.join(root, 'guide', `summary-${m.id}.pdf`);
    execFileSync(chrome, ['--headless=new', '--disable-gpu', '--no-pdf-header-footer', '--virtual-time-budget=8000',
      `--user-data-dir=${path.join(require('os').tmpdir(), 'build-summaries-chrome')}`,
      `--print-to-pdf=${pdf}`, 'file:///' + html.replace(/\\/g, '/')], { stdio: 'ignore' });
    pdfNote = `PDF ${fs.statSync(pdf).size} bytes`;
  }
  console.log(`summary-${m.id}: ${m.title} (${pdfNote})`);
}
