# Slice 3a — Kata Prose as Markdown, and the Kata Routes: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the kata prose out of trusted HTML strings and into markdown, replace `public/kata.html` with static routes, and eliminate the last place in the codebase where HTML is handled as a string at runtime.

**Architecture:** Today each kata section is an HTML string in `kata.json`, injected with `innerHTML` at runtime. It becomes a markdown file per kata — frontmatter for the metadata, `##` headings for the sections — loaded through an Astro content collection and rendered to HTML at build time. The browser never sees an HTML string, so the escaping question disappears rather than being managed.

`kata.json` stays. It mirrors `data.js`, which the four remaining legacy pages still load, and slice 2a's parity test keeps proving they agree. That means kata prose briefly lives in two places, so this slice adds a test asserting the markdown and the JSON say the same thing — for as long as both exist.

**Tech Stack:** Astro content collections (`glob` loader), markdown, TypeScript strict, Vitest. No new dependencies — Astro's markdown pipeline and Zod both ship with it.

**Spec:** `docs/superpowers/specs/2026-08-28-productionise-student-hub-design.md`

## Global Constraints

- **Zero new dependencies.** Direct deps stay: `astro`, `@astrojs/react`, `react`, `react-dom`.
- **No martial content changes.** The prose must survive conversion word for word. `public/assets/data.js` and `src/data/*.json` are read-only. This is the constraint that matters most in this slice — see the fidelity note below.
- **No type assertions, no `any`.** Type guards only. `noUncheckedIndexedAccess` is on.
- **Pixel-faithful.** The rendered kata page must be visually indistinguishable from today's.
- **No inline `style=`, no inline `<style>` or `<script>` bodies.** Slice 7 turns on a CSP with no `unsafe-inline`. Three mechanisms were already found and eliminated in slice 2b: `define:vars`, `<style set:html>`, and component `<script>` blocks, which Astro inlines rather than bundling. Do not reintroduce any of them.
- **Root-relative asset paths** — a nested route resolves relative paths against its own directory.
- **Design-system drift is preserved, not normalised.** `kata.html` uses `max-width: 560px`, the same as belts, so use `width="wide"`.

## What the current page does

Read from `public/kata.html`. The new routes must reproduce all of it.

| Behaviour | Detail |
|---|---|
| Kata list | 4 kata in order, each a tile coloured `k.hex` with `#fff` text when `k.white` else `#1A1A1A`, showing `k.name` and `k.translation` |
| Banner | background `k.hex`, same text rule, `k.name` and `k.translation` |
| Sections | for each: an `<h2>` with `s.h`, then a `<div class="body">` containing `s.b` as HTML. The first heading gets `margin-top: 0` |
| Quote | when present, `“k.quote.text”` and `— k.quote.src` |
| In the syllabus | `SYLLABUS` rows where `(section + ' ' + item + ' ' + detail)` lowercased contains any `k.match` needle; each shows the grade, the item, and an ADULTS 16+ / JUNIORS tag |
| Navigation | previous/next kata, disabled at each end |

Note the syllabus list here does NOT apply the `JJ` expansion — `kata.html` calls `esc()` but never `expand()`. Belts does expand it. Reproduce each page's behaviour as it is; do not make them consistent. Slice 9 owns that decision.

## Fidelity: what "the same" means here

The 13 section bodies use only `<p>`, `<ul>`, `<li>`, `<b>` and `<i>`. Twelve are a single block of text with inline emphasis; one — Mara's "What it is" — has paragraphs and a bullet list.

A byte comparison is the wrong test. Markdown always wraps a block in `<p>`, whereas today's single-block sections are bare text inside `<div class="body">`. That renders identically because the global reset sets `* { margin: 0 }`, but the bytes differ.

So the proof compares **semantic content**: the visible text, and which phrases carry emphasis, and the list structure. Task 1 builds that comparison and it must be strict enough that a dropped word, a changed word, or a lost `<b>` fails it.

---

### Task 1: Convert the prose to markdown, and prove it says the same thing

**Files:**
- Create: `src/content/kata/mara.md`, `sanchin.md`, `rokushu.md`, `naifuanchin.md`
- Create: `src/content.config.ts`
- Create: `scripts/convert-kata-prose.mjs`
- Create: `tests/unit/kata-prose-parity.test.ts`

**Interfaces:**
- Consumes: `src/data/kata.json` (read-only).
- Produces: a `kata` content collection with a Zod schema, whose entries carry the metadata in frontmatter and the sections as `##`-headed markdown.

