# Slice 5 — The Flashcards Island: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this
> plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Branch**: `plan/slice-5-flashcards-island` (this plan) → `feat/slice-5-flashcards-island`
**Status**: Active

## Goal

`public/flashcards.html` becomes `/flashcards`, a React island. `public/` is left holding one
page: `quiz.html`.

## Delivery: one PR

Slice 4 needed two because it carried a dormant, data-sensitive module and a UI port — two
different review questions, and the first would have been buried in the second. This slice
has one question: **is the port faithful?**

There is no new persistence, no second writer, and no dormant layer. The one non-UI piece —
the deck-queue builder — has no consumer but this island, so splitting it out into its own PR
would be a layer-cake boundary with nothing to verify independently. The diff is comparable
to slice 3b's home route, which was one PR.

**Spec:** `docs/superpowers/specs/2026-08-28-productionise-student-hub-design.md` (slice 5:
"`flashcards` island")

## Acceptance Criteria

- [ ] `/flashcards` renders the deck menu, the study screen and the completion screen; the
      page is gone from `public/` and `/flashcards.html` 301s to it.
- [ ] Pixel-identical to the page it replaces, proven by byte-identical screenshots on **all
      three screens** — the menu, a flipped card mid-deck, and the completion screen.
- [ ] Choosing a deck shuffles it, then orders it so cards the student has missed most come
      first. Finishing a deck records the practice, marks the streak, and says how many cards
      needed a second look.
- [ ] "Got it" retires a card; "Again" sends it to the back and it comes round again. Both
      are recorded against the student's miss queue and survive a reload.
- [ ] `public/` holds one page: `quiz.html`.
- [ ] No new runtime dependencies. No `any`, no type assertions, no inline `style=`, no
      inline event handlers.

## What the current page does

Read `public/flashcards.html` before starting — 198 lines, three screens. Transcribed here so
a reviewer can check the port without a diff.

| Screen | Behaviour |
|---|---|
| Menu | one button per deck, coloured `d1`–`d6`, showing `<name><small>N cards</small>`; then an "Everything" button in `d7` with the total (61). Intro paragraph above. |
| Study | `DECKNAME` and `N TO GO`; a card that flips on tap; category and text on both faces; "TAP TO REVEAL" on the front; Again/Got it appear **only once flipped**; "← back to decks". |
| Done | `☯`, `Deck complete — N cards mastered.`, a sub-line about repeats, "Study again", "← back to decks". |

Behaviours that are easy to get subtly wrong, and are the ones worth testing:

- **The queue is shuffled, then stably sorted by miss count, descending.** The sort runs
  after the shuffle and `Array.prototype.sort` is stable, so cards with equal misses keep
  their shuffled order. Sorting first, or using an unstable sort, changes what a student sees
  without failing anything obvious.
- **"Again" re-queues at the back and counts a lap.** "Got it" removes the card. The deck
  finishes only when the queue empties.
- **`total` is the deck size at the start**, so "N cards mastered" counts the deck, not the
  number of grades.
- **Completion records `logPractice('philosophy')` then `markTrained()`**, and appends
  ` 🔥 N-day streak.` to the sub-line only when the streak is **2 or more**.
- **"Study again" on the Everything deck works by accident**: `restartDeck` looks the deck up
  by name with `findIndex`, `'Everything'` is not in `DECKS`, so it returns `-1` — which is
  exactly the sentinel `startDeck` uses for Everything. Port the behaviour; do not "fix" the
  lookup without realising it is load-bearing.

## The randomness seam

`shuffle()` uses `Math.random()`. The queue builder must therefore take a random source the
way `store.ts` takes a clock — a `random: () => number` parameter, defaulting to
`Math.random` at the island's call site. Put the builder in a pure module
(`src/components/flashcards-queue.ts`, alongside `practice-labels.ts`) so the ordering rules
are unit-testable in node with a deterministic source, rather than only observable through a
browser and a shuffled deck.

That is the same seam `store.ts` uses for the clock, for the same reason, and it is what
makes "shuffled, then stably sorted by misses" a testable claim instead of a hopeful one.

## Defects

**One found while planning, not in the spec's list of four:**

> `flashcards.html:161` increments `laps` on every **press of Again**, then reports
> `laps + ' card' + (laps===1?'':'s') + ' needed a second look'`. A student who misses the
> same card three times is told "3 cards needed a second look" when it was one card.

- [ ] Pin it with a test asserting the current wording for a single card missed twice, and add
      it to slice 8's list as defect 6. Do not fix it here — `CLAUDE.md`'s migration rule is
      that "we ported it" and "we changed it" must not share a diff.

The spec's defects 1, 2 and 4 are quiz defects (slice 6). Defect 3 was fixed in #12.

## Accessibility

`CLAUDE.md`'s **Migration rules** section governs this, and it cuts both ways here:

- **In scope**, because they change no pixels: `type="button"` on every control, and an
  accessible name on the card itself — it is a `div` with an `onclick` today, so a keyboard
  user cannot flip it at all. Making the flip control a real `button` is a markup change, so
  it is **not** automatic; see below.
