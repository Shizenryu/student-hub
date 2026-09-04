# Slice 6 — The Quiz Island: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement
> this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. This slice ships as **two
> dependent PRs** — build and land them bottom-up; see **Delivery Shape**.

**Branch**: `plan/slice-6-quiz-island` (this plan) → `feat/slice-6-quiz-questions` →
`feat/slice-6-quiz-island`
**Status**: Active

## Goal

`public/quiz.html` becomes `/quiz`, a React island — the last hand-written page. The three
remaining quiz defects are pinned, and `public/assets/data.js` retires with the page that was
its last consumer.

## Three corrections to the spec, established before planning

**1. All three remaining defects are LATENT.** None is reachable through the UI with today's
content. Verified against the shipped data:

| Defect | Trigger | Reachable today? |
|---|---|---|
| 1 — duplicate distractors | two terms sharing an English gloss | **No.** Zero shared glosses across all 59 terms. |
| 2 — round length misreported | a level pool under 10 terms | **No.** The smallest pool is 13, so a round is always 10 and `/10` is correct. |
| 4 — small kumite range loses an option | `startKumite(n)` with n < 5 | **No.** The menu offers only 1–6 and 1–12. |

This changes how they are pinned and what slice 8 is for:

- They **cannot** be characterised through the UI, because no reachable UI state exhibits
  them. They must be pinned at the pure-module level against crafted inputs, with each test
  stating the condition that would make it bite. That is the strongest argument for the
  question-generation module below: without it these defects cannot be pinned at all.
- **Slice 8's fixes will change nothing a student sees today.** They are guards against a
  future content edit — a tier losing terms, or two terms being given the same gloss. Worth
  saying plainly so nobody expects a visible change, and worth keeping precisely because the
  content is edited by hand.

**2. This slice does not empty `public/`.** The delivery table says it does; that is wrong.
`src/pages/index.astro` loads `/assets/store.js` for `home.js`, so after the quiz goes,
`public/` still holds:

```
assets/home.js  assets/store.js  assets/legacy-hash.js  assets/img/*  docs/*.pdf
```

No **pages** remain, which is what matters. `store.js` outlives this slice because the home
page's maxim and streak chip depend on it, and replacing them with an island would put React
on the landing page — roughly 60KB gzipped to render one line of text, on the page a student
opens on poor signal at the dojo. That trade is not worth making, so `store.js` stays until
someone decides the home chip is worth rewriting. **Do not "finish the job" by islanding the
home page.**

**3. After this slice, `store.js` becomes a READER.** `home.js` only calls `today()` and
`streakInfo()`; the quiz was its last writer. So the parity proof's write half has done its
job, while its read half still matters — `home.js` must read what the islands wrote. Narrow
it rather than delete it; see Task 5.

**Spec:** `docs/superpowers/specs/2026-08-28-productionise-student-hub-design.md`

## Acceptance Criteria

- [ ] `/quiz` runs both modes — terminology by level and kumite sequences — through menu,
      question and result screens. `public/quiz.html` is gone; `/quiz.html` 301s to it.
- [ ] Pixel-identical to the page it replaces on **all three screens plus an answered
      question in both the correct and wrong states**, proven with
      `node scripts/compare-pixels.mjs --page quiz --ref <ref>`.
- [ ] Answering scores, streaks at three in a row, and finishing records a personal best,
      logs the right practice activity, and marks the streak — all surviving a reload.
- [ ] Defects 1, 2 and 4 are pinned by unit tests against crafted inputs, each naming its
      trigger condition and slice 8.
- [ ] `public/assets/data.js` is gone, with `src/data/parity.ts` and its test.
- [ ] `public/` holds no pages. No new runtime dependencies. No `any`, no assertions.

## Delivery Shape

**Mode**: Stacked PRs · **Stack scope**: Intra-slice · **Mechanism**: unlinked dependent
chain (`gh stack` is unavailable here), merged manually bottom-up.

**Reason**: two different review questions, and the first drowns in the second if combined.
Question generation is the largest piece of logic in the migration — two modes, four question
shapes, four independent uses of randomness — and it carries the three defect pins. "Are these
the right questions, and are the defects captured?" deserves its own diff. The island is then
the familiar "is the port faithful?" review, the same shape as slices 4 and 5.

| # | PR | Base | Owns | Release state |
|---|---|---|---|---|
| 1 | quiz question generation + the three defect pins | `main` | `src/domain/quiz-questions.ts`, its tests | **Dormant** — nothing imports it; built site byte-identical |
| 2 | the quiz island and route | PR1's branch | the island, `/quiz`, retiring `quiz.html` and `data.js` | **Deployable** — completes the migration |

### Whole-stack gate
- [ ] Every acceptance criterion passes cumulatively at PR2
- [ ] PR1 is safe to merge alone (dormant module + tests; built site identical to `main`)
- [ ] Merged bottom-up, PR1 first, then PR2 rebased and re-checked

## What the current page does

Read `public/quiz.html` (290 lines) before starting.