- [ ] **Step 1: Write the conversion script**

Create `scripts/convert-kata-prose.mjs`. It reads `src/data/kata.json` and writes one markdown file per kata. It is mechanical on purpose — nobody retypes martial prose.

Conversion rules, and only these:
- `<b>x</b>` → `**x**`
- `<i>x</i>` → `*x*`
- `<p>…</p>` → the text, with a blank line between blocks
- `<ul><li>a</li><li>b</li></ul>` → `- a` / `- b` on their own lines
- A section with no block tags → a single paragraph
- Everything else is an error: if the script meets a tag it does not know, it must throw naming the kata, the section and the tag. Do NOT silently strip anything.

Frontmatter carries `name`, `translation`, `hex`, `white`, `match`, and `quote` when present. The slug is the filename. Sections become `## <heading>` followed by the converted body.

- [ ] **Step 2: Run it and read the output**

Run: `node scripts/convert-kata-prose.mjs`

Then actually READ all four generated files. You are checking that the prose reads correctly as markdown — that emphasis landed on the right words and Mara's bullet list came out as a list. Report anything that looks wrong; do not hand-edit the prose to fix it, fix the script and re-run.

- [ ] **Step 3: Write the failing parity test**

Create `tests/unit/kata-prose-parity.test.ts`. For each kata and each section it must assert the markdown and `kata.json` agree on:

- the section headings, in order;
- the visible text, with whitespace collapsed — so a dropped or altered word fails;
- the set of emphasised phrases: every `<b>`/`<strong>` phrase in the original appears as strong in the rendered markdown, and likewise `<i>`/`<em>`;
- the list items, in order, for the one section that has them.

Render the markdown through the same pipeline the site uses, so the test proves what students will actually see. Compare against `kata.json`'s HTML by parsing both to text plus emphasis sets, not by string equality.

Derive the expectations from `kata.json` — never a hand-written copy of the prose. A test carrying its own copy of the content proves only that two copies match.

- [ ] **Step 4: Prove the test fails on a changed word**

Change one word in one markdown file — for example alter a technique name in Mara's study notes.

Run: `npm test`

Expected: FAIL, naming that kata and section. Revert and confirm green. Report both outputs. A prose-fidelity test that cannot detect a changed word is worthless, and this is the only proof that it can.

- [ ] **Step 5: Prove it fails on lost emphasis**

Remove one `**` pair from a markdown file so a bolded phrase becomes plain.

Run: `npm test`

Expected: FAIL. Revert, confirm green, report both.

- [ ] **Step 6: Add the content collection**

Create `src/content.config.ts` defining a `kata` collection with the `glob` loader over `src/content/kata/*.md` and a Zod schema matching the frontmatter. Import `z` from `astro:content` — it ships with Astro, so this adds no dependency.

Run `npm run build` and confirm it succeeds. Then deliberately break one frontmatter field — remove `hex` from one file — and confirm the BUILD fails naming the file and field. Restore and confirm the build passes. Report both.

- [ ] **Step 7: Commit**

```bash
git add src/content src/content.config.ts scripts/convert-kata-prose.mjs tests/unit/kata-prose-parity.test.ts
git commit -m "feat: convert kata prose to markdown with a fidelity proof"
```

---

### Task 2: The kata routes

**Files:**
- Create: `src/pages/kata/index.astro`, `src/pages/kata/[slug].astro`
- Create: `src/components/KataGuide.astro`
- Modify: `src/styles/belts.css` or add `src/styles/kata.css` for the four kata colours
- Create: `tests/build/kata-routes.test.ts`

**Interfaces:**
- Consumes: the `kata` collection from Task 1; `SYLLABUS` from `src/data`; `PageShell` from slice 2b.
- Produces: `/kata` and `/kata/<slug>` for four kata.

- [ ] **Step 1: Build the routes**

Follow the shape slice 2b established for belts — read `src/pages/belts/index.astro`, `src/pages/belts/[slug].astro` and `src/components/BeltGuide.astro` first and match their structure, naming and conventions.

Per-kata colours follow the same mechanism as belts: static CSS rules keyed by `[data-slug]` in a real stylesheet, never `set:html` and never an inline `style` attribute. If the existing `.belt-colour` rules generalise cleanly, reuse the mechanism rather than duplicating it; say which you chose and why.

Render section prose through the collection's rendered content. Reproduce the behaviour table above exactly, including the syllabus list's matching rule and its lack of `JJ` expansion.

Use `width="wide"` on both routes.