- **Out of scope**: the three screens are swapped by toggling a `hidden` class with no live
  region and no focus management, so a screen-reader user is not told the view changed. That
  needs new markup and focus handling, so it defers with the defects.

- [ ] **Decide before implementing**: the flip target is a `<div onclick>`. Making it a
      `<button>` is the difference between "keyboard users can study" and "they cannot", but
      it changes markup and default styling. Recommendation: do it, and prove pixel-identity
      as usual — a `button` with the page's existing reset (`*{margin:0;padding:0}` plus an
      explicit `background`/`border`) renders identically. If it cannot be made identical,
      port the `div` and raise it as its own slice.

## Implementation

**Required implementation skills**: `tdd`, `testing`, `react-testing`, `front-end-testing`,
`typescript-strict`, `functional`; `refactoring` after each GREEN; `mutation-testing` at PR
readiness.

**Files:**
- Create: `src/pages/flashcards.astro`, `src/components/Flashcards.tsx`,
  `src/components/flashcards-queue.ts`, `src/styles/flashcards.css`
- Create: `tests/unit/flashcards-queue.test.ts`, `tests/browser/flashcards.test.tsx`,
  `tests/build/flashcards-route.test.ts`
- Delete: `public/flashcards.html`
- Modify: `netlify.toml`, `tests/build/legacy-content.sha256`,
  `tests/build/public-passthrough.test.ts`, `src/pages/index.astro`, `CLAUDE.md`, `README.md`

- [ ] **Step 1: The queue builder (RED→GREEN, node)**

Pure, injectable, no DOM. Drive it with a deterministic `random` and a fixed miss map:

- a deck's cards are all present, exactly once;
- "Everything" is every deck's cards, each tagged with its own deck name as the category;
- a card with more misses comes before one with fewer;
- **cards with equal misses keep the order the shuffle gave them** — the stability claim,
  which needs a random source that produces a known permutation;
- an empty miss map leaves the shuffled order untouched.

- [ ] **Step 2: The island (RED→GREEN, browser)**

`tests/browser/flashcards.test.tsx`, against real `localStorage`, using
`tests/browser/progress.ts` and the `setup.ts` that already clears storage between tests.

Drive the three screens by role and text. The cases that matter: picking a deck starts it
with the right count; the card flips on tap and the grading buttons appear only then; "Got it"
advances and decrements "N TO GO"; "Again" sends the card to the back so it returns; finishing
the last card shows the completion screen, records `philosophy`, and marks the streak; the
streak line appears only at 2 days or more; "Study again" restarts, including from Everything.

Reuse `StreakChipSlot` and `StreakChip` from slice 4 rather than a fourth hand-rolled portal,
and `useBrowserStore()` rather than binding a store directly — that is what they were extracted
for.

- [ ] **Step 3: Pixel fidelity**

Serve the built route alongside `git show <main>:public/flashcards.html` and compare
full-page screenshots at 390×900 DPR2 on **all three screens**, plus a card mid-flip is worth
looking at once by eye since the 3D transform is the one thing a screenshot of a settled state
cannot fully characterise.

Use tokens where one matches exactly. Note in the stylesheet which literals have none — and
check `tokens.css` before claiming so, which slice 4 got wrong twice.

- [ ] **Step 4: Layout shift**

The menu's deck buttons come from `DECKS`, a build-time prop, so they should server-render
like the practice tiles did. Measure the hydration shift as slice 4 did and reserve only what
is genuinely unknowable before the store is read.

- [ ] **Step 5: Retire the legacy page**

`git rm public/flashcards.html`, drop its manifest line and `LEGACY_PAGES` entry, add the
`netlify.toml` 301 (no `force` — Astro emits `/flashcards/index.html`). Confirm the
route-shadow guard fails while both exist and passes after. Repoint `src/pages/index.astro`'s
tile and update the home route's build test.

- [ ] **Step 6: Documentation** — `CLAUDE.md`'s tree and page counts, `README.md`'s table.

- [ ] **Step 7: PRE-PR MUTATION gate**

Over `flashcards-queue.ts` (node) and the island's grading and screen logic (browser). Slice
4's gate found three real gaps in one blind spot — everything asserted through one summary
sentence — so pay attention to what is asserted *only* indirectly.

## Pre-PR Quality Gate

1. Implementation complete; refactoring assessed.
2. Mutation or alternate evidence for the accumulated scope; valuable survivors addressed.
3. `npm run typecheck`, `npm run build`, `npm test`, `npm run test:browser`,
   `npm audit --audit-level=high` all pass.
4. `git status --short` clean.
5. DDD glossary check: `N/A`.

## What this slice deliberately does not do

- **No quiz migration** — slice 6, which also empties `public/` and retires `data.js`,
  `store.js` and the store-parity test with it.
- **No defect fixes**, including the lap-counting one found here — slice 8.
- **No screen-change announcements or focus management** — needs new markup, so it defers.
- **No CSP** — slice 7. **No visual normalisation** — slice 9, which inherits this page's
  `.card-ui` (a third card class alongside `.card`) and its 520px width.
