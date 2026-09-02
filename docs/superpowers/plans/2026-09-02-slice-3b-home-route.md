# Slice 3b — The Home Page as a Route: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hand-written `public/index.html` with a real Astro route, and close a day-boundary divergence the streak fix left behind.

**Architecture:** The home page is almost entirely static — a crest, a motto, five navigation tiles, three PDF links and a footer seal. Two things are not: the maxim of the day, and the streak chip. Both must stay client-side. Baking the maxim at build time would freeze it until the next deploy, and the streak lives in the visitor's own `localStorage`.

So the route renders everything static at build time and hands the two dynamic bits to one small external script — the same pattern the bookmark shim already uses, and for the same reason: Astro inlines small component scripts, which a later slice's CSP would reject.

**Tech Stack:** Astro static route, plain CSS custom properties, TypeScript strict, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-28-productionise-student-hub-design.md`

## The divergence this slice closes

`public/index.html` carries its own day calculation:

```js
const day = Math.floor(Date.now() / 86400000);
document.getElementById('maxim').textContent = '“' + MAXIMS[day % MAXIMS.length] + '”';
```

That is the UTC day number — the same formula that was fixed in `store.js` for streaks, because during British Summer Time it rolls over at 1am local rather than midnight.

Fixing `store.js` without fixing this left the home page inconsistent with itself: the streak chip now changes at local midnight while the maxim still changes an hour later. `store.js` already exposes the corrected value as `Store.today()`, so the fix is to use it rather than to write a third copy of the arithmetic.

Consequence worth stating: on the day this ships, the maxim may change one day earlier than it otherwise would have. It is the same maxim for everyone and it self-corrects immediately.

## Global Constraints

- **Zero new dependencies.** Direct deps stay: `astro`, `@astrojs/react`, `react`, `react-dom`.
- **Pixel-faithful.** The rendered page must be visually indistinguishable from today's. `index.html` uses `max-width: 520px` — the shell's default `width`, not `wide`.
- **No martial content changes.** `src/data/*.json` and `public/assets/data.js` are read-only. The maxims, the motto, and every tile's wording are content: transcribe, do not reword.
- **No type assertions, no `any`.** Type guards only. `noUncheckedIndexedAccess` is on.
- **No inline `style=` attributes, no inline `<style>` or `<script>` bodies.** Note `index.html` currently HAS an inline style attribute on the streak chip — it becomes a class.
- **Root-relative asset paths.**
- **Images keep their intrinsic dimensions.** `ki.png` is declared `width="200" height="236"` and displayed at 64px by CSS; the seal likewise. CLAUDE.md's imagery rules explain why: the browser reserves the space so nothing shifts as the page loads.

## What the current page does

| Behaviour | Detail |
|---|---|
| Crest | `ki.png`, intrinsic 200×236, CSS width 64px |
| Headings | `SHIZENRYU`, then `The Natural Way of Karate`, then the motto `Structure > Discipline > Measure / Accountability = Growth` |
| Maxim of the day | `MAXIMS[day % MAXIMS.length]` wrapped in curly quotes, under the label `Maxim of the day` |
| Streak chip | when `Store.streakInfo().count >= 1`: `🔥 N-day training streak`, or `🔥 N-day streak — train today to keep it` when not trained today |
| Train tiles | five: Daily Practice, Dojo Quiz, Philosophy Flashcards, Belt Study Guides, Kata Reference — each with its own gradient class and description |
| Study links | three PDFs with their subtitles and a `PDF` badge |
| Footer seal | `shizenryu-calligraphy.png` at 46px, opacity .4 |

Note the belts and kata tiles already point at `/belts` and `/kata` — earlier slices updated them. The other three still point at legacy pages, which is correct until those migrate.

---

### Task 1: The home route

**Files:**
- Create: `src/pages/index.astro`
- Create: `public/assets/home.js`
- Modify: `src/styles/app.css` or a new `src/styles/home.css`
- Modify: `tests/build/legacy-content.sha256` (new script's checksum)
- Create: `tests/build/home-route.test.ts`

**Interfaces:**
- Consumes: `MAXIMS` from `src/data`; `PageShell` from slice 2b; `Store` from `public/assets/store.js`.
- Produces: `/` rendered statically, with the maxim and streak chip filled in client-side.

- [ ] **Step 1: Build the route**

Read `src/pages/belts/index.astro` and `src/layouts/PageShell.astro` first and follow their conventions.

`PageShell` owns `<head>`, the header and the footer — but the home page's header is different from the inner pages': it has the crest image and a three-line masthead rather than the `h1`/`.sub` pair. Decide deliberately whether to extend `PageShell` with an optional slot or to let this route provide its own masthead, and say which you chose and why. Do NOT duplicate the whole shell to avoid the decision.

Transcribe the tile and PDF markup and copy exactly. Every gradient class, every description, every subtitle.

The streak chip's inline `style` attribute becomes a class in the stylesheet with the same declarations.

Use the design tokens where a literal matches one exactly.

- [ ] **Step 2: Write the client script**

Create `public/assets/home.js` — a plain external file, because Astro inlines component scripts and a later slice's CSP forbids that.

It must:
- read the maxims from a data attribute the route writes, exactly as `legacy-hash.js` reads its slugs — never a hardcoded copy of the content;
- pick the maxim with `Store.today()`, NOT its own `Date.now()` arithmetic. That is the whole point of this slice's divergence fix. If `Store` is unavailable, leave the maxim area empty rather than guessing;
- render the streak chip from `Store.streakInfo()` with the two message forms above;
- do nothing harmful if `localStorage` is unavailable — `store.js` already falls back to memory, so `streakInfo()` returns a zero count and the chip stays empty.

The route loads `/assets/store.js` before it, the same way the legacy page did.

Add the script's checksum line to `tests/build/legacy-content.sha256`.

- [ ] **Step 3: Write the route tests**

Create `tests/build/home-route.test.ts` asserting against the BUILT `dist/index.html`:
- all five tile titles, hrefs and descriptions, derived from nothing but the expected literals in the test — this is markup, not data, so literals are correct here;
- all three PDF links and their subtitles;
- the motto and both masthead lines;
- the crest and seal images with their intrinsic `width`/`height` attributes present;
- no inline `style=` attribute anywhere in the built page;
- the maxims data attribute is present and parses to exactly `MAXIMS` from `src/data`, derived from the data and not a second copy.

- [ ] **Step 4: Verify the day fix**

Prove the maxim now follows the local calendar day. `Store.today()` is already unit-tested for that, so what you must prove here is the WIRING: that `home.js` uses it rather than its own arithmetic.

Grep the built `dist/assets/home.js` and confirm it contains no `86400000` and no `Date.now()`. Report the grep output. If Astro rewrites or minifies the file, say so and find another way to demonstrate it.

- [ ] **Step 5: Verify in a browser**

Build, run `npm run preview`, and load `/`. Confirm: the maxim renders in curly quotes, the page matches the original visually, and the tiles navigate. Report what you saw.

Compare against the original by serving `git show 887b606:public/index.html` alongside if that helps.

- [ ] **Step 6: Commit**

```bash
git add src/pages/index.astro src/styles public/assets/home.js tests/build/legacy-content.sha256 tests/build/home-route.test.ts
git commit -m "feat: render the home page as a static route"
```

---

### Task 2: Retire the legacy home page

**Files:**
- Delete: `public/index.html`
- Modify: `tests/build/legacy-content.sha256`, `netlify.toml`, `CLAUDE.md`, `README.md`

- [ ] **Step 1: Delete the page and its checksum entry**

`git rm public/index.html`, remove its manifest line, then build and test. Both manifest tests must pass together.

The route-shadow guard should have been FAILING from the moment Task 1 added `src/pages/index.astro` alongside `public/index.html` — that is the root-route branch which a previous slice's review found had been silently disabled and restored. Confirm it was failing before this step and passes after. If it was NOT failing, the guard has regressed again and that is the most important thing in your report.

- [ ] **Step 2: Old bookmarks**

Someone may have `/index.html` bookmarked. Add a `netlify.toml` redirect from `/index.html` to `/`, mirroring the existing two. There is no fragment to preserve here, so no shim work is needed.

- [ ] **Step 3: Check for dangling links**

The three remaining legacy pages link back to the home page. Grep them for `index.html` and confirm every such link still resolves — a link to `index.html` now 404s locally and relies on the redirect in production, exactly as the belts and kata links did before they were fixed.

Change each to `/` and re-record those pages' checksums. Change nothing else in them.

- [ ] **Step 4: Documentation**

`CLAUDE.md`'s tree and migration note and `README.md`'s page table describe four legacy pages; it is now three. Record that the home page is a static route, and that the maxim of the day and streak chip are client-side by necessity — a statically built page cannot know today's date.

- [ ] **Step 5: Full gate**

Separately: `npm run typecheck`, `npm run build`, `npm test`, `npm run test:browser`, `npm audit --audit-level=high`. Confirm `git status --short` is clean.

- [ ] **Step 6: Commit**

---

## Definition of done

- [ ] `npm ci && npm run typecheck && npm run build && npm test && npm run test:browser` passes from a clean clone.
- [ ] `/` renders and is visually indistinguishable from the original.
- [ ] The maxim uses `Store.today()`, so it and the streak chip now agree on when a day begins.
- [ ] `public/index.html` is gone with its checksum entry; `/index.html` redirects; no page links to it.
- [ ] The route-shadow guard was confirmed failing before the deletion and passing after.
- [ ] No inline `style=`, `<style>` or `<script>` bodies anywhere in the built page.
- [ ] `public/` holds three legacy pages.

## Mutation gate

Run mutation testing over `public/assets/home.js`'s maxim selection and streak-chip branches. Record `N/A` with manual tracing for anything Stryker cannot reach, as earlier slices did.

## What this slice deliberately does not do

- No changes to quiz, flashcards or practice — later slices.
- No CSP or header hardening — slice 7.
- No design-system normalisation — slice 9.
- No deletion of `public/assets/data.js` or `store.js` — three legacy pages still load them.
