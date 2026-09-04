// Proves a migrated route renders identically to the hand-written page it replaced.
//
// Run by hand, not in CI: it needs a build, a preview server, and a git ref holding
// a file the working tree has deleted. Paste the output into the PR.
//
//   node scripts/compare-pixels.mjs --page flashcards --ref main
//   node scripts/compare-pixels.mjs --page practice --ref 8877a37
//
// It exists because this comparison is the migration's central claim — "the student
// sees the same page" — and doing it ad hoc got it wrong twice, silently and in the
// passing direction. Both bugs are fixed here, once:
//
//   1. A static server resolves /flashcards to a sibling dist/flashcards.html when
//      one exists, in PREFERENCE to dist/flashcards/index.html. While the legacy
//      page still sat in public/, the comparison was comparing it with itself and
//      reporting a perfect match. The legacy page is therefore extracted to a name
//      that cannot shadow a route, and every capture asserts which document it
//      actually got before a pixel is compared.
//
//   2. Pages that shuffle read Math.random. Seeding it at page load is not enough:
//      hydration consumes numbers from the sequence on the island and not on the
//      legacy page, so the two dealt DIFFERENT cards while looking controlled. The
//      seed is therefore re-installed immediately before the interaction that
//      consumes it.
//
// The two halves are deliberately separate. `capture()` — build a browser at a
// fixed viewport, drive it to a named state, screenshot — outlives this migration:
// slices 8 and 9 change behaviour and appearance ON PURPOSE, and will want the same
// driver against a baseline captured just before their own change. Only `compare()`
// dies when public/ empties.

import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';

const VIEWPORT = { width: 390, height: 900 };
const SCALE = 2;
const OUT = 'dist/__pixel-comparison';

// Each page declares its legacy filename and the states worth comparing. A state is
// a name and a function that drives an already-loaded page into it; it must work
// against BOTH implementations, so it addresses things the way a student would.
const PAGES = {
  practice: {
    legacy: 'public/practice.html',
    route: '/practice',
    states: {
      settled: async () => {},
      ticked: async (page) => {
        for (const label of ['Stretch', 'Sanchin']) {
          await page.getByRole('button', { name: new RegExp(label) }).click();
        }
      },
    },
  },
  flashcards: {
    legacy: 'public/flashcards.html',
    route: '/flashcards',
    states: {
      menu: async () => {},
      study: async (page) => {
        await reseedRandom(page);
        await page.locator('.deck-btn').nth(3).click();
      },
      flipped: async (page) => {
        await reseedRandom(page);
        await page.locator('.deck-btn').nth(3).click();
        await page.locator('.flash').click();
        await page.waitForTimeout(700); // the flip is a .5s transition
      },
      done: async (page) => {
        await reseedRandom(page);
        await page.locator('.deck-btn').nth(3).click();
        // Every card is flipped before it is graded: the grading buttons are
        // hidden with `visibility` until the answer has been revealed, so a
        // sequence that skipped the first flip would hang rather than fail.
        for (let card = 0; card < 9; card++) {
          await page.locator('.flash').click();
          await page.locator('.got').click();
        }
      },
    },
  },
};

// A student who has trained, so any streak chip is actually painted. A chip that
// renders empty on both pages hides a difference in how it is styled.
const SEEDED_PROGRESS = (day) => ({ streak: { last: day - 1, count: 4, best: 9 } });

const localDayNumber = () => {
  const now = new Date();
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
};

// Bug 2. Installed immediately before the interaction that consumes randomness, so
// it does not matter how many numbers hydration took first.
const reseedRandom = (page) =>
  page.evaluate(() => {
    let seed = 42;
    Math.random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
  });

function parseArguments(argv) {
  const args = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const flag = argv[index];
    if (typeof flag !== 'string' || !flag.startsWith('--')) continue;
    args.set(flag.slice(2), argv[index + 1]);
  }
  return args;
}

