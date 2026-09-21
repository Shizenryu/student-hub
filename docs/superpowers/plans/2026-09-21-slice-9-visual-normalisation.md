# Slice 9 — Visual Normalisation: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement
> this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. This slice ships as **one
> PR** of themed commits; see **Delivery Shape**. It is the only slice in the migration
> whose changes a student can see, so the PR's review artefact is a picture, not a diff.

**Branch**: `plan/slice-9-visual-normalisation` (this plan) → `feat/slice-9-visual-normalisation`
**Status**: Active

## Goal

Every page draws from one design system: one column width, one grey scale, one gold, one
shadow, one set of radii, one shell spacing scale, one card, one menu-tile scale, one heading
pair for the inner pages, one section-heading size. Every `DEFER(slice-9)` is discharged, the
shell's `width` and `variant` props and their `.app--*` classes are gone, the 404 page joins
the shell, and a test keeps a new literal from creeping back. Every route that looks
different afterwards looks different on purpose, and the PR shows each one before and after
with the reason.

## What "as it actually is today" looks like

`tokens.css` was transcribed from six hand-written pages and says so: the drift between them
was deliberately carried across so the migration could be reviewed as a port. The inventory,
from `grep -rn "DEFER(slice-9)"` plus a sweep of every stylesheet and every `.astro`
`<style>` block, checked line by line at planning:

| Thing | Values today | Where |
|---|---|---|
| Column width | 480px quiz · 520px home, practice, flashcards, 404 · 560px belts, kata | `.app--narrow`, `--app-max`, `.app--wide`; 404 hard-codes 520 |
| Text greys not in tokens | #333 (kata prose) · #555 (home maxim, quiz maxim, kata quote, practice mind, 404 body) · #666 (`.intro`) · #777 (flashcards done-sub, practice summary) | KataGuide, index, quiz.css, practice.css, flashcards.css, 404 |
| Gradient stops on the home tiles | #3a3a3a, #8B0A20 (not belt colours) · #00843D, #6B3F1D (belt colours) | index.astro — a palette, not greys |
| Golds | #9A7D00 (`--gold`) · #b07d00 (quiz run line) | quiz.css |
| Borders and tints | #e5e0d8 (practice tile, practice day dot, quiz option — ×3) · #e9f7ef (good fill ×2) · #fdecea (bad fill ×1) · #eee (progress track) · #f4efe7 (home doc pressed) · #f5f1ea (flashcards back-face *text*) | practice, quiz, index, flashcards |
| White | `color: #fff` ×8 as text on a coloured tile or button, plus the data palettes' white text | flashcards, quiz, practice, index |
| Shadows | `--shadow-card` .08 · rgba .10 (home tile, flashcards card) · .07 (home doc) · .06 (home maxim) | index, flashcards |
| Radii as literals | 12px (practice tile = `--radius-banner`) · `0 10px 10px 0` (belt and kata maxim = `--radius-control` corner) · `0 8px 8px 0` (quiz maxim) · 4px (quiz progress track) | practice, BeltGuide, KataGuide, quiz |
| Shell spacing | app padding-top 20 (home and 404: 28) · header margin-bottom 18 (practice 14) · card padding 18 (islands 20 via `.card-roomy`) · footer .7rem/20px (home .72rem/28px/1.7) · chip margin-top 6 (home −14/20, centred, .8rem) | app.css variants, 404 |
| Heading pair | h1 1.3rem/.sub .72rem · quiz 1.35/.75 · home and 404 1.7/.75 · flashcards' .sub gold | app.css variants, index, 404 |
| Section headings (h2 family) | .78rem/.2em on belts, kata, practice · .8rem on home · `.modehead` .78rem/.15em on quiz; margins differ per page | five places |
| Lede | `.intro` .85rem · quiz .9rem | app.css |
| Menu tiles | deck 14px 16px/.98rem/600, no tap transform · quiz level 14px 16px/1rem/600/.97 · belt 16px 12px/.95rem/700/.03em/centred/.96 (two-column) · kata 16px/`.n` 1.1rem 800 `.t` .75rem/.97 | flashcards.css, quiz.css, belts/index.astro, kata/index.astro |
| Palettes that mirror data | belt colours (belts.css, pinned) · kata colours (kata.css, pinned) · deck colours d1–d7 (flashcards.css, unpinned) · quiz level gradients b1–b5 (quiz.css, unpinned) | four stylesheets |