| Area | Behaviour |
|---|---|
| Menu | five level buttons (`b1`–`b5`, level 0 is "Everything"), then two kumite buttons (1–6, 1–12) |
| Terms question | shows Japanese, or English 30% of the time; four options; the prompt hint changes with direction |
| Kumite question | three shapes — what comes next, which kumite is this, same side or opposite |
| Answering | disables all options, marks the correct one, marks a wrong choice, shows one of four praise lines at random, streaks from three in a row |
| Progress | `QUESTION n / 10`, `SCORE n`, a bar at `idx / N_Q` |
| Result | `score / roundLen()`, a rank band at 100/80/60/40%, a random maxim, a best-score line, and `Trained today ✓` or the streak |
| Store | `setBest('level<N>'` or `'kumite<N>')`, `logPractice('terms'|'kumite')`, `markTrained()` |

Worth care because they are easy to get subtly wrong:

- **`roundLen()` is the queue length, but the display uses the constant `N_Q`.** That is
  defect 2. Port both, exactly as they are.
- **`restart()` repeats the same mode and range**, not the menu default.
- **The result's best line reads "New personal best" or the previous best**, and `setBest`
  must be called before `best()` is read — the legacy page relies on that ordering.
- **The praise line and the maxim are random**, so the comparison script must reseed for the
  answered-question and result states.

## Implementation

**Required skills**: `tdd`, `testing`, `react-testing`, `front-end-testing`,
`typescript-strict`, `functional`; `refactoring` after each GREEN; `mutation-testing` at each
PR's readiness.

### PR1 — question generation

- [ ] **Step 1: The terms round (RED→GREEN, node)**

`src/domain/quiz-questions.ts`, pure, taking `random` the way `flashcards-queue.ts` does.
Cover: a level draws from its own tier and every tier below; "Everything" draws from all four;
a round is at most ten questions; each question has four options; the correct answer is among
them; direction flips to English about 30% of the time and the prompt hint follows it.

- [ ] **Step 2: The kumite round (RED→GREEN, node)**

Three question shapes, their prompts and hints; "what comes next" draws wrong answers from the
whole step vocabulary; "which kumite" draws from the other kumite in range; "which side" is
always OS/SS.

- [ ] **Step 3: Pin the three defects (node, crafted inputs)**

Each in its own `describe`, naming the trigger and slice 8:

- **Defect 1** — with two terms sharing an English gloss, a forward-direction question renders
  the same option twice, and both count as correct.
- **Defect 2** — with a tier of fewer than ten terms, the round is shorter than ten while the
  progress display still says ten.
- **Defect 4** — with a kumite range under five, a "which kumite is this?" question offers
  three options rather than four.

Each test asserts today's wrong behaviour, and says in a comment that it is a pin, not a
specification. Register nothing new: these three are already in the spec's list.

- [ ] **Step 4: Mutation gate**, then PR. The built site must be byte-identical to `main`'s —
      nothing imports the module yet.

### PR2 — the island

- [ ] **Step 1: The island (RED→GREEN, browser)** — `Quiz.tsx`, three screens from one
      session value as `Flashcards.tsx` does, `useBrowserStore()`, `StreakChipSlot`. Drive
      both modes by role and text.
- [ ] **Step 2: Pixel fidelity** — add a `quiz` entry to `scripts/compare-pixels.mjs` with
      states for menu, a question, an answered-correct question, an answered-wrong question,
      and the result. Reseed before each state that consumes randomness.
- [ ] **Step 3: Layout shift** — the menu is a build-time prop, so it should server-render
      like the flashcards menu. Measure and reserve only what is genuinely unknowable.
- [ ] **Step 4: Retire the page** — `git rm public/quiz.html`, drop its manifest line, empty
      `LEGACY_PAGES`, add the 301, repoint the home tile, confirm the route-shadow guard
      fails before the deletion and passes after.
- [ ] **Step 5: Retire `data.js`** — delete it, `src/data/parity.ts`, and
      `tests/unit/legacy-data-parity.test.ts`, plus their manifest lines and the
      `astro.config.mjs` hook if it references them. This is the whole reason the typed JSON
      exists; the proof has served its purpose.
- [ ] **Step 6: Narrow the store parity proof** — `store.js` is now a reader only. Keep the
      comparison of what both stores READ from the same state; retire the write sequences,
      and say in the file why the remaining half still matters (`home.js` reads what the
      islands write).
- [ ] **Step 7: Documentation** — `CLAUDE.md`'s tree, page counts, the Persistence section
      and the "To add content" procedure, which currently instructs a maintainer to edit
      `data.js` and regenerate. After this slice `src/data/*.json` is edited directly and
      `scripts/extract-legacy-data.mjs` retires with it. `README.md`'s table.
- [ ] **Step 8: Mutation gate**, full gate, PR.

## Pre-PR Quality Gate

Before each PR: implementation complete and refactoring assessed; mutation or alternate
evidence for the accumulated scope; `npm run typecheck`, `npm run build`, `npm test`,
`npm run test:browser`, `npm audit --audit-level=high`; `git status --short` clean. DDD
glossary check: `N/A`.

## What this slice deliberately does not do

- **No defect fixes** — slice 8, which after this slice owns all six.
- **No islanding of the home page**, and so no retirement of `store.js`, `home.js` or
  `legacy-hash.js`. See correction 2.
- **No CSP** — slice 7. **No visual normalisation** — slice 9, which inherits this page's
  belt-button palette, a fourth `.card` padding if one appears, and the `DEFER(slice-9)`
  markers already in the stylesheets.
