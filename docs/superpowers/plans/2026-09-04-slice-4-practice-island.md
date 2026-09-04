# Slice 4 — The Practice Island: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (or
> superpowers:subagent-driven-development) to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking. This plan ships as **two dependent PRs** — build
> and land them bottom-up; see **Delivery Shape**.

**Branch**: `plan/slice-4-practice-island` (this plan) → `feat/slice-4-store-ts` → `feat/slice-4-practice-island`
**Status**: Active

## Goal

`public/practice.html` becomes a real Astro route with a React island, backed by the first
piece of `src/domain/` — a typed, validated store that treats `localStorage` as untrusted
input, and that is **proven to write byte-identical state** to the `store.js` the three
remaining legacy pages still use.

## Why this slice is different from 3a and 3b

Belts and kata were read-only. This page **writes a student's progress**, and after this
slice two implementations write the same `localStorage` key at once:

| Writer | Used by | Lives until |
|---|---|---|
| `public/assets/store.js` | `quiz.html`, `flashcards.html`, `home.js` | slice 6 |
| `src/domain/store.ts` | the practice island | forever |

`quiz.html:265` and `flashcards.html:171` both call `logPractice()` and `markTrained()`, so a
student can tick an activity in the island and complete a quiz round on the legacy page **on
the same day**. If the two disagree about the shape they persist, a streak silently breaks.
That is the risk this slice is really about, and the reason PR1 exists at all.

**Spec:** `docs/superpowers/specs/2026-08-28-productionise-student-hub-design.md` (slice 4:
"`practice` island; `store.ts` port; validated persistence — First island live")

## Acceptance Criteria

- [ ] `/practice` renders the daily practice page as a React island; `public/practice.html`
      is gone and `/practice.html` 301s to it.
- [ ] The rendered page is **pixel-identical** to the page it replaces, proven by a
      byte-identical full-page screenshot at 390×900 DPR2, as slice 3b did.
- [ ] Ticking an activity records it for today and keeps the streak; un-ticking removes it.
      Both survive a page reload — asserted against real `localStorage` in a real browser.
- [ ] `store.ts` and `store.js` write **byte-identical** `localStorage` for every well-formed
      operation sequence, proven by one test driving both.
- [ ] `store.ts` discards malformed persisted state and starts clean, rather than throwing or
      propagating rubbish into the UI. Existing **well-formed but unversioned** state written
      by today's `store.js` is accepted and kept — no student loses a streak to this slice.
- [ ] `public/` holds two legacy pages: quiz and flashcards.
- [ ] No new runtime dependencies. No `any`, no type assertions. No `dangerouslySetInnerHTML`.

## Constraints carried forward

- **Zero new dependencies.** React, `@astrojs/react`, Astro and the test tooling are already
  installed. Nothing else is added — in particular **not Zod**: the spec is explicit that the
  persisted-state guard is hand-rolled, because Zod runs at build time for content and
  pulling it into an island would ship ~12KB to a student's phone to validate a four-key
  object.
- **Pixel-faithful first, normalise later.** Any visual difference is a bug in this slice,
  not a choice. Slice 9 owns normalisation.
- **Behaviour-faithful too.** Where the legacy page has a quirk, port the quirk and pin it.
  See **Defects** below — fixes belong to slice 8, one RED→GREEN commit each.
- **Root-relative asset paths** in `src/pages/`; see CLAUDE.md's Imagery rules.
- **`src/data/*.json` and `public/assets/data.js` are read-only** in this slice.

## Behaviour the current page has (the port's checklist)

Read `public/practice.html` before starting. Transcribed here so a reviewer can check the
port without a diff:

