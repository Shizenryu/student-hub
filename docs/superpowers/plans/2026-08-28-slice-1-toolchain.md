# Slice 1 — Toolchain and Strangler Baseline: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put an Astro + TypeScript + Vitest toolchain under the existing site so Netlify builds it, while the six existing pages continue to serve byte-for-byte identically.

**Architecture:** Strangler pattern. The six legacy pages move verbatim into Astro's `publicDir`, which Astro copies to the build output without transformation, so their URLs and bytes are unchanged. A single real Astro route (`404.astro`) proves the render pipeline. Later slices move pages out of `public/` and into `src/pages/` one at a time; `public/` is empty by slice 6.

**Tech Stack:** Astro (static), React (islands, from slice 4), TypeScript strict, Vitest (node), Vitest Browser Mode + Playwright (Chromium), GitHub Actions, Netlify.

**Spec:** `docs/superpowers/specs/2026-08-28-productionise-student-hub-design.md`

## Global Constraints

- **Zero runtime dependencies of our own.** Direct deps limited to: `astro`, `@astrojs/react`, `react`, `react-dom`. Everything else is `devDependencies`.
- **No third-party scripts, no analytics, no CDN.** Every asset self-hosted.
- **Node pinned to 22** via `.nvmrc` and Netlify `NODE_VERSION`.
- **No content changes in this slice.** Not one byte of martial content is edited, reformatted, or reordered. `public/assets/data.js` moves and is otherwise untouched.
- **Pixel-faithful.** Nothing students see may change in this slice.
- **Path comparisons must normalise separators.** Development is on Windows, CI is Linux; any test comparing file paths converts `path.sep` to `/`.
- **Adapter deferred.** `@astrojs/netlify` is NOT installed in this slice — it arrives in slice 7 where `staticHeaders` is needed for CSP. Plain static output to `dist/`.
- **Security headers unchanged in this slice.** The three existing headers in `netlify.toml` are preserved exactly; hardening is slice 7.

---

### Task 1: Astro project skeleton and Netlify build

**Files:**
- Create: `package.json`, `astro.config.mjs`, `.nvmrc`, `src/pages/404.astro`
- Modify: `.gitignore`, `netlify.toml`
- Move: `site/*` → `public/*`

**Interfaces:**
- Consumes: nothing (first task).
- Produces: `npm run build` emits `dist/`; `npm run dev` serves locally; `public/` holds the six legacy pages and all assets.

- [ ] **Step 1: Initialise the package manifest**

Create `package.json`:

```json
{
  "name": "shizenryu-student-hub",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=22" },
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview"
  },
  "dependencies": {
    "astro": "^5.0.0",
    "@astrojs/react": "^4.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0"
  }
}
```

- [ ] **Step 2: Install dependencies**

Run: `npm install`

Expected: `package-lock.json` created, `node_modules/` populated, no errors.

If the installed major versions differ from the carets above, update `package.json` to match what npm actually resolved rather than forcing a downgrade — then note the resolved versions in the PR description.

- [ ] **Step 3: Pin the Node version**

Create `.nvmrc` containing exactly one line:

```
22
```

- [ ] **Step 4: Add the Astro config**

Create `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

export default defineConfig({
  output: 'static',
  integrations: [react()],
});
```

`publicDir` is left at its default of `./public`. Astro copies that directory to the build output as-is, with no transformation or bundling — which is exactly what keeps the legacy pages byte-identical.

- [ ] **Step 5: Ignore build artefacts**

Replace `.gitignore` with:

```
.DS_Store
Thumbs.db
desktop.ini
*.log

node_modules/
dist/
.astro/
test-results/
```

