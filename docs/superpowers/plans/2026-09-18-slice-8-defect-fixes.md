# Slice 8 — The Six Defect Fixes: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement
> this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. This slice ships as **one
> PR** of six RED→GREEN commits, one per defect, in the order below; see **Delivery Shape**.

**Branch**: `plan/slice-8-defects` (this plan) → `feat/slice-8-defects`
**Status**: Active

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
| 6 | "N cards needed a second look" counts presses of Again, not cards — one card missed three times says "3 cards" | `tests/unit/flashcards-labels.test.ts` (the sentence) | **Yes** — miss any card twice | The sentence counts cards |
| 2 | A terminology round from a tier under ten terms counts "QUESTION 3 / 10" then scores "3 / 3" | `tests/unit/quiz-labels.test.ts`, `tests/unit/quiz-questions.test.ts`, `tests/browser/quiz.test.tsx` | No — the smallest tier has 13 terms | Nothing, until a tier is edited below ten |
| 1 | Two terms sharing an English gloss render the same option twice, and both count as correct | `tests/unit/quiz-questions.test.ts` | No — no shared glosses in the shipped 59 terms | Nothing, until a gloss is shared |
| 4 | A kumite range under five leaves too few other kumite for "which kumite is this?", so it offers three options | `tests/unit/quiz-questions.test.ts` | No — the menu offers 1–6 and 1–12 only | Nothing, until a smaller range is offered |

Defect 3 was fixed in #12 and is not part of this slice.

## One decision, taken before planning

Defects 1 and 4 share a root: a question's wrong answers come only from its own level or
range, so a pool too small (or a gloss shared) yields fewer than four distinct options.
Rich decided on 2026-09-18: **widen to the whole content.** A terminology question draws
extra wrong answers from the other tiers when its own level cannot supply three distinct
glosses; a kumite question draws from the sequences beyond its range. A question offers
fewer than four options only when the whole site's content cannot provide them — which
today it always can. A student on "Kumite 1–6" may therefore see "Kumite 9" as a wrong
option; it is still a wrong answer.

The same rule covers a third case the register does not name but which has the same root:
"what comes next" draws its wrong answers from the steps of the sequences in range, and a
range of one short sequence cannot supply three. It is fixed in defect 4's commit, with its
own test, because leaving it would be fixing half a mechanism.

**Spec:** `docs/superpowers/specs/2026-08-28-productionise-student-hub-design.md`

## Acceptance Criteria

- [ ] Starting a new quiz round clears the "N in a row!" line; it reappears only once a run of
      three is earned in that round.
- [ ] The practice week strip labels each day with the weekday of the local calendar day it
      records, in every timezone — pinned at London, Auckland, New York and Los Angeles.
- [ ] Finishing a flashcard deck reports how many *distinct cards* needed a second look: one
      card missed three times says "1 card".
- [ ] A quiz round's counter, progress bar and final score all use the round's real length, in
      both modes.
- [ ] Every terminology question offers four distinct option texts, exactly one of which is
      correct, even when two terms share a gloss; extra wrong answers come from other tiers
      when the level's own cannot supply three.
- [ ] Every kumite question — "which kumite", "what comes next" — offers four distinct options
      even for a range of one, drawing from beyond the range when needed; fewer only when the
      whole content has fewer.
- [ ] `grep -rn "slice-8\|DEFECT" src tests` returns nothing; the spec's register marks each of
      the six as fixed with its commit; CLAUDE.md no longer says defect 2 is pinned anywhere.
- [ ] Nothing else a student sees changes: the fixes for 1, 2 and 4 are unreachable with
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

- [ ] RED: in `tests/browser/quiz.test.tsx`, the "DEFECT 7" describe becomes "a new round starts
      with no run line": after `answerWholeRound()` and "Train again", `.streak` is empty.
- [ ] GREEN: `Quiz.tsx`'s `start` clears the run line. One line.
- [ ] REFACTOR to assess: the run line is separate `useState` today only because the legacy
      page kept it separate. Deriving it from the session's own run count (`streakRun(run)` at
      render) would make this defect impossible rather than fixed. Do it if the session
      already carries the run; otherwise leave the one line and say why.
- [ ] Remove the DEFECT 7 comment block in `Quiz.tsx`.

### Commit 2 — Defect 5: the week strip names the right day everywhere

- [ ] RED: in `tests/unit/practice-labels.test.ts`, the two west-of-UTC cases expect `'Thu'`,
      and the describe stops calling itself a known defect. Keep all four timezones: the point
      is that the answer no longer depends on the viewer's zone.
- [ ] GREEN: `weekdayLabel` formats the instant in UTC (`timeZone: 'UTC'`). The day number
      encodes a local calendar day as midnight UTC of that date, so reading it back in UTC is
      reading it back correctly. One option, no arithmetic.
- [ ] Rewrite the comment above `weekdayLabel` to say what the number is and why UTC is the
      right lens, not that it is a defect.

### Commit 3 — Defect 6: the second-look count counts cards