| Behaviour | Detail |
|---|---|
| Today label | `TODAY — ` + `toLocaleDateString(undefined, {weekday, day, month})` |
| Status, nothing done | `Nothing yet — pick one thing. Even a stretch keeps the streak.` (class `status none`) |
| Status, n done | `N thing(s) done today — streak kept ✓` (class `status done`), singular at 1 |
| Activity tiles | one per `PRACTICE` entry, name + hint, `.act.on` when logged today |
| Toggle on | `logPractice(id)` **and** `markTrained()` |
| Toggle off | `unlogPractice(id)` only — the streak is **not** un-marked |
| Week strip | last 7 day numbers; dot shows the activity count or `·`; today's dot is ringed red |
| Summary | `Practised on X of the last 7 days · Y of the last 30.` |
| Streak chip | `🔥 N-day streak`, plus ` — train today to keep it` when not trained today |
| Mind quote | the "A stretch counts…" paragraph, verbatim |

**Note the streak chip wording differs from the home page's** (`N-day streak` here,
`N-day training streak` there). That divergence is real and pre-existing. Port it faithfully;
do **not** unify. Unifying is a content decision for Rich, and it is already recorded as a
known deferral from slice 3b.

## Defects

Slice 8 fixes defects; this slice pins them. Of the spec's four, **none are on this page** —
1, 2 and 4 are quiz defects and 3 (UTC streak) was already fixed in #12.

**One further defect was found while planning this slice, not in the spec's list:**

> `public/practice.html:110` builds each weekday label with
> `new Date(dayNum * 86400000).toLocaleDateString(undefined, {weekday:'short'})`.
> `dayNum` is a **local**-calendar day number derived via `Date.UTC` (`store.js:29`), so
> `dayNum * 86400000` is midnight **UTC**. `toLocaleDateString` then formats it in the
> viewer's zone. At UTC+0/+1 that is the same calendar day, so the UK is unaffected — but
> west of UTC it renders the **previous** weekday, so the week strip is labelled one day out
> for any student abroad.

- [ ] **Raise with Rich before implementing.** Recommended handling: pin it with a
      characterisation test at a negative-offset `TZ`, port the behaviour unchanged, and add
      it to slice 8's defect list as defect 5. Do not fix it here — "we ported it" and "we
      changed it" must not share a diff.

---

## Delivery Shape

**Mode**: Stacked PRs
**Stack scope**: Intra-slice
**Mechanism**: **Unlinked dependent chain, NOT a GitHub-native stack.** `gh stack` is not
available in this environment (`gh` 2.86.0 reports `unknown command "stack"`), so ordinary
immediate-base semantics apply and the PRs must be merged manually bottom-up. Do not describe
these as a native stack anywhere.
**CI**: `.github/workflows/ci.yml` triggers on `pull_request:` with no branch filter, so PR2
gets the full `verify` job even though its base is a feature branch. Verified before
planning; re-check if that trigger is ever narrowed.
**Reason**: PR2 cannot compile without PR1 (hard lineage). More importantly the two ask
different review questions — "does this persist a child's progress correctly?" and "is this
port faithful?" — and mixing them buries the first in a large UI diff. PR1 is also the
data-sensitive half and deserves focused review on its own.
**Story scope**: The practice page works as a React island backed by a validated typed store.
PR boundaries must not expand it.
**Included slices**: One fixed slice (slice 4).
**Done when**: Every acceptance criterion above passes cumulatively at PR2.

| # | Ownership unit | PR boundary | Base | Owns | Depends on | Verification | Release state |
|---|---|---|---|---|---|---|---|
| 1 | intra-slice layer | `store.ts`, validated and proven equal to `store.js` | `main` | the domain store, its type guard, its parity proof | — | unit tests: guard, parity against real `store.js`, day-boundary maths; mutation gate | **Dormant** — nothing imports it; site byte-identical |
| 2 | intra-slice layer | the practice island and route | PR1's branch | `PageHeading`/header slot, `Practice.tsx`, `/practice`, retiring `practice.html` | `store.ts`'s public surface from PR1 | browser tests against real `localStorage`; build test; pixel proof; mutation gate | **Deployable** — completes the slice |