- [ ] **Step 6: Move the legacy site into public/**

Run from the repository root:

```bash
mkdir -p public
git mv site/index.html site/quiz.html site/flashcards.html site/belts.html site/kata.html site/practice.html public/
git mv site/assets public/assets
git mv site/docs public/docs
rmdir site
```

- [ ] **Step 7: Verify the move was a pure rename**

Run: `git diff --cached --stat -M`

Expected: every line reports a rename with 100% similarity. **If any file shows added or removed lines, stop** — a page has been modified and the pixel-faithful constraint is broken.

- [ ] **Step 8: Add the 404 route**

Create `src/pages/404.astro`. This is the only real Astro route in this slice; it exists so the build has something to render, and because Netlify serves a top-level `404.html` automatically for unmatched paths.

```astro
---
const title = 'Not found — Shizenryu Karate';
---
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="That page could not be found on the Shizenryu Karate student hub.">
<link rel="icon" href="/assets/img/icon.png">
<link rel="apple-touch-icon" href="/assets/img/icon.png">
<style>
  *{box-sizing:border-box; margin:0; padding:0;}
  body{font-family:-apple-system,'Segoe UI',Roboto,Arial,sans-serif; background:#faf7f2; color:#222;
       min-height:100vh; display:flex; justify-content:center;}
  .app{width:100%; max-width:520px; padding:28px 16px 40px; text-align:center;}
  h1{font-size:1.7rem; letter-spacing:.14em; color:#161616; margin-top:40px;}
  .sub{font-size:.75rem; letter-spacing:.25em; color:#C8102E; text-transform:uppercase; margin:10px 0 22px;}
  p{font-size:.92rem; color:#555; line-height:1.6;}
  a{display:inline-block; margin-top:22px; font-size:.8rem; color:#999;}
</style>
</head>
<body>
  <div class="app">
    <h1>Not Found</h1>
    <div class="sub">Shizenryu Karate</div>
    <p>That page isn't here. It may have moved, or the link may be mistyped.</p>
    <a href="/">← Shizenryu home</a>
  </div>
</body>
</html>
```

- [ ] **Step 9: Point Netlify at the build**

Replace `netlify.toml` with:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "22"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
```

The three headers are copied verbatim from the previous file. Do not add, remove or reword any of them — header hardening is slice 7.

- [ ] **Step 10: Build and check the output by hand**

Run: `npm run build`

Expected: build succeeds and `dist/` contains `index.html`, `quiz.html`, `flashcards.html`, `belts.html`, `kata.html`, `practice.html`, `404.html`, `assets/`, `docs/`.

- [ ] **Step 11: Preview and click through**

Run: `npm run preview`

Open the printed URL and check each of the six pages loads, the quiz starts, a flashcard flips, and `belts.html#5th-kyu` still deep-links. Then open a nonsense path and confirm the 404 page renders.

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json astro.config.mjs .nvmrc .gitignore netlify.toml src/pages/404.astro public/
git commit -m "build: put Astro under the existing site, serving legacy pages from public/"
```

---

### Task 2: Prove the legacy pages survive the build untouched

**Files:**
- Create: `tests/build/public-passthrough.test.ts`
- Modify: `package.json` (add `vitest`, add `test` script)

**Interfaces:**
- Consumes: `dist/` produced by `npm run build` (Task 1).
- Produces: `npm test` runs the node test suite. Later slices add files under `tests/unit/`.

This is the regression test for the strangler mechanism. It is the thing that catches "the build quietly mangled a page" — the single biggest risk in this slice.

- [ ] **Step 1: Add Vitest**

Run: `npm install -D vitest`

Then add to the `scripts` block in `package.json`:

```json
"test": "vitest run --config vitest.config.ts"
```

- [ ] **Step 2: Add the Vitest config**

Create `vitest.config.ts`:

```ts
/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/build/**/*.test.ts'],
    environment: 'node',
  },
});
```

`getViteConfig` is Astro's documented way to give Vitest the project's Vite settings, so tests resolve imports the same way the build does.

- [ ] **Step 3: Write the failing test**

Create `tests/build/public-passthrough.test.ts`:

```ts
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';

const PUBLIC_DIR = 'public';
const DIST_DIR = 'dist';

const LEGACY_PAGES = [
  'index.html',
  'quiz.html',
  'flashcards.html',
  'belts.html',
  'kata.html',
  'practice.html',
];

const LEGACY_ASSETS = [
  'assets/data.js',
  'assets/store.js',
  'assets/img/icon.png',
  'assets/img/ki.png',
  'assets/img/shizenryu-calligraphy.png',
  'docs/belt-passport.pdf',
  'docs/philosophy-guide.pdf',
  'docs/study-guides.pdf',
];

