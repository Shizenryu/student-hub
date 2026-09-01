# Slice 2b — Design Tokens, Shared Shell, and the First Real Route: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-written `public/belts.html` with real Astro routes rendered from the migrated content, extracting the design system into tokens on the way — without students seeing anything change except the URL.

**Architecture:** `belts.html` is currently a single-page app: one document with a `#menu` view and a `#guide` view, switched by hash. It becomes two static routes — `/belts` for the list and `/belts/[slug]` for each belt — generated at build time from `src/data`. Prev/next stop being JavaScript and become ordinary links. Both pages ship zero JavaScript.

The one exception is a small script that upgrades legacy `#slug` bookmarks, which exists only because URL fragments never reach the server and so cannot be redirected by Netlify alone.

**Tech Stack:** Astro static routes, plain CSS custom properties, TypeScript strict, Vitest (node + Browser Mode). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-28-productionise-student-hub-design.md`
**Predecessor:** `docs/superpowers/plans/2026-09-01-slice-2a-content-migration.md`

## Global Constraints

- **Zero runtime dependencies of our own.** Direct deps stay exactly: `astro`, `@astrojs/react`, `react`, `react-dom`.
- **Pixel-faithful.** The rendered belt guide must be visually indistinguishable from today's. Tokens capture the CURRENT values including their inconsistencies — `.app` is `max-width:560px` on this page even though other pages use 480px and 520px. Do not normalise anything; slice 9 owns that, deliberately and reviewably.
- **No content changes.** `src/data/*.json` and `public/assets/data.js` are read-only. The parity and integrity checks must keep passing untouched.
- **No type assertions and no `any`.** Type guards only. `noUncheckedIndexedAccess` is on, and `TERMS[tier]` is therefore possibly undefined — Task 2 adds an accessor for this rather than letting anyone reach for `as`.
- **Display rules are preserved exactly.** The syllabus stores the abbreviation `JJ`; every display layer expands it to `Jiu Jitsu (JJ)`. See CLAUDE.md's content rules. Losing this silently changes what students read.
- **No inline `<script>` or `<style>` in any new route.** Slice 7 turns on a strict CSP with no `unsafe-inline`; anything inline now becomes a rewrite then.
- **TypeScript strict unchanged.** Node pinned to 22. Path comparisons normalise separators.

## What the current page does, exactly

Read from `public/belts.html` before writing this plan. The new routes must reproduce all of it.

| Behaviour | Detail |
|---|---|
| Belt list | 12 belts in syllabus order, two-column grid, each button coloured `g.hex` with text `#fff` when `g.white` else `#1A1A1A`, labelled `g.key` |
| Banner | background `g.hex`, same text-colour rule, showing `g.banner` on the left and the literal `STUDY GUIDE` on the right |
| Syllabus list | `SYLLABUS` filtered to `s.grade === g.key`, in order. A `section` heading is emitted only when it differs from the previous row |
| Track tags | `Adult` renders `ADULTS 16+` in blue `#0072CE`; `Junior` renders `JUNIORS` in orange `#ED8B00`; `All` renders no tag |
| Abbreviations | `item` and `detail` both pass through `expand()`: `/\bJJ\b/g` → `Jiu Jitsu (JJ)` |
| Key terms | `TERMS[g.tier]` as japanese/english pairs in a two-column grid, japanese bolded and coloured `--dark` |
| Mind | `g.mind` in a gold-bordered panel, with `g.maxim` beneath in italic red, wrapped in curly quotes |
| Navigation | Previous/next belt, disabled at each end of the list |
| Footer | `← Shizenryu home` linking to the site root, then `Structure > Discipline > Measure = Growth` |

---

### Task 1: Design tokens and the shared page shell

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/app.css`
- Create: `src/layouts/PageShell.astro`
- Create: `tests/unit/tokens.test.ts`

**Interfaces:**
- Produces: `PageShell.astro`, taking props `{ title: string; description: string; heading: string; subheading: string; maxWidth?: string }`. It owns `<head>`, the `.app` wrapper, the `<header>` block and the `<footer>`, and renders page content through `<slot />`. Task 2's routes use it and add no `<head>` of their own.
- Produces: `tokens.css` as the single source of the design system's colour, radius and shadow values.

- [ ] **Step 1: Write the token sheet**

Create `src/styles/tokens.css`. These values are transcribed from the existing pages — they are what the site already uses, not new choices.

```css
/* The Shizenryu design system, as it actually is today.
   Values are transcribed from the hand-written pages so the migration renders
   identically. Where pages currently disagree with each other — .app max-width
   is 480px on quiz, 520px on index, 560px on belts and kata — that drift is
   deliberately NOT resolved here. Slice 9 normalises it as its own reviewable
   change, so that any visual difference during the migration is a bug rather
   than a decision. */
