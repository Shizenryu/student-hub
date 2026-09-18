# Slice 8 — The Six Defect Fixes: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement
> this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. This slice ships as **one
> PR** of six RED→GREEN commits, one per defect, in the order below; see **Delivery Shape**.

**Branch**: `plan/slice-8-defects` (this plan) → `feat/slice-8-defects`
**Status**: Complete

## Goal

The six defects the spec's register still lists — 1, 2, 4, 5, 6 and 7 — are fixed, each in
one commit that turns its own characterisation pin from "wrong, deliberately" into the
specified behaviour. When the slice merges, `grep -rn "slice-8\|DEFECT" src tests` finds
nothing, and every test that used to say "a pin, not a specification" now says what the
page should do.

## What the register says, and what each fix changes for a student

| # | Defect | Where the pin is | Reachable today? | What a student will notice |
|---|---|---|---|---|
| 7 | The quiz's "N in a row!" line from the last answer of one round is still showing on the first, unanswered question of the next | `tests/browser/quiz.test.tsx` | **Yes** — end a round on a run of three, tap "Train again" | The line is gone at the start of a new round |
| 5 | The practice week strip's day labels are a day early anywhere west of UTC | `tests/unit/practice-labels.test.ts`, four timezones | Only west of UTC — never at the dojo | Nothing in the UK; a travelling student sees the right weekday |
| 6 | "N cards needed a second look" counts presses of Again, not cards — one card missed three times says "3 cards" | `tests/unit/flashcards-labels.test.ts` pins the *sentence*, which is right for the right number; the island's count is pinned nowhere, so the RED is a new browser test in `tests/browser/flashcards.test.tsx` | **Yes** — miss any card twice | The sentence counts cards |
| 2 | A terminology round from a tier under ten terms counts "QUESTION 3 / 10" then scores "3 / 3" | `tests/unit/quiz-labels.test.ts`, `tests/unit/quiz-questions.test.ts`, `tests/browser/quiz.test.tsx` | No — the smallest tier has 13 terms | Nothing, until a tier is edited below ten |
| 1 | Two terms sharing an English gloss render the same option twice, and both count as correct | `tests/unit/quiz-questions.test.ts` | No — no shared glosses in the shipped 59 terms | Nothing, until a gloss is shared |
| 4 | A kumite range of three or fewer leaves too few other kumite for "which kumite is this?", so it offers three options (four in range leaves three others, which is enough) | `tests/unit/quiz-questions.test.ts` | No — the menu offers 1–6 and 1–12 only | Nothing, until a smaller range is offered |

Defect 3 was fixed in #12 and is not part of this slice.

## One decision, taken before planning

Defects 1 and 4 share a root: a question's wrong answers come only from its own level or
range, so a pool too small (or a gloss shared) yields fewer than four distinct options.
Rich decided on 2026-09-18: **widen to the whole content.** A terminology question draws
extra wrong answers from the other tiers when its own level cannot supply three distinct
glosses; a kumite question draws from the sequences beyond its range. A question offers
fewer than four options only when the whole site's content cannot provide them — which
today it always can. A student on a small future "Kumite 1–3" range may therefore see
"Kumite 9" as a wrong option; it is still a wrong answer.

**Own pool first, and only then beyond.** With today's content every level and both ranges
supply three wrong answers on their own, so a student must never see a Dan-grade gloss on a
Beginner round or "Kumite 9" on "Kumite 1–6". That is acceptance criterion 8, and it needs
its own tests: an implementation that pools own-and-beyond together, shuffles and slices
would pass every existing test and change what students see. Commits 5 and 6 each add a
case that pins "own first" with a fixture where the own pool is sufficient.

The same rule covers a third case the register does not name but which has the same root:
"what comes next" draws its wrong answers from the steps of the sequences in range, and a
range of one short sequence cannot supply three. It is fixed in defect 4's commit, with its
own test, because leaving it would be fixing half a mechanism.

**Spec:** `docs/superpowers/specs/2026-08-28-productionise-student-hub-design.md`

## Acceptance Criteria

- [x] Starting a new quiz round clears the "N in a row!" line; it reappears only once a run of
      three is earned in that round.