async function filesUnder(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'));
}

async function sha256(path: string): Promise<string> {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

describe('legacy pages served through public/', () => {
  beforeAll(() => {
    if (!existsSync(DIST_DIR)) {
      throw new Error('dist/ is missing — run `npm run build` before this test');
    }
  });

  it('ships every legacy page and asset', async () => {
    const built = await filesUnder(DIST_DIR);
    expect(built).toEqual(expect.arrayContaining([...LEGACY_PAGES, ...LEGACY_ASSETS]));
  });

  it('copies every public file into the build byte-for-byte', async () => {
    const sources = await filesUnder(PUBLIC_DIR);
    expect(sources.length).toBeGreaterThan(0);

    for (const file of sources) {
      const source = await sha256(join(PUBLIC_DIR, file));
      const built = await sha256(join(DIST_DIR, file));
      expect(built, `${file} changed during the build`).toBe(source);
    }
  });

  it('renders the 404 route Astro owns', async () => {
    const built = await filesUnder(DIST_DIR);
    expect(built).toContain('404.html');
  });
});
```

The `.split(sep).join('/')` normalisation is load-bearing: without it this suite passes on Windows and fails in CI, or the reverse.

- [ ] **Step 4: Run the test to verify it fails**

Run: `rm -rf dist && npm test`

Expected: FAIL with "dist/ is missing — run `npm run build` before this test". This confirms the guard works and the suite is genuinely coupled to a real build.

- [ ] **Step 5: Build, then run the test to verify it passes**

Run: `npm run build && npm test`

Expected: PASS, 3 tests.

- [ ] **Step 6: Prove the test detects tampering**

Temporarily append a blank line to `dist/quiz.html`, then run `npm test`.

Expected: FAIL with "quiz.html changed during the build".

Then restore with `npm run build` and confirm the suite is green again. Do not commit the tampered file.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts tests/build/public-passthrough.test.ts
git commit -m "test: assert public/ reaches the build byte-for-byte"
```

---

### Task 3: TypeScript in strict mode

**Files:**
- Create: `tsconfig.json`
- Modify: `package.json` (add `typescript`, `@astrojs/check`)

**Interfaces:**
- Consumes: nothing.
- Produces: `npm run typecheck` fails the build on any type error. Every later slice relies on this.

- [ ] **Step 1: Add the type checker**

Run: `npm install -D typescript @astrojs/check`

`astro check` is Astro's type checker; it understands `.astro` files, which `tsc` alone does not.

Then add to the `scripts` block in `package.json`:

```json
"typecheck": "astro check"
```

The script is added here rather than in Task 1 so it never exists before the tool it invokes.

- [ ] **Step 2: Add the TypeScript config**

Create `tsconfig.json`:

```json
{
  "extends": "astro/tsconfigs/strict",
  "include": [".astro/types.d.ts", "**/*"],
  "exclude": ["dist", "node_modules"],
  "compilerOptions": {
    "strictNullChecks": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "noFallthroughCasesInSwitch": true,
    "verbatimModuleSyntax": true,
    "jsx": "react-jsx",
    "jsxImportSource": "react"
  }
}
```

`noUncheckedIndexedAccess` matters more than usual here: the quiz code indexes into term and kumite arrays constantly, and slice 6 depends on the compiler forcing those lookups to be checked.

- [ ] **Step 3: Run the type check to see it pass on a clean tree**

Run: `npm run typecheck`

Expected: `0 errors`.

- [ ] **Step 4: Prove the strict flags are actually on**

Create a scratch file `src/strictness-probe.ts`:

```ts
const terms: string[] = ['jun-zuki'];
const first: string = terms[0];
export { first };
```

Run: `npm run typecheck`

Expected: FAIL — `Type 'string | undefined' is not assignable to type 'string'`. This proves `noUncheckedIndexedAccess` is in force rather than merely written down.

- [ ] **Step 5: Remove the probe and confirm green**

Run: `rm src/strictness-probe.ts && npm run typecheck`

Expected: `0 errors`.

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json tsconfig.json
git commit -m "build: enable TypeScript strict mode with astro check"
```

---

### Task 4: Browser test harness

**Files:**
- Create: `vitest.browser.config.ts`, `tests/browser/harness.test.tsx`
- Modify: `package.json` (add browser test deps and script)

**Interfaces:**
- Consumes: React from Task 1.
- Produces: `npm run test:browser` runs Vitest Browser Mode against real Chromium. Slice 4 adds the first island test here.

Two config files rather than one with projects: the browser suite needs the React plugin and the node suite needs Astro's Vite config, and keeping them separate makes each one debuggable on its own.

- [ ] **Step 1: Install the browser test dependencies**

Run:

```bash
npm install -D @vitest/browser playwright vitest-browser-react @vitejs/plugin-react
```

- [ ] **Step 2: Install the Chromium binary**

Run: `npx playwright install --with-deps chromium`

- [ ] **Step 3: Add the browser Vitest config**

Create `vitest.browser.config.ts`:

```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['tests/browser/**/*.test.tsx'],
    browser: {
      enabled: true,
      headless: true,
      provider: 'playwright',
      instances: [{ browser: 'chromium' }],
    },
  },
});
```

- [ ] **Step 4: Add the script**

Add to `scripts` in `package.json`:

```json
"test:browser": "vitest run --config vitest.browser.config.ts"
```

- [ ] **Step 5: Write the failing test**

Create `tests/browser/harness.test.tsx`. This is a canary for the harness, not a test of product behaviour — it stays until slice 4 replaces it with real island tests.

```tsx
import { expect, test } from 'vitest';
import { render } from 'vitest-browser-react';