:root {
  --red: #C8102E;
  --dark: #161616;
  --paper: #faf7f2;
  --gold: #9A7D00;
  --good: #1e8a4c;
  --bad: #c0392b;

  --ink: #222;
  --ink-soft: #444;
  --muted: #888;
  --muted-light: #999;
  --faint: #bbb;
  --rule: #f0ebe2;

  --surface: #fff;
  --surface-warm: #fbf7f1;

  --track-adult: #0072CE;
  --track-junior: #ED8B00;

  --radius-card: 14px;
  --radius-control: 10px;
  --radius-banner: 12px;
  --radius-tag: 6px;

  --shadow-card: 0 2px 10px rgba(0, 0, 0, .08);

  --font-stack: -apple-system, 'Segoe UI', Roboto, Arial, sans-serif;
}
```

- [ ] **Step 2: Write the shared component styles**

Create `src/styles/app.css` holding only what is genuinely shared across pages — the reset, `body`, `.app`, `header`, `.card` and `footer`. Transcribe the declarations from `public/belts.html`'s `<style>` block exactly, substituting the tokens above where a literal value matches a token. Belt-specific rules stay in Task 2's route, not here.

The `.app` rule takes its width from a custom property so a page can set its own without a new class:

```css
.app { width: 100%; max-width: var(--app-max, 520px); padding: 20px 16px 40px; }
```

- [ ] **Step 3: Write the failing token test**

Create `tests/unit/tokens.test.ts`. This pins the values that must not drift during the migration.

```ts
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const TOKENS_PATH = 'src/styles/tokens.css';

// Transcribed from the hand-written pages before migration. If a value here has to
// change, the rendered site changed too — which during this slice means a bug.
const REQUIRED_TOKENS: ReadonlyArray<readonly [name: string, value: string]> = [
  ['--red', '#C8102E'],
  ['--dark', '#161616'],
  ['--paper', '#faf7f2'],
  ['--gold', '#9A7D00'],
  ['--track-adult', '#0072CE'],
  ['--track-junior', '#ED8B00'],
  ['--rule', '#f0ebe2'],
  ['--surface-warm', '#fbf7f1'],
  ['--radius-card', '14px'],
  ['--shadow-card', '0 2px 10px rgba(0, 0, 0, .08)'],
];