### Whole-stack gate

- [ ] Every acceptance criterion passes cumulatively at PR2
- [ ] Both boundaries' focused and cumulative checks pass
- [ ] No behaviour waits beyond its owning PR for its first test
- [ ] Each PR-ready boundary has current mutation or alternate evidence
- [ ] PR1 is safe to merge alone (dormant module + tests; no page changes)
- [ ] Merged manually bottom-up — PR1 first, then rebase PR2 and re-run checks
- [ ] Reduction ledger obligations: `N/A` — no mechanism-reduction program in this slice

---

## PR1 — `store.ts`, validated, proven equal to `store.js`

**Value**: Behaviour change (new module with new validation behaviour). The student-visible
outcome arrives in PR2, but this boundary owns a real new guarantee: malformed persisted
state can no longer reach the UI.
**Path**: `localStorage` → parse → type guard → typed state → domain operations → save.
**Class**: Behaviour change.
**Delivery**: Boundary 1 of the intra-slice chain above; base `main`.
**Required implementation skills**: `tdd`, `testing`, `typescript-strict`, `functional`;
`refactoring` after each GREEN; `mutation-testing` at PR readiness.
**Reduction program**: `N/A`.

**Focused review question**: *Does this persist a child's progress correctly, and can
anything it reads back break the page?*

**Files:**
- Create: `src/domain/store.ts`
- Create: `tests/unit/store-validation.test.ts`, `tests/unit/store-parity.test.ts`

**Interfaces:**
- Consumes: an injected storage port and clock — **not** `globalThis.localStorage` or
  `Date.now()` directly. The spec is explicit that `domain/` is pure and injectable, and it
  is what makes the day-boundary maths testable without a browser or a mocked global clock.
- Produces: the typed store surface PR2 consumes.

- [ ] **Step 1: Pin the day-number maths first (RED)**