- [x] The practice week strip labels each day with the weekday of the local calendar day it
      records, in every timezone — pinned at London, Auckland, New York and Los Angeles.
- [x] Finishing a flashcard deck reports how many *distinct cards* needed a second look: one
      card missed three times says "1 card".
- [x] A quiz round's counter, progress bar and final score all use the round's real length, in
      both modes.
- [x] Every terminology question offers four distinct option texts, exactly one of which is
      correct, even when two terms share a gloss; extra wrong answers come from other tiers
      when the level's own cannot supply three.
- [x] Every kumite question — "which kumite", "what comes next" — offers four distinct options
      even for a range of one, drawing from beyond the range when needed; fewer only when the
      whole content has fewer.
- [x] `grep -rn -i "slice-8" src tests` returns nothing, and `grep -rn -i defect src tests`
      finds only defect 3's history (its fix in #12, in `store.ts` and its day-number test);
      the spec's register marks each of the six as fixed with its commit; CLAUDE.md describes
      defects only as history.
- [x] Nothing else a student sees changes: the fixes for 1, 2 and 4 are unreachable with
      today's content; 5 changes nothing in the club's timezone; 6 and 7 change exactly the
      sentence and the line named above.

## Delivery Shape

**Mode**: Independent PR against `main` · **Stack**: none.

One PR, six commits, each "test flips + fix" so that the RED and GREEN of one defect never
share a diff with another's. The order is by what a student can reach, so if the PR had to
be cut short the reachable fixes would already be in: **7, 5, 6, 2, 1, 4**, then a final docs
commit. Review is per commit; the PR description lists them.

## Implementation

**Required skills**: `tdd`, `testing`, `react-testing` (defects 6 and 7 are pinned in the
browser suites), `typescript-strict`, `functional`; `refactoring` after each GREEN;
`mutation-testing`'s mutator rules for the hand-applied battery at the PR gate, as slices 4–6
did (there is no Stryker in this repo; the battery is applied and recorded by hand).

**Class**: Behavior change, every commit.

Each commit follows the same shape: **RED** is rewriting the defect's pin so it asserts the
correct behaviour (the comment saying "a pin, not a specification" goes with it); run that
file alone and watch the old behaviour fail it; **GREEN** is the smallest change that passes;
then remove the `DEFER(slice-8)` / `DEFECT n` comments at the fix site and wherever else they
point at this defect; **REFACTOR** where named.

### Commit 1 — Defect 7: the run line dies with its round

- [x] RED: in `tests/browser/quiz.test.tsx`, the "DEFECT 7" describe becomes "a new round starts
      with no run line": after `answerWholeRound()` and "Train again", `.streak` is empty.
- [x] GREEN: `Quiz.tsx`'s `start` clears the run line. One line.
- [x] REFACTOR, in the same commit: the run line is separate `useState` only because the
      legacy page kept it separate, and the session already carries `run` (`Quiz.tsx` line
      75). Derive the line at render as `streakRun(session.run)` and delete the state, which
      makes this defect impossible rather than fixed. What must NOT change: within a round the
      line stays on screen through "Next" onto the following unanswered question, because
      `next` keeps the session's run; that is how the legacy page behaved and the existing
      run-line test asserts it. Only a new round (a fresh session, `run: 0`) clears it.
- [x] Remove the DEFECT 7 comment block in `Quiz.tsx`.

### Commit 2 — Defect 5: the week strip names the right day everywhere

- [x] RED: in `tests/unit/practice-labels.test.ts`, the two west-of-UTC cases expect `'Thu'`,
      and the describe stops calling itself a known defect. Keep all four timezones: the point
      is that the answer no longer depends on the viewer's zone.
- [x] GREEN: `weekdayLabel` formats the instant in UTC (`timeZone: 'UTC'`). The day number
      encodes a local calendar day as midnight UTC of that date, so reading it back in UTC is
      reading it back correctly. One option, no arithmetic.
- [x] Rewrite the comment above `weekdayLabel` to say what the number is and why UTC is the
      right lens, not that it is a defect.

### Commit 3 — Defect 6: the second-look count counts cards