describe('design tokens match the site as built by hand', () => {
  it.each(REQUIRED_TOKENS)('defines %s as %s', async (name, value) => {
    const css = await readFile(TOKENS_PATH, 'utf8');
    expect(css).toContain(`${name}: ${value};`);
  });

  it('defines every token the stylesheets reference', async () => {
    const tokens = await readFile(TOKENS_PATH, 'utf8');
    const app = await readFile('src/styles/app.css', 'utf8');

    const names = (source: string, pattern: RegExp): string[] =>
      [...source.matchAll(pattern)]
        .map((match) => match[1])
        .filter((name): name is string => name !== undefined);

    const defined = new Set(names(tokens, /^\s*(--[\w-]+):/gm));
    const used = names(app, /var\((--[\w-]+)/g);

    for (const name of used) {
      expect(defined, `app.css uses ${name}, which tokens.css does not define`).toContain(name);
    }
  });
});
```

Note the second test deliberately reads both files rather than trusting a list — the same lesson as slice 2a's coverage check, where comparing a literal against itself proved nothing.

- [ ] **Step 4: Run the test to verify it fails, then passes**

Run: `npm test`

Before `tokens.css` exists this fails on a missing file. After Steps 1–2 it passes. Report both.

- [ ] **Step 5: Write the page shell**

Create `src/layouts/PageShell.astro`. It imports both stylesheets, and reproduces the `<head>`, header and footer of the existing pages exactly — including the two icon links, the viewport meta, and the footer's two lines. Asset paths must be ROOT-RELATIVE (`/assets/img/icon.png`), because a nested route like `/belts/5th-kyu` resolves a relative path against its own directory and the icon would 404. CLAUDE.md records this rule.

Props: `title`, `description`, `heading`, `subheading`, and optional `maxWidth` which sets `--app-max` on the `.app` element.

- [ ] **Step 6: Commit**

```bash
git add src/styles src/layouts tests/unit/tokens.test.ts
git commit -m "feat: extract design tokens and a shared page shell"
```

---

### Task 2: The belt routes

**Files:**
- Create: `src/pages/belts/index.astro`, `src/pages/belts/[slug].astro`
- Create: `src/components/BeltGuide.astro`
- Modify: `src/data/index.ts` (add `termsForTier`)
- Create: `tests/unit/belts-content.test.ts`, `tests/browser/belts.test.tsx`

**Interfaces:**
- Consumes: `PageShell.astro` from Task 1; `GRADES`, `SYLLABUS`, `TERMS` from `src/data`.
- Produces: `termsForTier(tier: number): readonly TermPair[]` exported from `src/data/index.ts`.

- [ ] **Step 1: Add the terms accessor**

`noUncheckedIndexedAccess` makes `TERMS[String(grade.tier)]` possibly `undefined`, and the tempting fix is a type assertion — which this project bans. Add a narrowing accessor to `src/data/index.ts` instead:

```ts
export function termsForTier(tier: number): readonly TermPair[] {
  const pairs = TERMS[String(tier)];
  if (!pairs) {
    throw new Error(`No terminology tier ${tier} — content integrity should have caught this`);
  }
  return pairs;
}
```

The throw is genuinely unreachable: `assertContentIntegrity()` already fails the build when a belt points at a missing tier. The function exists so consumers get a non-optional value honestly, rather than by assertion.

- [ ] **Step 2: Write the failing content test**

Create `tests/unit/belts-content.test.ts`, covering the two pure rules the route depends on. Put the abbreviation expansion in a real module so it can be tested — do not inline it in the template.

```ts
import { describe, expect, it } from 'vitest';

import { GRADES, termsForTier } from '../../src/data';
import { expandAbbreviations } from '../../src/data/display';

describe('syllabus abbreviations are expanded for display', () => {
  it('expands JJ to its full name', () => {
    expect(expandAbbreviations('JJ throws')).toBe('Jiu Jitsu (JJ) throws');
  });

  it('expands every occurrence in a line', () => {
    expect(expandAbbreviations('JJ and JJ')).toBe('Jiu Jitsu (JJ) and Jiu Jitsu (JJ)');
  });

  it('leaves JJ inside a longer word alone', () => {
    expect(expandAbbreviations('JJUMP')).toBe('JJUMP');
  });

  it('leaves text without the abbreviation untouched', () => {
    expect(expandAbbreviations('Mae-geri')).toBe('Mae-geri');
  });
});

describe('every belt can render', () => {
  it.each(GRADES.map((grade) => grade.slug))('%s has terminology', (slug) => {
    const grade = GRADES.find((entry) => entry.slug === slug);
    expect(grade).toBeDefined();
    if (!grade) return;
    expect(termsForTier(grade.tier).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 3: Run to verify it fails**

Run: `npm test`

Expected: FAIL — `src/data/display` does not exist.

- [ ] **Step 4: Write the display module**

Create `src/data/display.ts`:

```ts
// The syllabus keeps its own wording ("JJ"); every display layer expands it.
// See CLAUDE.md's content rules — losing this silently changes what students read.
export function expandAbbreviations(text: string): string {
  return text.replace(/\bJJ\b/g, 'Jiu Jitsu (JJ)');
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `npm test`. Expected: PASS.

- [ ] **Step 6: Build the guide component and the two routes**

Create `src/components/BeltGuide.astro` rendering the banner, syllabus list, key terms, mind panel and prev/next navigation for one belt, reproducing the table in "What the current page does, exactly" precisely. Section headings appear only when the section changes from the previous row. Prev/next are `<a>` elements to the neighbouring belt's URL, and are rendered as disabled-looking spans at the ends rather than links — matching the current disabled buttons.

Create `src/pages/belts/index.astro` — the belt list, 12 buttons as links to `/belts/<slug>`, plus the explanatory paragraph the current menu shows.

Create `src/pages/belts/[slug].astro` with `getStaticPaths()` returning one entry per grade, rendering `BeltGuide`.

Both use `PageShell` with `maxWidth="560px"`, matching today's belts page.

All belt-specific CSS lives in these components' own `<style>` blocks, which Astro extracts into real stylesheets — this is not inline CSS and is CSP-safe.

- [ ] **Step 7: Verify the build produces every belt**

Run: `npm run build`

Expected: `dist/belts/index.html` plus one directory per belt slug — `dist/belts/9th-kyu/index.html` and so on, 12 in total.

- [ ] **Step 8: Write the browser test**

Create `tests/browser/belts.test.tsx` driving the built pages through Vitest Browser Mode. Assert: the list page shows 12 belts; a belt page shows its banner text, at least one syllabus row, a key term, and the maxim; the abbreviation expansion is visible where the syllabus uses `JJ`; and prev/next navigate to the neighbouring belts with the ends non-navigable.

If serving `dist/` from the browser test proves awkward, assert against the built HTML files directly in a node test instead, and say so in your report — the requirement is that the behaviour is pinned, not the mechanism.

- [ ] **Step 9: Commit**

```bash
git add src/pages/belts src/components/BeltGuide.astro src/data/display.ts src/data/index.ts tests/unit/belts-content.test.ts tests/browser/belts.test.tsx
git commit -m "feat: render belt study guides as static routes"
```

---

### Task 3: Retire the legacy page

**Files:**
- Delete: `public/belts.html`
- Modify: `tests/build/legacy-content.sha256`, `tests/build/public-passthrough.test.ts`, `netlify.toml`
- Modify: `src/pages/belts/index.astro` (add the bookmark shim — see Step 3)
- Modify: `CLAUDE.md`, `README.md`

**Interfaces:**
- Consumes: the routes from Task 2.
- Produces: no legacy belts page; old links still resolve.

- [ ] **Step 1: Delete the legacy page and its checksum entry**

Run: `git rm public/belts.html`

Then remove the `belts.html` line from `tests/build/legacy-content.sha256`. Leave every other line untouched.

Run: `npm run build` then `npm test`.

Expected: PASS. The two manifest tests keep each other honest — one asserts every file in `public/` has an entry, the other asserts every entry has a file — so deleting one without the other fails. Confirm you saw them pass together.

- [ ] **Step 2: Close the shadow-guard gap**

`tests/build/public-passthrough.test.ts` skips any route path containing `[`, so `src/pages/belts/[slug].astro` is never compared against a surviving `public/belts.html`. Nothing would have reminded you to do Step 1.

Extend the guard: a dynamic route inside `src/pages/<name>/` claims the URL `<name>`, so it must also be checked against `public/<name>.html`. Derive the claimed URL by dropping any path segment containing `[`, then compare as the existing check does.

PROVE IT: restore `public/belts.html` temporarily (`git checkout HEAD~1 -- public/belts.html`), run `npm test`, and confirm the guard now FAILS naming the pair. Then delete it again and confirm green. Report both outputs.

- [ ] **Step 3: Preserve old bookmarks**

`belts.html#5th-kyu` may be bookmarked. Fragments are never sent to the server, so a redirect alone cannot resolve them — but browsers do carry the fragment across a redirect.

Add to `netlify.toml`, after the existing `[build]` blocks and before the headers:

```toml
[[redirects]]
  from = "/belts.html"
  to = "/belts"
  status = 301
```

Then add the shim to `src/pages/belts/index.astro` as a plain `<script>` block. Astro processes and bundles component scripts into an external file rather than inlining them, so this is already CSP-safe and needs no separate module — do NOT place it under `src/pages/`, where a `.ts` file would be treated as an API endpoint route.

The script reads `location.hash`, and if it matches a known belt slug, replaces the location with `/belts/<slug>`. Pass the valid slugs in from the frontmatter via `define:vars` or a data attribute rather than hardcoding them. Guard it so an unknown or absent fragment does nothing and the list simply renders.

After building, confirm the emitted script is a separate file under `dist/_astro/` and that no `<script>` in `dist/belts/index.html` has inline content. If Astro does inline it, say so in your report — that would need solving before slice 7 rather than after.

Verify by building, serving `dist/` with `npm run preview`, and visiting `/belts.html#5th-kyu`. Report where you land.

- [ ] **Step 4: Update the documentation**

`CLAUDE.md`'s file tree still shows `public/` holding six pages; it now holds five. Its migration note should say which page has moved. `README.md`'s page table lists `public/belts.html` — that row now points at `/belts`.

Also record, in CLAUDE.md's architecture section, that belt pages are now static routes with real URLs and that `belts.html` redirects for old links.

- [ ] **Step 5: Full gate**

Run in order, separately: `npm run typecheck`, `npm run build`, `npm test`, `npm run test:browser`, `npm audit --audit-level=high`.

Confirm `git status --short` is clean and `git status --short public` shows only the deletion.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: retire the legacy belts page, redirecting old links"
```

---

## Definition of done for this slice

- [ ] `npm ci && npm run typecheck && npm run build && npm test && npm run test:browser` passes from a clean clone.
- [ ] `/belts` and all 12 `/belts/<slug>` pages render, ship zero JavaScript apart from the bookmark shim on the list page, and are visually indistinguishable from today's guide.
- [ ] `public/belts.html` is gone, its checksum entry with it, and `/belts.html#5th-kyu` still reaches the right belt.
- [ ] The shadow guard was observed failing when a legacy page survives its migrated route.
- [ ] The `JJ` expansion is preserved and tested.
- [ ] `src/data/*.json` and `public/assets/data.js` are untouched; parity and integrity still pass.
- [ ] No type assertions, no `any`, no new dependencies.

## Mutation gate

Run mutation testing over `src/data/display.ts` and the new `termsForTier`, plus the section-heading logic in `BeltGuide.astro` if the harness can reach it. Slice 2a's gate was skipped and its final review found four survivors as a result — do not repeat that. Record the result, or `N/A` with the reason, before opening the PR.

## What this slice deliberately does not do

- No changes to quiz, flashcards, practice, index or kata — later slices.
- No normalising of the design-system drift the tokens deliberately preserve — slice 9.
- No CSP or header hardening — slice 7.
- No deletion of `public/assets/data.js` — it still feeds five legacy pages.