Start here, not at the guard. `day()` is the fiddliest logic in the project and already has
one fixed defect behind it (#12). Write the failing tests first:

- a local calendar date maps to the same day number regardless of the clock's zone offset;
- the number advances at **local** midnight, not UTC midnight, across a BST transition;
- `TZ` is already pinned to `Europe/London` in `vitest.config.ts` — inject a clock rather than
  relying on that, so the test says what it means.

`tests/unit/streak-local-day.test.ts` already pins this for `store.js`; read it first and
match its cases so parity is meaningful.

- [ ] **Step 2: Port the operations (RED→GREEN per operation)**

One failing test per behaviour before its implementation. The operations, from
`public/assets/store.js`: `markTrained`, `streakInfo`, `best`/`setBest`, `misses`/
`recordCard`, `hash`, `logPractice`, `unlogPractice`, `practiceOn`, `todayPractice`, `today`,
`available`.

Behaviours worth their own test because they are easy to get subtly wrong:

- `markTrained` on the same day is idempotent; on `t-1` increments; on any older day resets
  to 1; `best` only ever climbs.
- `streakInfo` reports `count: 0` when the streak is dead (last trained before `t-1`) while
  **leaving the stored count alone** — it is a read.
- `logPractice` is a set, not a list: logging the same id twice stores it once.
- `unlogPractice` deletes the day's key entirely when the last activity is removed.
- The practice log prunes entries older than **60** days on every write.

- [ ] **Step 3: The persisted-state guard (RED→GREEN)**

A hand-rolled type guard, around twenty lines, no Zod. It must:

- **accept today's real data**. Existing students have unversioned
  `{streak, best, miss, plog}` written by `store.js`. Rejecting it would wipe live streaks.
  Write this test first and make it the one that cannot regress.
- discard and start clean on: invalid JSON, a JSON primitive or array at the top level, a
  `streak` that is not an object, non-numeric counts, a `plog` whose values are not arrays of
  strings.
- never throw out of a read. A student with a corrupt key sees an empty page state, not a
  blank screen.
- carry a schema version so a future change migrates rather than crashes. Record in a comment
  what "version 1" means: exactly the shape `store.js` writes today.

- [ ] **Step 4: The parity proof**

`tests/unit/store-parity.test.ts` drives **both** implementations through the same operation
sequences and asserts the resulting persisted JSON is identical. Load the real `store.js`
with the `new Function` technique `tests/unit/streak-local-day.test.ts` already uses — do not
reimplement it.

Cover at least: a fresh start; training on consecutive days; a gap that resets; logging and
unlogging several activities; a write that crosses the 60-day prune boundary; `setBest` with
a lower value; `recordCard` working a miss down to deletion.

**State the boundary of the claim in the test file itself:** parity holds for **well-formed**
state. On malformed state the two deliberately diverge — `store.js` muddles through,
`store.ts` discards and starts clean. That divergence is the point of the guard, so assert it
explicitly rather than letting the parity suite quietly not cover it.

- [ ] **Step 5: PRE-PR MUTATION gate**

Run `mutation-testing` over `src/domain/store.ts`. This is the richest logic in the slice —
day arithmetic, streak transitions, pruning — and the place mutation testing earns its keep.
Address valuable survivors. This repo has no Stryker configured; earlier slices ran the gate
by hand. Either configure it for `src/domain/` or run the manual battery, and **say which**.

**Done when**: guard and parity tests pass; the mutation gate is complete with survivors
addressed or recorded as equivalent with evidence; `npm run typecheck`, `npm run build`,
`npm test`, `npm run test:browser`, `npm audit --audit-level=high` all pass; the built site is
byte-identical to `main`'s, because nothing imports the new module yet.

---

## PR2 — the practice island and route

**Value**: Behaviour change. A student opens `/practice`, ticks what they trained, and their
streak is kept — the same outcome as today, now on a real route with a typed store behind it.
**Path**: `/practice` → `Practice.tsx` island → `store.ts` → `localStorage` → re-render.
**Class**: Behaviour change, preceded by one behaviour-preserving refactor (the header slot).
**Delivery**: Boundary 2; base is PR1's branch.
**Required implementation skills**: `tdd`, `testing`, `react-testing`, `front-end-testing`,
`frontend-design`; `refactoring` for the PageShell step; `mutation-testing` at PR readiness.
**Reduction program**: `N/A`.

**Focused review question**: *Is this port faithful — visually, and in what it writes?*

**Files:**
- Create: `src/pages/practice.astro`, `src/components/Practice.tsx`,
  `src/components/PageHeading.astro`
- Modify: `src/layouts/PageShell.astro`, `src/styles/app.css` (or a scoped style block)
- Create: `tests/browser/practice.test.tsx`, `tests/build/practice-route.test.ts`
- Delete: `public/practice.html`
- Modify: `netlify.toml`, `tests/build/legacy-content.sha256`,
  `tests/build/public-passthrough.test.ts` (`LEGACY_PAGES`), `CLAUDE.md`, `README.md`

- [ ] **Step 1: The header composition (pure refactor, first and separate)**

Slice 3b deferred this deliberately, and this is the slice that needs it. `PageShell`'s
`masthead` slot **replaces** the header; this page needs to **append** to it — its
`#streakChip` sits inside `<header>` after `.sub`, and quiz and flashcards do the same, so
this is the shape all three remaining migrations want.

Replace the optional `heading`/`subheading` props and their build-time throw with one `header`
slot whose default renders a small `PageHeading` component from props. The conditional-
requirement invariant and the guard both disappear; the streak chip then composes for free.

This is **behaviour-preserving**: belts, kata and home must render byte-identically before and
after. Do it as its own commit, with the existing build tests plus a screenshot check as the
preservation evidence, **before** any island work. Do not fold it into the island commit.

- [ ] **Step 2: The island (RED→GREEN in the browser)**

`tests/browser/practice.test.tsx` with Vitest Browser Mode and `vitest-browser-react`, against
**real** `localStorage` — the spec asks for exactly that, and it is why this page is an island
rather than a static page. Clear the key between tests.

Drive the behaviours from the table above through the rendered component, by role and text
rather than by class name. The two that matter most, because they are the asymmetry a
reimplementation would smooth over:

- ticking an activity logs it **and** marks the streak;
- un-ticking removes the activity and leaves the streak alone.

Then: the count-dependent status wording (0 / 1 / many), the week strip's counts and today
ring, the summary's two numbers, and that state survives a remount.

`PRACTICE` comes from `src/data` as a prop from the route, not from `data.js` — which takes
another ~50KB off this page, as `/` gained in slice 3b.

- [ ] **Step 3: Pixel fidelity**

Same method as slice 3b, which is the standard now: serve
`git show <main>:public/practice.html` alongside the built route and compare full-page
screenshots at 390×900 DPR2. **Byte-identical, or explain every differing pixel.**

Use tokens where a literal matches one exactly; keep literals that have no token
(`#e5e0d8`, `#e9f7ef`, the `.day .dot` greys) and note them for slice 9 rather than inventing
tokens in this slice.

- [ ] **Step 4: Characterise the weekday-label defect**

Only after Rich has confirmed the handling (see **Defects**). Pin the current behaviour with a
test that runs at a negative-offset `TZ`, so slice 8's fix has something to turn red.

- [ ] **Step 5: Retire the legacy page**

`git rm public/practice.html`, drop its manifest line and its `LEGACY_PAGES` entry, add the
`netlify.toml` 301 from `/practice.html` to `/practice`. **No `force` needed** — unlike `/`,
Astro emits `/practice/index.html`, so `/practice.html` matches no file and the plain rule
fires. Confirm the route-shadow guard fails while both exist and passes after, as 3b did.

Then check for inbound links: `/` links to `/practice.html` and so do quiz and flashcards.
Repoint them to `/practice` and re-record those pages' checksums.

- [ ] **Step 6: Documentation**

CLAUDE.md's tree, its "three legacy pages" note and its Persistence section; README's page
table. Record that `src/domain/store.ts` is now the typed store, that `store.js` survives for
the two remaining legacy pages, and that a parity test holds them together until slice 6.

- [ ] **Step 7: PRE-PR MUTATION gate**

Run the gate over `Practice.tsx`'s toggle and status logic. Where a mutant is only reachable
through the browser suite, say so and record the alternate evidence rather than inventing a
node-level structural mutant.

**Done when**: every acceptance criterion passes; the pixel proof is byte-identical; the
route-shadow guard was confirmed failing before the deletion and passing after; `public/`
holds two pages; the full gate passes; the mutation gate is complete or its `N/A` is
justified.

---

## Pre-PR Quality Gate

Before **each** PR:

1. Implementation complete; refactoring assessed.
2. Mutation or alternate evidence for that boundary's accumulated scope; valuable survivors
   addressed within the same gate.
3. `npm run typecheck`, `npm run build`, `npm test`, `npm run test:browser`,
   `npm audit --audit-level=high` all pass.
4. `git status --short` clean.
5. DDD glossary check: `N/A` — this project does not use DDD.

## What this slice deliberately does not do

- **No quiz or flashcards migration** — slices 5 and 6.
- **No deletion of `store.js` or `data.js`** — two legacy pages still load both.
- **No defect fixes**, including the weekday-label one found here — slice 8, one RED→GREEN
  commit each.
- **No CSP or header hardening** — slice 7.
- **No design-system normalisation** — slice 9. That includes the untokenised greys this page
  brings with it and the `520px` vs `560px` width drift.
- **No unifying the two streak-chip wordings.** Pre-existing divergence, content decision,
  needs Rich.