The palettes that mirror data stay literal: they are content, not design. The deck and
gradient palettes are not pinned today; the drift test's allow-list names them, which is
weaker than a pin but is not this slice's job to strengthen.

## Decisions

Settled with Rich on 2026-09-21:

1. **Column width: 520px everywhere.** The middle value and the token's existing default.
   Belts and kata lose 40px on tablets; the quiz gains 40px; nothing changes on a 390px phone.
2. **The home masthead stays; flashcards' subheading goes red.** Home's crest-and-1.7rem lockup
   is the brand mark, not drift, and keeps its own scoped sizes in `index.astro`. Its *shell*
   spacing normalises like every other page. The gold subheading on flashcards had no stated
   reason and joins the other five.
3. **Greys collapse onto the existing five**, no new token. By actual use: kata prose #333 →
   `--ink`, so the kata and belt guides' body text agree (belts already inherits `--ink`);
   every #555 → `--ink-soft` (all five are body-weight text: the two maxims, the kata quote,
   the practice mind panel, the 404 body); `.intro` #666 → `--muted`; #777 → `--muted`.

Recommended here, for Rich to veto in the plan PR or on the sheet:

4. **One gold.** The quiz run line's #b07d00 becomes `--gold`. Slightly darker flame text.
5. **Three new tokens, each for a value that is design rather than a one-off:** `--line: #e5e0d8`
   (three borders on two pages), `--good-tint: #e9f7ef` (two pages), `--bad-tint: #fdecea`
   (the good tint's pair; one use today, but a pair with one member is a trap). The rest fold
   onto existing tokens: #eee → `--rule` (closest by 2/3/12); #f4efe7 → `--rule` (4/4/5 away,
   and a pressed surface and a rule are the same warm off-white); #f5f1ea → `--paper` (the
   back-face text is "paper on ink", and `--paper` is 5/6/8 away, a tie with the others — the
   name is the reason). Three warm off-whites become none: the site has `--paper`,
   `--surface-warm` and `--rule` and nothing else.
6. **One white for text on colour:** `--on-colour: #fff`. Every `color: #fff` on a tile, level,
   deck, option or button becomes it; `background: #fff` is already `--surface`. The data
   palettes' white text (belt and kata colour classes, generated from data) stays literal
   with the palette.