- [x] RED, in the browser (`tests/browser/flashcards.test.tsx`), because the sentence itself is
      right when given the right number — the defect is what the island hands it: on the
      smallest deck (`startSmallestDeck()`, nine cards; every grade needs `flipCard()` first,
      and this file has no `settle` helper), press Again on the first card, Got it on the
      other eight, Again on the first card twice more as it returns, then Got it. Today the
      completion line says "3 cards needed a second look. They will come up first next time.";
      the test expects "1 card needed a second look. They will come up first next time.".
- [x] GREEN: `Flashcards.tsx`'s session carries the set of cards missed (`ReadonlySet<string>`
      of fronts, built immutably) instead of a press count; the completion line receives its
      size.
- [x] `tests/unit/flashcards-labels.test.ts`: the "known defect" describe becomes a plain
      statement that the argument is a count of distinct cards; the `(3, 0)` case stays,
      because three distinct cards *should* say "3 cards".
- [x] Remove the defect comments in `flashcards-labels.ts` and `Flashcards.tsx`.

### Commit 4 — Defect 2: the round is as long as it really is

- [x] RED is the browser test alone: `tests/browser/quiz.test.tsx`'s DEFECT 2 describe expects
      "QUESTION 1 / 4" on the first question and "QUESTION 2 / 4" with a bar at 25% after one
      answer *and Next* (the bar tracks `index`, which only advances on Next). Its second test,
      "4 / 4" at the end, already passes today and stays as the other half of the statement.
- [x] GREEN: the counter and the bar use `session.round.questions.length`; `displayedTotal` is
      deleted rather than fixed, since with both modes agreeing it would say nothing. Drop
      `quiz-labels.ts`'s import of `ROUND_LENGTH`.
- [x] Unit suites in the same commit: `tests/unit/quiz-labels.test.ts`'s DEFECT 2 describe goes
      (it tested the deleted function); `questionCounter(2, 3)` → "QUESTION 3 / 3" joins the
      plain counter cases. `tests/unit/quiz-questions.test.ts`'s defect 2 describe keeps
      `toHaveLength(3)` and drops the "shorter than the displayed total" assertion — a short
      tier simply yields a short round.
- [x] Remove the DEFECT 2 comments in `quiz-labels.ts` and `Quiz.tsx`.

### Commit 5 — Defect 1: one right answer, four distinct options

- [x] RED: `tests/unit/quiz-questions.test.ts`'s defect 1 describe becomes four cases. (a) The
      existing keri/geri fixture: *every* question in the round offers four distinct options
      with the correct text exactly once — every question, not just the 'kick' one, because on
      the 'punch' question the duplicate gloss sits among the *wrong* candidates, and that is
      the case a dedupe-only-the-correct-text implementation misses. (b) Own pool first: two
      tiers, tier 1 with five distinct glosses, level 1 — every option on every question is a
      tier-1 gloss. (c) Widening: tier 1 is two terms sharing one gloss, tier 2 has three more
      distinct glosses, level 1 — four distinct options, the extras from tier 2. (d) The
      boundary: the whole content has two distinct glosses — the question offers two options.
- [x] GREEN, one mechanism: the candidate wrong answers are the *displayed* texts of the pool
      (gloss when forward, Japanese when backwards), distinct, minus the correct text; taken
      first from the level's own pool, then from every tier, until there are three. There is
      no separate "exclude by Japanese" step to keep. `termsRound` passes both pools.
- [x] `Quiz.tsx`'s `optionClass` still marks by text; with options now distinct that marks
      exactly one button. Rewrite its comment to say so rather than that it is a defect.
- [x] Rewrite the header comment of `quiz-questions.ts`, which says it exists partly to pin
      three defects.

### Commit 6 — Defect 4: four options for any range