function StreakChip({ days }: { days: number }) {
  return <span role="status">{days}-day streak</span>;
}

test('renders a React component in a real browser', async () => {
  const screen = render(<StreakChip days={3} />);
  await expect.element(screen.getByRole('status')).toBeVisible();
  await expect.element(screen.getByText('3-day streak')).toBeVisible();
});
```

- [ ] **Step 6: Run the test to verify it fails**

Temporarily change `{days}-day streak` to `{days} day streak` (no hyphen), then run:

`npm run test:browser`

Expected: FAIL — `getByText('3-day streak')` finds no element. This proves the assertion is real rather than vacuously passing.

- [ ] **Step 7: Restore and run to verify it passes**

Put the hyphen back, then run: `npm run test:browser`

Expected: PASS, 1 test, and the run reports Chromium as the browser.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json vitest.browser.config.ts tests/browser/harness.test.tsx
git commit -m "test: add Vitest Browser Mode harness on Chromium"
```

---

### Task 5: Continuous integration

**Files:**
- Create: `.github/workflows/ci.yml`

**Interfaces:**
- Consumes: `typecheck`, `build`, `test`, `test:browser` scripts from Tasks 1–4.
- Produces: every PR is gated on type checking, a successful build, the node suite and the browser suite.

- [ ] **Step 1: Write the workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version-file: .nvmrc
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npm run typecheck

      - name: Build
        run: npm run build

      - name: Node tests
        run: npm test

      - name: Install Chromium
        run: npx playwright install --with-deps chromium

      - name: Browser tests
        run: npm run test:browser
```

Order matters: `build` runs before `npm test` because the passthrough suite asserts against `dist/`.

- [ ] **Step 2: Verify the workflow locally in the same order**

Run:

```bash
npm ci && npm run typecheck && npm run build && npm test && npm run test:browser
```

Expected: all five commands succeed. If `npm test` fails here but passed earlier, the build step is missing or ordered wrongly.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: gate PRs on typecheck, build, node tests and browser tests"
```

---

### Task 6: Documentation — the doctrine that just changed

**Files:**
- Modify: `README.md`, `CLAUDE.md`

**Interfaces:**
- Consumes: the scripts defined in Tasks 1–4.
- Produces: correct onboarding instructions. Nothing depends on this in code, but everything depends on it in practice.