7. **One shadow:** `--shadow-card` everywhere; the .10/.07/.06 variants go.
8. **Radii onto tokens:** 12px → `--radius-banner`; the three `0 N N 0` maxim corners →
   `0 var(--radius-control) var(--radius-control) 0` (quiz's 8 becomes 10); the quiz progress
   track keeps 4px, allow-listed by name — it is a 6px-tall bar and no token fits.
9. **One card: 20px padding.** The islands' value, where students spend their time;
   `.card-roomy` is deleted. Belts, kata and home cards gain 2px inside.
10. **One shell spacing scale, in tokens:** `--space-1: 4px`, `--space-2: 8px`, `--space-3: 12px`,
    `--space-4: 16px`, `--space-5: 20px`, `--space-6: 24px`, `--space-8: 32px`, `--space-10: 40px`.
    The shell uses it: app padding 20/16/40, header margin-bottom 16 (from 18; practice from
    14), card margin-bottom 16 (from 14), `.intro` margin-bottom 16 (from 14), footer
    margin-top 20, chip margin-top 8 (from 6). Page-internal spacing (tile gaps, row padding,
    section-heading margins) is **not** snapped: it is per-page rhythm, not shell drift.
11. **The streak chip is one chip.** The base rule becomes centred at .75rem with
    `margin-top: var(--space-2)`; inside a centred `<header>` nothing changes on the islands.
    Home loses its `.app--home .streak-chip` override (.8rem, −14px/20px): to keep the chip
    close under the maxim, `.maxim`'s margin-bottom on home drops from 24px to `--space-3`,
    so the chip sits 20px below it (was 10) and the tiles follow at the chip's bottom margin
    of `--space-5`. One row on the sheet.
12. **One heading pair for inner pages:** h1 1.3rem, .sub .72rem, `.intro` .85rem. The quiz
    drops from 1.35/.75/.9. **One section-heading size:** .78rem/.2em; home's h2 .8 → .78 and
    the quiz's `.modehead` .15em → .2em. Margins stay per page (decision 10).
13. **One menu-tile scale, as a shared rule in `app.css` on a selector list**
    (`.belt-btn, .kata-btn, .deck-btn`), no markup change: padding 14px 16px, font-size 1rem,
    weight 700, `:active` scale(.97). The page rules keep only colour and layout — belts'
    two-column centred grid and letter-spacing, kata's `.n`/`.t` two-line structure with `.t`
    at .75rem, decks' and levels' colour classes — and DROP the properties the shared rule
    owns, so the Astro-scoped belt rule (higher specificity) no longer overrides them. Deck
    tiles from .98rem/600 and gain a tap transform; levels from 600; belts from 16px 12px/
    .95rem/.96; kata from 16px/1.1rem/800. The most visible change in the slice; its own
    commit and its own sheet rows.
14. **404 joins the shell.** `404.astro` renders through `PageShell` with the inner heading
    pair and its two lines of body, instead of its own hard-coded copy of the shell. Its
    28px/1.7rem/.75rem/#555/#999 all normalise for free, and it stops being the one page the
    design system cannot reach. A build test asserts it ships the shell.
15. **The practice tick "✓" stays.** Content the page has always shown, and already redundant
    with `aria-pressed` rather than invisible to it.

**Spec:** `docs/superpowers/specs/2026-08-28-productionise-student-hub-design.md`

## Acceptance Criteria

- [ ] Every page renders in a 520px column; `PageShell` has no `width` or `variant` prop and
      `app.css` no `.app--*` rule; every built page's shell element, the 404 included, is
      exactly `<div class="app">`.
- [ ] No hex literal appears in a rule in `src/**/*.css` or `src/**/*.astro` except in
      `tokens.css` and in the allow-list the drift test names: the four data palettes (belt,
      kata, deck, quiz gradient), the home tiles' four gradient stops, and the quiz progress
      track's 4px radius (not a colour, listed beside them as the one non-token literal).
      Comments are stripped before scanning.
- [ ] `tests/unit/tokens.test.ts`'s required list is the specification of the whole scale:
      every colour token including the five greys and `--on-colour`, the three new tokens,
      all four radii, the shadow, the spacing scale, `--app-max`.
- [ ] `grep -rn -i "slice-9\|slice 9" src public CLAUDE.md README.md` returns nothing.
- [ ] A before/after contact sheet of all 23 routes, built from `main` and from the branch and
      screenshotted in one Chromium at 390×900 @2x, is attached to the PR; every route marked
      "changed" has one line saying what changed and which decision above made it.
- [ ] Every existing suite passes with its assertions unchanged — text, structure and
      behaviour are not what this slice touches — except the two build tests that count
      `class="belt-btn belt-colour"` and `class="kata-btn kata-colour"`, which stay true
      because no markup changes. `npm run test:deploy` passes.
- [ ] CLAUDE.md's design-system section describes the scale as shipped; its tree no longer
      lists variants slice 9 "deletes"; the migration-rules paragraph about `DEFER(slice-N)`
      no longer uses slice 9 as its example.

## Delivery Shape

**Mode**: Independent PR against `main` · **Stack**: none.

One PR, commits by theme so each is one row on the sheet and one thing to disagree with. The
site works after every commit, and no commit leaves a red test behind: the drift test's
"still to remove" list shrinks with the commits, and the bare-shell build test lands in the
commit that makes it true.

**Review gate:** the sheet, not CI. Rich looks at every "changed" route before the merge.

## Implementation

**Required skills**: `tdd` and `testing` for the drift test, the tokens list and the 404
build test (the tests are the specification of the scale); `impeccable` for the judgement
calls in decisions 4–13 — it is the design-critique skill and this is the one slice that is a
design change; `refactoring` for the CSS consolidation. `mutation-testing`: `N/A` —
stylesheets have no logic to mutate; the alternate evidence is the sheet and the drift test
proven to bite (Commit 1).

**Class**: Behavior change (what a student sees), every commit except the tooling one.

### Commit 1 — Tooling: the sheet and the drift test

- [ ] `scripts/capture-routes.mjs` — the capture half `compare-pixels.mjs`'s header promised
      would outlive it, promoted from the throwaway used in slices 7 and 8. Given two built
      `dist/` directories it serves each, screenshots every route in one Chromium at 390×900
      @2x with animations disabled, and writes `dist/__visual/index.html`: one row per route,
      before and after side by side, marked identical or changed by PNG bytes. Run by hand:
      `git worktree add ../student-hub-main main && (cd ../student-hub-main && npm ci && npm run build)`,
      then `node scripts/capture-routes.mjs ../student-hub-main/dist dist`. The README's table
      gains the row; `compare-pixels.mjs` stays for what it does.
- [ ] `tests/unit/design-drift.test.ts`: scans `src/**/*.css` and `src/**/*.astro` with
      comments stripped (`/* */`, `<!-- -->`, and `//` lines inside frontmatter). **Every hex
      literal is in `tokens.css`, or in the allow-list, or in `DRIFT_STILL_TO_REMOVE`.** The
      allow-list, per file: `belts.css` and `kata.css` (belt and kata palettes), `flashcards.css`
      d1–d7, `quiz.css` b1–b5 gradients, `index.astro` the four tile-gradient stops
      (#3a3a3a, #8B0A20, #00843D, #6B3F1D). `DRIFT_STILL_TO_REMOVE` is enumerated in the test
      today and is the checklist Commits 3–5 empty: #333, #555, #666, #777, #b07d00, #e5e0d8,
      #e9f7ef, #fdecea, #eee, #f4efe7, #f5f1ea, #fff (as `color:`), the four shadow
      `rgba(0, 0, 0, .NN)` variants (matched as well as hexes), and 404's #faf7f2/#222/#555/#999.
      A second assertion, added in Commit 5: **no `border-radius` literal in a rule** except
      the quiz track's `4px`, allow-listed by file and value.
- [ ] Prove the test bites: add `color: #abc` to a stylesheet; it fails naming the file and
      the literal; remove it.

### Commit 2 — One column

- [ ] `app.css` loses `.app--narrow`, `.app--wide` and the `var(--app-max, 520px)` fallback;
      `PageShell` loses `width`; belts (×2), kata (×2) and quiz routes stop passing it. A build
      test in `tests/build/` asserts **no built page's shell carries `app--narrow` or
      `app--wide`**; the bare-shell assertion waits for Commit 4.
- [ ] Sheet rows: belts (×14), kata (×5) — "560→520, decision 1"; quiz — "480→520, decision 1".

### Commit 3 — Colours, shadows and radii onto tokens

- [ ] `tokens.css` gains `--line`, `--good-tint`, `--bad-tint`, `--on-colour`;
      `tests/unit/tokens.test.ts`'s required list becomes the whole scale (AC 3). Every
      literal in `DRIFT_STILL_TO_REMOVE` except 404's becomes its token per decisions 3–8;
      the list shrinks to 404's four. Radii: practice 12px → `--radius-banner`; the three maxim
      corners → `--radius-control`.
- [ ] Sheet rows: kata guides — "prose #333→#222, decision 3"; home, quiz — "maxim grey,
      decision 3; shadow, decision 7"; practice — "mind grey, summary grey, borders, decision
      3/5"; flashcards — "done-sub grey, back-face text, shadow, decisions 3/5/7"; quiz —
      "run line gold, decision 4; maxim corner 8→10, decision 8".

### Commit 4 — One shell: spacing scale, variants gone, 404 in

- [ ] `tokens.css` gains the `--space-*` scale; `app.css`'s shell rules use it per decisions
      10–12; `.app--home` (both rules), `.app--practice`, `.app--quiz` (three rules) and
      `.app--flashcards` are deleted with their comments; `PageShell` loses `variant`; the four
      routes stop passing it. `index.astro` keeps its masthead sizes, loses the comment calling
      them drift, and takes decision 11's maxim margin. `.card.card-roomy` is deleted and
      `.card` is 20px; `Flashcards.tsx` and `Quiz.tsx` drop the class. h2 sizes per decision
      12. `404.astro` renders through `PageShell` (decision 14) and a build test asserts its
      shell and the shared footer; `DRIFT_STILL_TO_REMOVE` is empty and deleted.
- [ ] The bare-shell build test lands: **every built page's shell is `<div class="app">`.**
- [ ] Sheet rows: home — "padding 28→20, footer to shared, chip .8→.75 and 20px under the
      maxim, h2 .8→.78, decisions 2/10/11/12"; 404 — "on the shell, decision 14"; practice —
      "header gap 14→16, decision 10"; flashcards — "sub red, card 20, decisions 2/9";
      quiz — "heading 1.35→1.3, sub .75→.72, lede .9→.85, card 20, modehead spacing,
      decisions 9/12"; belts, kata — "card 18→20, header gap 18→16, decisions 9/10"; every
      page — "card gap 14→16, decision 10".

### Commit 5 — One menu-tile scale

- [ ] The shared rule in `app.css` on the selector list per decision 13; the four page rules
      keep colour and layout only. The radius assertion joins the drift test.
- [ ] Sheet rows: belts index — "tiles 16px 12px/.95rem/.96 → 14px 16px/1rem/.97"; kata
      index — "tiles 16px/1.1rem/800 → 14px 16px/1rem/700"; flashcards menu — ".98→1rem,
      600→700, tap transform"; quiz menu — "600→700".

### Commit 6 — Docs, and the last markers

- [ ] `grep -rn -i "slice-9\|slice 9" src public CLAUDE.md README.md` empty: the comments in
      app.css, tokens.css, PageShell, index.astro, flashcards/practice/quiz.css rewritten as
      statements of the scale; CLAUDE.md's `layouts/` entry, its design-system section, and
      the whole migration-rules paragraph that uses slice 9 as the `DEFER(slice-N)` example
      (it names slices 6 and 8 too; "a value Slice 9 will normalise" becomes a past-tense
      example or a different one).
- [ ] The spec: one sentence after the delivery table — "Slice 9 shipped in #NN; the
      migration is complete" — since the table has no status column.

### PR gate

- [ ] `npm run typecheck`, `npm run build`, `npm test`, `npm run test:browser`,
      `npm run test:deploy`, `npm audit --audit-level=high`; `git status --short` clean.
- [ ] Mutation: **N/A — stylesheets.** Evidence: the drift test proven to bite (Commit 1); the
      bare-shell and 404 build tests; the sheet with every changed route explained.
- [ ] The sheet is generated from the final tree against `main` and attached to the PR. Rich
      reviews it before merge.

## What this slice deliberately does not do

- **No page-internal spacing snapping** — tile gaps, row paddings, section-heading margins
  keep their per-page values (decision 10).
- **No palette changes** to belts, decks, kata or the quiz level gradients: content. The deck
  and gradient palettes are allow-listed, not pinned; pinning them is a separate small job.
- **No new components or markup** beyond the 404 page taking the shell it should always have
  had. Nothing accessibility-related moves; the live region and focus management the
  migration rules defer still wait.
- **No kumite reference page** — next, queued behind this.
