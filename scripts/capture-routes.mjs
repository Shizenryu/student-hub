// Screenshots every route from two builds, side by side, so a deliberate visual
// change can be reviewed as a picture: one row per route, before and after,
// marked identical or changed by the PNG bytes.
//
// Run by hand, not in CI. It needs two built dist/ directories — typically
// main's and the branch's:
//
//   git worktree add ../student-hub-main main
//   npx astro build --root ../student-hub-main        # main's dist, this toolchain
//   npm run build                                     # the branch's dist
//   node scripts/capture-routes.mjs ../student-hub-main/dist dist
//
// The sheet lands in dist/__visual/index.html with the PNGs beside it. Every
// route the sheet marks "changed" should have one line in the PR saying what
// changed and why — that is the review artefact for a slice a student can see.
//
// This is the capture half that scripts/compare-pixels.mjs's header said would
// outlive the migration: that script proves a port is pixel-identical to the
// legacy page it replaced; this one shows what a change on purpose looks like.
// Same viewport, same scale, same Chromium, so the two agree on what a pixel is.
import { createHash } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { extname, join, relative, sep } from 'node:path';
import { chromium } from 'playwright';

// A phone, where the site is used, and a tablet, where the column width and
// anything that depends on it can actually be seen — on a phone every page is
// narrower than any column the site has ever had.
const VIEWPORTS = [
  { name: 'phone', width: 390, height: 900, scale: 2 },
  { name: 'tablet', width: 768, height: 1024, scale: 1 },
];
const OUT = join('dist', '__visual');

const [beforeDir, afterDir] = process.argv.slice(2);
if (!beforeDir || !afterDir) {
  console.error('usage: node scripts/capture-routes.mjs <before-dist> <after-dist>');
  process.exit(2);
}

const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png' };

// Enough of a static server for a built Astro site: a trailing-slash URL is its
// directory's index.html, anything else is the file, and no headers matter here.
function serve(dir) {
  const server = createServer((request, response) => {
    const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
    const file = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
    try {
      const body = readFileSync(join(dir, file));
      response.writeHead(200, { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  return new Promise((resolve) =>
    server.listen(0, '127.0.0.1', () => resolve({ server, origin: `http://127.0.0.1:${server.address().port}` })),
  );
}

const routesIn = (dir) =>
  readdirSync(dir, { withFileTypes: true, recursive: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
    .map((entry) => `/${relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/')}`)
    .filter((file) => !file.startsWith('/__'))
    .map((file) => (file === '/404.html' ? file : file.replace(/index\.html$/, '')))
    .sort();

const fileNameFor = (route, viewport) =>
  `${viewport.name}__${route.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '__') || 'home'}.png`;

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex').slice(0, 12);

async function capture(context, origin, route, file) {
  const page = await context.newPage();
  await page.goto(`${origin}${route}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);
  const png = await page.screenshot({ fullPage: true, animations: 'disabled' });
  await page.close();
  writeFileSync(file, png);
  return sha(png);
}

const escapeHtml = (text) => text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// A page fragment, not a whole document: it renders as a file straight from
// dist/, and it can be published as-is as a review page, which wraps it itself.
// The colours are the site's own paper and ink, with a dark set for a viewer
// whose screen is dark.
const sheet = (rows) => `<title>Shizenryu Route Sheet</title>
<style>
  :root { --paper: #faf7f2; --ink: #222; --ink-soft: #444; --muted: #888; --line: #e5e0d8; --surface: #fff; --red: #C8102E; --good: #1e8a4c; }
  @media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { --paper: #161616; --ink: #f2ede4; --ink-soft: #cfc8bc; --muted: #9a9389; --line: #3a3630; --surface: #222; --good: #4fbf7d; --red: #ff5a6e; } }
  :root[data-theme="dark"] { --paper: #161616; --ink: #f2ede4; --ink-soft: #cfc8bc; --muted: #9a9389; --line: #3a3630; --surface: #222; --good: #4fbf7d; --red: #ff5a6e; }
  body { font: 14px/1.45 -apple-system, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding-block: 24px; padding-inline: 16px; color: var(--ink); background: var(--paper); }
  main { max-width: 1400px; margin-inline: auto; }
  h1 { font-size: 1.3rem; letter-spacing: .06em; text-transform: uppercase; margin: 0 0 4px; text-wrap: balance; }
  .lede { color: var(--ink-soft); margin: 0 0 20px; max-width: 65ch; }
  .row { display: grid; grid-template-columns: minmax(160px, 220px) 1fr 1fr; gap: 16px; align-items: start; padding: 16px 0; border-top: 1px solid var(--line); }
  .row img { max-width: 100%; border: 1px solid var(--line); background: var(--surface); }
  .route { font-weight: 700; } .viewport { color: var(--muted); font-size: .8rem; letter-spacing: .08em; text-transform: uppercase; }
  .changed { color: var(--red); font-weight: 700; } .same { color: var(--good); }
  code { font-size: .75rem; color: var(--muted); font-variant-numeric: tabular-nums; }
  @media (max-width: 720px) { .row { grid-template-columns: 1fr; } }
</style>
<main>
<h1>Shizenryu route sheet</h1>
<p class="lede">${rows.filter((r) => r.changed).length} of ${rows.length} captures changed. Left is before, right is after; phone captures are 390×900 at 2×, tablet 768×1024 at 1×. A capture is "changed" when a single pixel differs.</p>
${rows
  .map(
    (r) => `<section class="row"><div><div class="route">${escapeHtml(r.route)}</div><div class="viewport">${
      r.viewport
    }</div><span class="${r.changed ? 'changed' : 'same'}">${r.changed ? 'changed' : 'identical'}</span><br><code>${
      r.before
    } → ${r.after}</code></div><img src="before/${r.file}" alt="before, ${escapeHtml(r.route)} on ${
      r.viewport
    }"><img src="after/${r.file}" alt="after, ${escapeHtml(r.route)} on ${r.viewport}"></section>`,
  )
  .join('\n')}
</main>
`;

mkdirSync(join(OUT, 'before'), { recursive: true });
mkdirSync(join(OUT, 'after'), { recursive: true });

const before = await serve(beforeDir);
const after = await serve(afterDir);
const browser = await chromium.launch();

const routes = [...new Set([...routesIn(beforeDir), ...routesIn(afterDir)])].sort();
const rows = [];
for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.scale,
  });
  for (const route of routes) {
    const file = fileNameFor(route, viewport);
    const hashBefore = await capture(context, before.origin, route, join(OUT, 'before', file));
    const hashAfter = await capture(context, after.origin, route, join(OUT, 'after', file));
    const changed = hashBefore !== hashAfter;
    rows.push({ route, viewport: viewport.name, file, before: hashBefore, after: hashAfter, changed });
    console.log(`${changed ? 'CHANGED  ' : 'identical'}  ${viewport.name.padEnd(6)}  ${route}`);
  }
  await context.close();
}

await browser.close();
before.server.close();
after.server.close();
writeFileSync(join(OUT, 'index.html'), sheet(rows));
console.log(`\n${rows.filter((r) => r.changed).length} of ${rows.length} captures changed — ${join(OUT, 'index.html')}`);
