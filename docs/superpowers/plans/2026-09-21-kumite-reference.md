# Kumite Reference: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement
> this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. One PR.

**Branch**: `plan/kumite-reference` (this plan) → `feat/kumite-reference`
**Status**: Active
**Spec**: `docs/superpowers/specs/2026-09-21-kumite-reference-design.md`

## Goal

A student can open `/kumite` from the home page and read all twelve Kihon Kumite — number,
side, belt, the attack and its responses — in the order they are learned, from the same data
the quiz asks about, with a build guard that keeps that data and the syllabus rows in step.

## Acceptance Criteria

- [ ] `/kumite` lists Kumite 1–12 in order under 9th, 8th, 7th, 6th, 5th, 4th and 3rd Kyu
      banners in that order, then the 2nd Kyu banner with its "Kumite 1 to 12" row; each
      kumite block carries `id="kumite-N"`, its side as `OS`/`SS` with its expansion, the
      attack, and the responses joined by `STEP_JOIN`.
- [ ] The home page has six Train tiles, the sixth linking to `/kumite`.
- [ ] `npm run build` fails if any kumite's steps, their order, its belt or its side differ
      from its "Kihon Kumite" syllabus row (case-insensitive on the steps), or if it has no
      row; it passes on the real content — after Kumite 10's em dash becomes the syllabus's
      hyphen.
- [ ] The belt guides render exactly as before the banner was extracted (their build tests
      pass unchanged; a phone screenshot of one guide in the PR).
- [ ] The page ships no JavaScript, no inline script or style, and only token colours; the
      deploy suite passes with the route included.
- [ ] CLAUDE.md's pages list and prose, its `KUMITE` schema comment, and README's route table
      all name the page.

## Delivery Shape

**Mode**: Independent PR against `main` · **Stack**: none. Four commits: the data
correction, the guard, the page (with the banner extraction), the tile and docs. The site
works after each.

## Implementation

**Required skills**: `tdd`, `testing`; `typescript-strict`, `functional`; `refactoring`
for the banner extraction. `mutation-testing`: `N/A` — a static page; the guard's negative
tests are the meaningful ones.

**Class**: Behavior change (a new page a student can open, and one character of content).

### Commit 1 — Content: Kumite 10 matches the syllabus

- [ ] `src/data/kumite.json`: `"sen no sen — nagashi-uke (rear hand)"` becomes
      `"sen no sen - nagashi-uke (rear hand)"`, the syllabus row's text. No test changes; the
      quiz tests assert shape, not this string. Say in the commit that this is content rule
      2 applied and that the quiz prompt changes by one character.

### Commit 2 — The guard

- [ ] RED in `tests/unit/content-integrity.test.ts`, using `validContent`, `kumiteBout` and
      `syllabusItem` (given `section: 'Kihon Kumite'`, `item: 'Kumite 1 (OS)'` and a `detail`
      with the arrows): a kumite with no row; one whose steps differ; one whose steps are in a
      different order; one whose belt is not the row's grade; one whose side is not the row's
      `(OS)`/`(SS)`. Each rejected with a message naming the kumite; and "accepts the real
      content" still passes.
- [ ] GREEN in `src/data/integrity.ts`: find the row with `section === 'Kihon Kumite'` whose
      `item` starts with `Kumite ${n} (`; compare the bracketed side to `side`; split `detail`
      on `>>>` then `>>`, trim, compare to `steps` lower-cased; compare `grade` to `belt`.

### Commit 3 — The page

- [ ] RED: `tests/build/kumite-route.test.ts` against `dist/kumite/index.html` — twelve blocks
      with ids `kumite-1`…`kumite-12` in document order; eight `belt-colour` banners in order
      by slug (9th…3rd Kyu, then 2nd Kyu) with each grade's `banner` text; for each kumite
      the attack text, the responses joined by `STEP_JOIN`, and `OS`/`SS` with
      "opposite side"/"same side"; the 2nd Kyu row's item and detail; no `<script`; no
      `style=`. `tests/unit/kumite-labels.test.ts`: `sideLabel('OS')` / `('SS')`.
- [ ] GREEN, in this order: export `STEP_JOIN` from `src/domain/quiz-questions.ts`; add
      `kumiteSequence()` to `src/data/index.ts` (`{ attack, responses }` from `steps`, with a
      comment pointing at the guard) and `sideLabel()` in `src/components/kumite-labels.ts`
      (the `*-labels.ts` pattern); extract `BeltBanner.astro` from `BeltGuide.astro` — the
      `.banner` markup and its scoped styles, `grade` and a `label` prop — and use it in
      `BeltGuide` with `label="STUDY GUIDE"` (run `tests/build/belts-routes.test.ts`: green,
      unchanged); then `src/pages/kumite.astro` through `PageShell`, importing `belts.css`,
      grouping `KUMITE` by `GRADES` order with `BeltBanner label="KIHON KUMITE"`, the 2nd
      Kyu row found by grade and item and rendered through `expandAbbreviations`, scoped
      styles on tokens only.
- [ ] Lede and labels exactly as the spec's Wording table; nothing else coined.

### Commit 4 — The tile, and docs

- [ ] RED: `tests/build/home-route.test.ts` — the tile table gains "Kumite Reference" →
      `/kumite`, and "exactly five train tiles" becomes six with the new class; the drift
      test's `index.astro` allowance gains `#702F8A` (4th Kyu's hex, a data palette).
- [ ] GREEN: the tile in `index.astro` after Kata Reference — "Kumite Reference" / "The twelve
      Kihon Kumite — one attack and its responses, belt by belt." — with
      `linear-gradient(120deg, var(--track-adult), #702F8A)`.
- [ ] CLAUDE.md: `src/pages/` gains `kumite.astro`; the prose sentence listing every page
      (belts, kata, home, practice, flashcards, quiz) gains kumite among the pages that ship no
      JavaScript; the `KUMITE` schema comment says the page shows it and names the guard;
      `src/components/` names `BeltBanner.astro` and `kumite-labels.ts`. README's route table
      gains `/kumite`.
- [ ] Outside the repo, done by hand in the same session: the project memory note that queued
      this page is rewritten to point at the spec, since its earlier advice (link from the
      practice tile, add an attack field) contradicts the decisions.

### PR gate

- [ ] `npm run typecheck`, `npm run build`, `npm test`, `npm run test:browser`,
      `npm run test:deploy`, `npm audit --audit-level=high`; `git status --short` clean.
- [ ] Mutation: N/A. Evidence: the guard's five rejections; the route build test; the deploy
      walk including `/kumite/`; the belt guides' tests unchanged.
- [ ] Phone screenshots of `/kumite`, the home page and one belt guide in the PR.

## What this deliberately does not do

- No per-kumite pages, no quiz or practice links, no data-shape change, no new martial
  content (spec, "What it is not"). The 1st Kyu repeat of "Kumite 1 to 12" and Shodan's
  junior row stay in the belt guides.