- [ ] RED, in the browser (`tests/browser/flashcards.test.tsx`), because the sentence itself is
      right when given the right number — the defect is what the island hands it: on the
      smallest deck, press Again on the first card, Got it on every other card, Again on the
      first card twice more as it returns, then Got it. The completion line says
      "1 card needed a second look".
- [ ] GREEN: `Flashcards.tsx`'s session carries the set of cards missed (`ReadonlySet<string>`
      of fronts, built immutably) instead of a press count; the completion line receives its
      size.
- [ ] `tests/unit/flashcards-labels.test.ts`: the "known defect" describe becomes a plain
      statement that the argument is a count of distinct cards; the `(3, 0)` case stays,
      because three distinct cards *should* say "3 cards".
- [ ] Remove the defect comments in `flashcards-labels.ts` and `Flashcards.tsx`.

### Commit 4 — Defect 2: the round is as long as it really is

- [ ] RED: `tests/unit/quiz-labels.test.ts` expects `displayedTotal('terms', 4)` to be 4 and
      the counter to read "QUESTION 3 / 3"; `tests/browser/quiz.test.tsx`'s DEFECT 2 describe
      expects "QUESTION 1 / 4", a bar at 25% after one answer, and "4 / 4" at the end;
      `tests/unit/quiz-questions.test.ts`'s defect 2 describe keeps `toHaveLength(3)` and drops
      the "shorter than the displayed total" assertion — a short tier simply yields a short
      round.
- [ ] GREEN: the displayed total is the question count in both modes.
- [ ] REFACTOR: with both modes agreeing, `displayedTotal` says nothing; delete it, pass
      `session.round.questions.length` to the counter and the bar, and drop `quiz-labels.ts`'s
      import of `ROUND_LENGTH`. Remove the DEFECT 2 comments in `quiz-labels.ts` and `Quiz.tsx`.

### Commit 5 — Defect 1: one right answer, four distinct options

- [ ] RED: `tests/unit/quiz-questions.test.ts`'s defect 1 describe expects `'kick'` exactly once
      among four distinct options; add a second case where a tier of two terms sharing one
      gloss gets its other wrong answers from another tier (four distinct options, all real
      glosses), and a third where the whole content has only two distinct glosses and the
      question offers two options — the boundary the decision above sets.
- [ ] GREEN: `termQuestion` chooses wrong answers by the text it will *display* (gloss when
      forward, Japanese when backwards), deduplicated, from the level's own pool first and
      then from every tier, until it has three. `termsRound` passes both pools.
- [ ] `Quiz.tsx`'s `optionClass` still marks by text; with options now distinct that marks
      exactly one button. Rewrite its comment to say so rather than that it is a defect.
- [ ] Rewrite the header comment of `quiz-questions.ts`, which says it exists partly to pin
      three defects.

### Commit 6 — Defect 4: four options for any range

- [ ] RED: the defect 4 describe expects "which kumite" in a range of three to offer four
      options with the extra drawn from beyond the range (the fixture gains a fourth sequence
      at `n: 4`); a second case with three sequences in the whole content offers three; a third
      case, new: a range of one sequence with three steps still offers four options for "what
      comes next", the extra steps drawn from beyond the range.
- [ ] GREEN: `whichKumiteQuestion` and `nextStepQuestion` take the in-range pool and the full
      pool, draw from in-range first and then beyond, deduplicated, until three wrong answers.
      `kumiteRound` builds both vocabularies.
- [ ] Remove the DEFECT 4 comment.

### Commit 7 — Docs

- [ ] The spec's register: each of the six gains "Fixed in slice 8, commit `<sha>`" on its own
      line, leaving the description as the record of what was wrong.
- [ ] CLAUDE.md: `src/components/` says the label files hold strings "which is where DEFECT 2
      is pinned" — now simply that they are testable without a browser. Any other "defect"
      mention that describes a current state rather than history goes with it.
- [ ] `grep -rn "slice-8\|DEFECT" src tests` is empty. `grep -rn -i "defect" src` shows only
      history, if anything.

### PR gate — mutation battery and evidence

Mutation testing is meaningful here — six small pieces of logic — and, as in slices 4–6, it is
a hand-applied battery recorded in the PR, not a Stryker run. At minimum, each mutant below
must be killed by a named test:

| Fix | Mutant | Must be killed by |
|---|---|---|
| 7 | the clearing line removed | the new browser test |
| 7 | cleared on answer instead of on start | the existing run-line test (still shows after three) |
| 5 | `timeZone` option removed | New York and Los Angeles cases |
| 6 | size replaced with press count (`+ 1` per Again) | the new browser test |
| 6 | set never grows | "1 card" test and the existing "counts the cards" test |
| 2 | terms branch returns ten again | quiz-labels unit and the browser counter test |
| 2 | bar denominator left at ten | the browser bar-width assertion |
| 1 | exclude-by-Japanese restored | the 'kick once' case |
| 1 | dedupe removed | the 'kick once' case |
| 1 | widening removed | the cross-tier case |
| 1 | boundary off by one (`< 3` / `<= 3`) | the two-gloss case |
| 4 | widening removed for "which" / for "next" | each new case |
| 4 | `slice(0, 2)` / `slice(0, 4)` | four-options assertions |

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