// Drive one page to one state and photograph it. The half worth keeping.
async function capture(browser, url, state, { expectIsland }) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: SCALE });
  const page = await context.newPage();
  const problems = [];
  page.on('pageerror', (error) => problems.push(String(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(message.text());
  });

  await page.goto(url);

  // Bug 1. Assert what was actually served before trusting a single pixel of it.
  const isIsland = await page.evaluate(() => document.querySelector('astro-island') !== null);
  if (isIsland !== expectIsland) {
    throw new Error(
      `${url} served ${isIsland ? 'the migrated route' : 'the legacy page'}, which is not what was asked for. ` +
        'A sibling .html file in dist/ shadows a directory route; that is what this check exists to catch.',
    );
  }

  await page.evaluate((progress) => {
    localStorage.setItem('shizenryu-progress-v1', JSON.stringify(progress));
  }, SEEDED_PROGRESS(localDayNumber()));
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForTimeout(200);

  await state(page);
  await page.waitForTimeout(200);

  const image = await page.screenshot({ fullPage: true });
  await context.close();
  return { image, problems };
}

async function main() {
  const args = parseArguments(process.argv.slice(2));
  const name = args.get('page');
  const ref = args.get('ref') ?? 'main';
  const port = Number(args.get('port') ?? 4390);
  const page = PAGES[name];

  if (page === undefined) {
    console.error(`Unknown page "${name}". Known pages: ${Object.keys(PAGES).join(', ')}`);
    process.exitCode = 1;
    return;
  }

  // Extracted to a name that cannot shadow the route it is being compared with.
  const legacyName = `__legacy-${name}.html`;
  mkdirSync('dist', { recursive: true });
  writeFileSync(
    join('dist', legacyName),
    execFileSync('git', ['show', `${ref}:${page.legacy}`], { encoding: 'utf8' }),
  );

  // Astro's CLI directly, not `npm run preview`. npm is a wrapper that spawns a
  // grandchild, and killing the wrapper leaves that grandchild holding the port —
  // so every run of this script leaked a server and the next one failed with a
  // misleading "did not start".
  const preview = spawn(process.execPath, ['node_modules/astro/bin/astro.mjs', 'preview', '--port', String(port)], {
    stdio: 'ignore',
  });
  const base = `http://localhost:${port}`;
  const browser = await chromium.launch();
  let differences = 0;

  try {
    await waitForServer(base);
    console.log(`\n${name}: /${name} against ${page.legacy} at ${ref}\n`);

    for (const [stateName, state] of Object.entries(page.states)) {
      const fresh = await capture(browser, base + page.route, state, { expectIsland: true });
      const legacy = await capture(browser, `${base}/${legacyName}`, state, { expectIsland: false });
      const digest = (image) => createHash('sha256').update(image).digest('hex');
      const same = digest(fresh.image) === digest(legacy.image);

      if (!same) {
        differences += 1;
        mkdirSync(OUT, { recursive: true });
        writeFileSync(join(OUT, `${name}-${stateName}-new.png`), fresh.image);
        writeFileSync(join(OUT, `${name}-${stateName}-legacy.png`), legacy.image);
      }

      const errors = [...fresh.problems, ...legacy.problems];
      console.log(
        `  ${stateName.padEnd(10)} ${same ? 'identical' : `DIFFERS  -> ${OUT}/`}` +
          (errors.length > 0 ? `  console errors: ${errors.join(' | ')}` : ''),
      );
    }
  } finally {
    await browser.close();
    stopPreview(preview, port);
    rmSync(join('dist', legacyName), { force: true });
  }

  console.log(
    differences === 0
      ? '\nEvery state is byte-identical.\n'
      : `\n${differences} state(s) differ. Both images written to ${OUT}/ for inspection.\n`,
  );
  process.exitCode = differences === 0 ? 0 : 1;
}

// A leaked preview server holds the port, so the NEXT run of this script fails with
// a misleading "did not start" --- which is exactly what happened while writing it.
//
// Killing the child handle is not enough on Windows: Astro's preview has children of
// its own and the listener survives. So the port is what gets closed, by finding
// whoever holds it. Belt and braces, because the failure mode is confusing and the
// cleanup is cheap.
function stopPreview(preview, port) {
  preview.kill();
  if (process.platform !== 'win32') return;
  try {
    const rows = execFileSync('netstat', ['-ano'], { encoding: 'utf8' })
      .split(String.fromCharCode(10))
      .filter((row) => row.includes('LISTENING') && row.includes(`:${port} `));
    const pids = new Set(rows.map((row) => row.trim().split(/\s+/).pop()).filter(Boolean));
    for (const pid of pids) {
      execFileSync('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore' });
    }
  } catch {
    // Nothing listening, or already gone. Either is the outcome we wanted.
  }
}

async function waitForServer(base) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(base);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`preview server did not start on ${base}`);
}

await main();