- [ ] **Step 2: Verify the build**

Run: `npm run build`

Expected: `dist/kata/index.html` plus one directory per kata slug — four of them.

- [ ] **Step 3: Write the route tests**

Create `tests/build/kata-routes.test.ts` asserting against the built HTML: four kata on the list; each kata page shows its banner, its section headings in order, its quote when it has one, and its syllabus rows; prev/next link to the right neighbours and are non-navigable at the ends. Derive expectations from the content, not from hardcoded prose.

Add a colour test in the same style as slice 2b's `belt-colours.test.ts`, deriving from `kata.json`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/kata src/components/KataGuide.astro src/styles tests/build/kata-routes.test.ts
git commit -m "feat: render kata guides as static routes"
```

---

### Task 3: Retire the legacy kata page

**Files:**
- Delete: `public/kata.html`
- Modify: `tests/build/legacy-content.sha256`, `netlify.toml`, `public/assets/legacy-hash.js` or a sibling, `src/pages/kata/index.astro`
- Modify: `public/index.html` (one href), `CLAUDE.md`, `README.md`

**Interfaces:**
- Consumes: the routes from Task 2.
- Produces: no legacy kata page; old links still resolve.

- [ ] **Step 1: Delete the page and its checksum entry**

Run `git rm public/kata.html`, remove its line from `tests/build/legacy-content.sha256`, then `npm run build` and `npm test`. Both manifest tests must pass together.

Confirm the route-shadow guard passes — and note it should already have been FAILING from the moment Task 2 added `src/pages/kata/[slug].astro` alongside the surviving `public/kata.html`. If it was not failing, the guard has a hole and that is a finding worth reporting.

- [ ] **Step 2: Preserve old bookmarks**

`kata.html#sanchin` may be bookmarked. Add a `netlify.toml` redirect from `/kata.html` to `/kata`, mirroring the `/belts.html` one, and extend the existing hash-upgrade shim to work on `/kata` too.

Read `public/assets/legacy-hash.js` first — it was written for belts. Generalise it rather than copying it, so a third page does not mean a third copy. The valid slugs must still come from a data attribute the page writes, never a hardcoded list. Keep it an external file; do not let it become an inline script.

If you change that file, update its checksum line.

Verify: build, `npm run preview`, request `/kata#sanchin`, confirm you land on `/kata/sanchin`. Confirm `/belts#5th-kyu` still works.

- [ ] **Step 3: Fix the home page link**

`public/index.html` links to `kata.html`. Change that ONE href to `/kata` and re-record `index.html`'s checksum — the documented deliberate-edit procedure. Change nothing else in that file.

- [ ] **Step 4: Update the documentation**

`CLAUDE.md`'s tree and migration note, and `README.md`'s page table, both describe five legacy pages; it is now four. Record that kata pages are static routes with real URLs. Note in the content rules that kata prose is now authored as markdown in `src/content/kata/`, and that it must stay in step with `data.js` until that file retires — the parity test enforces it.

- [ ] **Step 5: Full gate**

Separately: `npm run typecheck`, `npm run build`, `npm test`, `npm run test:browser`, `npm audit --audit-level=high`. Confirm `git status --short` is clean.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: retire the legacy kata page, redirecting old links"
```

---

## Definition of done

- [ ] `npm ci && npm run typecheck && npm run build && npm test && npm run test:browser` passes from a clean clone.
- [ ] The prose-parity test was observed failing on both a changed word and lost emphasis.
- [ ] The content collection schema was observed failing the build on a missing frontmatter field.
- [ ] `/kata` and all four kata pages render, ship no JavaScript beyond the shared bookmark shim, and match today's page.
- [ ] `public/kata.html` is gone with its checksum entry; `/kata.html#sanchin` still reaches the right kata; `/belts#5th-kyu` still works.
- [ ] No `innerHTML`, no `set:html`, no inline styles or scripts anywhere in `src/`.
- [ ] `public/` holds four legacy pages.

## Mutation gate

Run mutation testing over the conversion script's tag handling and the parity test's comparison helpers — those are where a silent weakening would let altered prose through. `.astro` files cannot be mutated by Stryker; record `N/A` with manual tracing, as slice 2b did.

## What this slice deliberately does not do

- No index page migration — slice 3b, immediately after.
- No changes to quiz, flashcards or practice.
- No deletion of `kata.json` or `data.js` — four legacy pages still load `data.js`, and the parity chain depends on both.
- No reconciling the `JJ` expansion difference between belts and kata — slice 9.