`CLAUDE.md` currently states "No build step. No framework. No dependencies… every page must also work opened directly from disk (file://)." All four clauses are now false. Leaving them would actively mislead both the maintainer and every future agent session.

- [ ] **Step 1: Rewrite the README "Working on this repo" section**

Replace the existing section with:

````markdown
## Working on this repo

You need [Node 22](https://nodejs.org). Then:

```bash
npm ci        # install exactly the locked dependencies
npm run dev   # local site at http://localhost:4321
```

| Command | What it does |
|---|---|
| `npm run dev` | Local development server with live reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` exactly as Netlify will |
| `npm run typecheck` | TypeScript and Astro type checking |
| `npm test` | Node tests (run `npm run build` first) |
| `npm run test:browser` | Browser tests in Chromium |

Pages cannot be opened directly from disk any more — use `npm run dev`.

Netlify builds the site from source on every push to `main`; nothing generated is
committed.
````

- [ ] **Step 2: Replace the Architecture section of CLAUDE.md**

Replace the paragraph beginning "**No build step. No framework. No dependencies.**" with:

```markdown
**Astro, TypeScript, no runtime dependencies of our own.** The site is built by
Netlify from source on every push to `main`; `dist/` is never committed. Static
pages ship zero JavaScript; the three interactive pages (quiz, flashcards,
practice) are React islands.

Pages no longer open from `file://` — run `npm run dev`. See README.md.

Migration in progress: pages not yet ported live untouched in `public/`, which
Astro copies to the build output verbatim. That directory shrinks to empty as
slices land, and this note is deleted with the last page.

Do not add runtime dependencies, third-party scripts, analytics, or CDN assets.
That constraint has not changed and is what keeps this site cheap to own.
```

- [ ] **Step 3: Update the file-tree block in CLAUDE.md**

Replace the existing tree with:

```
public/            legacy pages, served verbatim, shrinking each slice
├── index.html  quiz.html  flashcards.html  belts.html  kata.html  practice.html
├── assets/         data.js, store.js, img/
└── docs/           printable PDFs
src/
└── pages/404.astro
tests/
├── build/          build-output assertions
└── browser/        Vitest Browser Mode
astro.config.mjs  tsconfig.json  vitest.config.ts  vitest.browser.config.ts
netlify.toml      build command and publish directory
```

- [ ] **Step 4: Check the docs against reality**

Run each command in the README table in a clean clone:

```bash
git clone . /tmp/hub-check && cd /tmp/hub-check && npm ci && npm run dev
```

Expected: the dev server starts and the site loads. Any command in the table that does not work as documented is a bug in this task, not a follow-up.

Then remove the clone: `rm -rf /tmp/hub-check`

- [ ] **Step 5: Commit**

```bash
git add README.md CLAUDE.md
git commit -m "docs: replace the no-build-step doctrine with the Astro toolchain"
```

---

## Definition of done for this slice

- [ ] `npm ci && npm run typecheck && npm run build && npm test && npm run test:browser` passes from a clean clone.
- [ ] `git diff --stat -M main` shows the six legacy pages as pure renames, 100% similarity.
- [ ] Netlify deploy preview renders all six pages, and the quiz, flashcards and practice pages still work.
- [ ] `belts.html#5th-kyu` and `kata.html#sanchin` still deep-link.
- [ ] No content file has been edited.

## Mutation gate

Per the project definition of a phase as one PR review boundary, this slice records
**`N/A` for mutation testing** with configuration and integration evidence instead:
the passthrough suite in Task 2, proven to detect tampering in Step 6; the strictness
probe in Task 3, Step 4; the deliberately broken assertion in Task 4, Step 6; and a
green CI run.

This slice is almost entirely configuration. There is no behavioural logic to mutate —
fabricating a score here would be theatre.

## What this slice deliberately does not do

- No CSP or header hardening — slice 7, once `public/` is empty and no inline scripts remain.
- No `@astrojs/netlify` adapter — installed in slice 7 where `staticHeaders` is needed.
- No content migration, no schemas — slice 2.
- No linting rules banning `innerHTML` — meaningless while the legacy pages still use it.
- No `site` URL or sitemap — slice 3, with the first real content routes.