- [x] RED: the defect 4 describe becomes four cases. (a) "Which kumite" in a range of three
      offers four options with the extra drawn from beyond the range (the fixture gains a
      fourth sequence at `n: 4`). (b) Three sequences in the whole content offer three. (c) Own
      range first: the existing six-sequence fixture plus a seventh, `upTo: 6` — no option on
      any question names "Kumite 7", and no option is a step that only the seventh sequence
      has. (d) "What comes next" in a range of one three-step sequence offers four options,
      the extras drawn from beyond the range: filter the round by hint `'What comes next?'`
      (with `noShuffle` the first candidate is step 0, whose hint is "The attack that starts
      it"), and give the beyond-range sequences at least three steps that are neither the
      correct step nor already in range, or dedupe leaves fewer than four.
- [x] GREEN: `whichKumiteQuestion` and `nextStepQuestion` take the in-range pool and the full
      pool, draw from in-range first and then beyond, deduplicated, until three wrong answers.
      `kumiteRound` builds both vocabularies.
- [x] Remove the DEFECT 4 comment, including its "under five" wording.

### Commit 7 — Docs

- [x] The spec's register: each of the six gains "Fixed in slice 8, commit `<sha>`" on its own
      line, leaving the description as the record of what was wrong.
- [x] CLAUDE.md: three lines describe the pins as current state — "which is where DEFECT 2 is
      pinned" (components), "the only place three of the page's four known defects can be
      pinned" (the `/quiz` paragraph) and "carries the pins for DEFECTS 1 and 4" (domain). Each
      becomes a statement of what the module is for now.
- [x] Comments no earlier commit names but which describe the defects as current, all of which
      go or become history in whichever commit touches the file, and are swept here if missed:
      `src/pages/quiz.astro` line 9 ("where three of the page's four known defects are
      pinned"); `src/domain/quiz-questions.ts` lines 31–34 (the `Question` type's note on
      matching by text); `src/components/Quiz.tsx` lines 31–33, 46–47 and 270–271 (header,
      `Answered` type, option `key` comment); `src/components/practice-labels.ts` lines 3–5;
      `tests/unit/quiz-questions.test.ts` lines 8–11 and 177–181.
- [x] `grep -rn -i "slice-8\|defect" src tests` is empty.

### PR gate — mutation battery and evidence

Mutation testing is meaningful here — six small pieces of logic — and, as in slices 4–6, it is
a hand-applied battery recorded in the PR, not a Stryker run. At minimum, each mutant below
must be killed by a named test:

| Fix | Mutant | Must be killed by |
|---|---|---|
| 7 | the line derived from anything but the session's run (a constant, or stale state) | the new "no run line on a new round" test, and the existing "shows after three in a row" test between them |
| 5 | `timeZone` option removed | New York and Los Angeles cases |
| 6 | size replaced with press count (`+ 1` per Again) | the new browser test |
| 6 | set never grows | "1 card" test and the existing "counts the cards" test |
| 2 | counter denominator hard-coded to ten | the browser counter test ("QUESTION 1 / 4") |
| 2 | bar denominator hard-coded to ten | the browser bar-width assertion (25%) |
| 1 | "minus the correct text" removed | case (a), the 'kick' question |
| 1 | "distinct" removed | case (a), the 'punch' question — its wrong candidates hold 'kick' twice |
| 1 | own-pool-first removed (own and beyond pooled together) | case (b) |
| 1 | widening removed | case (c) |
| 1 | `slice(0, 2)` / `slice(0, 4)` | the existing 'offers four options, one of them right' (five distinct glosses); the new fixtures have too few candidates to tell |
| 4 | widening removed for "which" / for "next" | cases (a) and (d) |
| 4 | own-range-first removed | case (c) |
| 4 | `slice(0, 2)` / `slice(0, 4)` | the existing six-sequence "which kumite" and "what comes next" tests; the new fixtures have exactly three others |

Plus the ordinary gate: `npm run typecheck`, `npm run build`, `npm test`,
`npm run test:browser`, `npm run test:deploy`, `npm audit --audit-level=high`;
`git status --short` clean.

**Pixel identity**: not claimed. Fixes 6 and 7 change a sentence and a line on purpose; the
rest change nothing reachable. `compare-pixels.mjs` is for ports; this is not one.

## What this slice deliberately does not do

- **No new content.** Every fix is proven against crafted fixtures; the shipped terms and
  kumite are untouched.
- **No new question shapes, no new menu ranges.** A "Kumite 1–3" button would be a product
  change; defect 4's fix only makes one *possible*.
- **No visual normalisation** — slice 9, which follows this one.
- **No kumite reference page** — queued after slice 9.
