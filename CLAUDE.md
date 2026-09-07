# CLAUDE.md — Shizenryu Student Hub

Static student hub for Shizenryu Karate ("The Natural Way of Karate").
Live site deployed to Netlify, built from source into `dist/`. Repo: github.com/Shizenryu/student-hub

## Architecture

**Astro, TypeScript, no runtime dependencies of our own.** The site is built by
Netlify from source on every push to `main`; `dist/` is never committed. Static
pages ship zero JavaScript; the three interactive pages (quiz, flashcards,
practice) are React islands. The migration is finished: every page a student can
open is a route under `src/pages/`, and nothing in `public/` is a page any more.

`/practice` is that island. Everything on it except the tile list is a fact about
one student's own browser — what they ticked today, which of the last thirty days
they trained, whether the streak is alive — so it cannot be answered at build
time. The activities themselves are content and come from `src/data`, which took
`assets/data.js` off that page entirely. Its streak chip belongs inside the
shared `<header>`, above the island's own markup, so the island renders it
through a React portal into `#streakChip`: one root and one piece of state, since
ticking the first activity of the day changes the chip.

`/quiz` is the third island and the one that ended the migration. The
terminology, kumite sequences and maxims are content and ship from `src/data`;
which of them a round asks about, in what order, and with which wrong answers is
decided in the browser, so those rules live in `src/domain/quiz-questions.ts` —
pure, taking its random source injected the way `store.ts` takes its clock. That
module is also the only place three of the page's four known defects can be
pinned, because none of them is reachable through the UI with the content the
site ships today. `public/quiz.html` is gone, `netlify.toml` 301s `/quiz.html`
to `/quiz`, and `public/assets/data.js` retired with it — the quiz was its last
consumer, so `src/data` is now the only copy of the content.

Belt study guides and kata reference are the first pages out: they are real
Astro routes at `/belts`, `/belts/<slug>`, `/kata` and `/kata/<slug>`,
statically generated from `src/data`. Kata prose itself is authored as
markdown in `src/content/kata/` — a content collection, not hand-written
HTML — and it must stay in step with `src/data/kata.json`;
`astro.config.mjs`'s `astro:build:start` hook enforces
this on every build via `assertKataProseParity()` in `src/data/kata-prose.ts`
(the same check `tests/unit/kata-prose-parity.test.ts` runs, without a build).
`public/belts.html` and `public/kata.html` are both gone;
`netlify.toml` 301s `/belts.html` to `/belts` and `/kata.html` to `/kata` for
old bookmarks, and a shared script (`public/assets/legacy-hash.js`) upgrades a
belt or kata fragment (e.g. `/belts.html#5th-kyu` → `/belts#5th-kyu` →
`/belts/5th-kyu`) on either page, since the redirect alone cannot see the
fragment — browsers never send it to the server. The script is generic across
any list page: each page marks one element with the slugs it considers valid
and the route prefix to send them to (`data-legacy-slugs`,
`data-legacy-prefix`), so a future migrated page needs no script change, only
those two attributes.

The home page is a route too, at `/`. Everything on it is static except two
things that cannot be baked in at build time: the maxim of the day, which
would otherwise freeze until the next deploy, and the streak chip, which
lives in the visitor's own `localStorage`. `public/assets/home.js` fills both
in — an external script rather than an Astro component script, because Astro
inlines those and slice 7's CSP would reject them, the same reason
`legacy-hash.js` is external. It reads the maxims from a data attribute the
route writes, so the content stays in `src/data` rather than being copied
into a script, and it picks the day's maxim with `Store.today()` rather than
its own `Date.now()` arithmetic — that is what keeps the maxim and the streak
chip agreeing on when a day begins. `public/index.html` is gone;
`netlify.toml` 301s `/index.html` to `/`, forced, because Astro emits a real
`dist/index.html` that would otherwise answer first.

Pages no longer open from `file://` — run `npm run dev`. See README.md.

Do not add runtime dependencies, third-party scripts, analytics, or CDN assets.
That constraint has not changed and is what keeps this site cheap to own.

TypeScript is pinned to `^6.0.3` — do not upgrade to 7 yet. `@astrojs/check`
(the type checker behind `npm run typecheck`) declares
`peerDependencies.typescript: "^5.0.0 || ^6.0.0"`, and TypeScript 7 breaks it outright.

```
public/            no pages left — only what a built page loads at runtime
├── assets/         store.js, legacy-hash.js, home.js, img/
└── docs/           printable PDFs
src/
├── pages/index.astro, 404.astro, practice.astro, flashcards.astro,
│                    quiz.astro, belts/index.astro, belts/[slug].astro,
│                    kata/index.astro, kata/[slug].astro
│                    every page the site has, in migration order: belts, kata,
│                    home, practice, flashcards, quiz. The last three hydrate
│                    an island; the rest ship no JavaScript at all
├── content/kata/    kata prose as markdown, one file per kata, validated
│                    against a content collection schema at build time
├── components/      shared pieces a route composes, e.g. BeltGuide.astro,
│                    KataGuide.astro. Practice.tsx, Flashcards.tsx and Quiz.tsx
│                    are the three React islands; practice-labels.ts,
│                    flashcards-labels.ts and quiz-labels.ts hold their strings
│                    as pure functions so the wording is testable without a
│                    browser — which is where DEFECT 2 is pinned. StreakChip.tsx,
│                    StreakChipSlot.astro and streak-chip-id.ts are the chip's
│                    three parts — the element, the portal into it, and the id
│                    they share. use-browser-store.ts is the ONLY thing that
│                    binds a store to the browser
├── layouts/         PageShell.astro — the shared page shell every route wraps
│                    in. Its header renders the h1/.sub pair from props and THEN
│                    the `header` slot, so a page appends to the header rather
│                    than replacing it (practice keeps the pair and adds a streak
│                    chip; home passes no props and supplies only the slot).
│                    Spacing that predates the shared scale is an enumerated
│                    `variant` applied as a modifier class, never a route
│                    reaching in with :global() — see .app--home, .app--practice
│                    and .app--quiz in app.css, all of which Slice 9 deletes
├── styles/          tokens.css (design tokens, the source of truth for colours,
│                    radii and widths) and app.css (shell/reset styles); routes
│                    and components add their own scoped <style> alongside this
├── data/           typed content, and since slice 6 the ONLY copy of it —
                    src/data/index.ts is the module pages import content from,
                    the JSON files behind it, plus integrity.ts and kata-prose.ts
                    (cross-reference and prose/markdown build guards). parity.ts
                    retired with public/assets/data.js: there is nothing left to
                    prove the JSON against
└── domain/         pure TypeScript: no DOM, no storage, no clock of its own.
                    flashcards-queue.ts holds the deck ordering — shuffle, then
                    stably sort by miss count — behind an injected random source,
                    which is what makes an invisible rule assertable.
                    store.ts is the progress store and the only thing in src/
                    that touches localStorage — it takes both storage and a clock
                    as arguments, which is what makes the day-boundary arithmetic
                    testable in node. public/assets/store.js must still be able
                    to READ what it writes, because the home page's chip is drawn
                    through that file; tests/unit/store-parity.test.ts holds that
                    half together. quiz-questions.ts builds a round of questions
                    from the same injected-random seam, and carries the pins for
                    DEFECTS 1 and 4. shuffle.ts is the Fisher-Yates both the deck
                    and the quiz deal from — one algorithm, because two would
                    drift silently.
scripts/            compare-pixels.mjs — proves a migrated route renders
                    identically to the page it replaced, run by hand against a
                    git ref (see README)
tests/
├── build/          build-output assertions
├── browser/        Vitest Browser Mode
└── unit/           content integrity and kata-prose-parity tests, plus the
                    src/domain suites (Node, no browser). The kata-prose one
                    keeps src/content/kata/ in step with kata.json word for word;
                    store-parity proves the home page still reads what the
                    islands write. Shared helpers that vitest does not collect
                    sit beside the suites: store-fixtures.ts, fake-storage.ts,
                    random-sources.ts
docs/superpowers/   committed specs and plans — not to be confused with
                    public/docs/, the student-facing printable PDFs above
astro.config.mjs  tsconfig.json  vitest.config.ts  vitest.browser.config.ts
netlify.toml      build command and publish directory
.github/workflows/ci.yml   PR gate: typecheck, build, and both test suites
```

## Imagery (`public/assets/img/`)

| File | What | Used by |
|---|---|---|
| `ki.png` | The Ki (氣) logo — black ink, transparent | the home route's crest |
| `shizenryu-calligraphy.png` | Shizenryu (自然流) calligraphy — black ink, transparent | the home route's footer seal |
| `icon.png` | White Ki on an opaque club-red tile | favicon + touch icon, all pages |

Two rules the pages depend on:

- Set `width`/`height` to the image's **intrinsic** pixel size and control the displayed
  size in CSS, so the browser reserves the space and nothing shifts as the page loads.
- Paths are root-relative (`/assets/img/…`), everywhere. Every page is a route
  under `src/pages/` now, and a nested route
  (e.g. `/belts/5th-kyu`) resolves a relative `assets/img/ki.png` against its
  own path, not the site root, and the crest breaks.

The ink marks sit on the `#faf7f2` paper and so need transparency — a white-background
JPEG shows as a white box. The app icon is opaque because it sits on a home screen.
Astro copies `public/` straight through without processing, so resize an image
before committing it rather than shrinking it in CSS, and add
`loading="lazy" decoding="async"` to anything below the fold.

## Migration rules

**Deferrals are written `DEFER(slice-N):`.** Work put off to a named later slice — a
value Slice 9 will normalise, a defect Slice 8 will fix, a file Slice 6 retires —
carries that literal token in its comment. It is the difference between slice 9
starting with `grep -rn "DEFER(slice-9)"` and reading six stylesheets hoping the
phrasing was consistent. It was not: "Slice 9" and "slice 9" both appear today.

**Accessibility during a port.** Semantics that change no pixels — an `aria-pressed`
on a toggle, a `type="button"`, a role — are in scope for a migration and should be
added, because the legacy pages have almost none and a later "accessibility slice"
would have to re-read every page to find them. Anything needing new markup, focus
management or a live region is NOT: it changes what a student experiences, so it
defers alongside the defects. `/practice`'s tiles gained `aria-pressed` under this
rule.

**With one exception, because the rule above got it wrong once.** A markup change is
in scope when the current markup makes the page unusable by keyboard or screen
reader, and pixel-identity can be proven. `/flashcards`' card was a `<div onclick>`
— flipping it is the only way to see an answer, so the page could not be used
without a mouse at all. That is not a semantic nicety, and "defer it" was the wrong
answer. Such a change must be named in the slice plan before implementation.

**And it obliges something.** A control that gains a role gains an accessible name,
and that name has to be checked: making the card a button made its name the
question AND the answer concatenated, so a screen reader read out the answer on
focus — an accessibility regression introduced by an accessibility fix. Where a
control's accessible name changes with its state, tests address it by element
rather than by role, and say why.

The quiz's screen switcher, which announces nothing when the view changes, needs a
live region and focus management, so it still waits.

## Content rules — read before writing ANY martial content

1. **Never invent martial content.** Every technique, sequence, translation, maxim and
   historical claim must come from the official *Syllabus 2026* spreadsheet or the papers
   of Ian Smith (Zen & Karate, MAXIMS, Tui Shou, The 6 Human Needs, Grades and Titles,
   Retreat Notes). If a fact isn't in the sources, ask Rich — don't fill the gap.
2. **Exactness matters.** Kumite steps, OS/SS markings, Japanese spellings and kata names
   must match the syllabus exactly (e.g. `sekui-uke`, `Naifuanchin`, `tobikomi-zuki`).
3. **Source documents stay out of the repo.** Ian Smith's papers and the syllabus are
   copyright and partly personal; do not commit them. The generated PDFs in `public/docs/`
   are the publishable derivatives.
4. **Audience includes children.** Everything public must be junior-appropriate.
   The Retreat Notes contain personal/lineage-dispute material — philosophical content
   only; anything naming living third parties critically needs Ian's sign-off first.
5. **Tone:** warm, disciplined, plain-spoken. No mysticism-for-effect. The club motto is
   `Structure > Discipline > Measure / Accountability = Growth`.
6. **Abbreviations:** `JJ` in the syllabus means **Jiu Jitsu**. Data keeps the syllabus'
   own wording ("JJ"); display layers expand it — `expandAbbreviations` in
   `src/data/display.ts` (formerly `belts.html`'s own `expand()` helper, before that
   page migrated) renders "Jiu Jitsu (JJ)". A new page showing syllabus text should call
   it, same as `/belts/<slug>` does — with one deliberate exception: `/kata/<slug>`
   does NOT expand JJ, matching `public/kata.html`, the page it replaced, which never
   called `expand()` either. That is a known deferral, not a bug — a later normalisation
   slice may decide belts and kata should agree — so do not "fix" kata's syllabus rows to
   expand JJ without raising that decision first.

## Data schemas (`src/data/*.json`)

```js
TERMS   = { 1:[[japanese, english], ...], 2:[...], 3:[...], 4:[...] }
          // tiers: 1 Beginner (9th–8th kyu) · 2 Intermediate (7th–6th)
          //        3 Advanced (5th–4th)     · 4 Brown & Black (3rd kyu–Dan)
          // Quiz levels are cumulative: level N includes tiers 1..N.

KUMITE  = [ {n:1, side:"OS"|"SS", belt:"9th Kyu", steps:["jun-zuki", ...]}, ... ]
          // steps in order: attack first, then responses. Source: Syllabus 2026.

MAXIMS  = [ "string", ... ]   // shown randomly after quiz rounds; the home route
                              // shows MAXIMS[Store.today() % length] as "maxim of
                              // the day", filled in by public/assets/home.js

DECKS   = [ {id, name, cls, cards:[[front, back], ...]}, ... ]
          // cls is a colour class defined in src/styles/flashcards.css (d1–d7);
          // d7 is not a deck, it is the "Everything" button

GRADES  = [ {slug, key, banner, hex, white, tier, maxim, mind}, ... ]
          // one per belt, syllabus order. slug is the URL hash (e.g. "5th-kyu");
          // key matches SYLLABUS.grade; tier links to TERMS; white = banner text colour.

SYLLABUS = [ {grade, track, section, item, detail}, ... ]
          // all 159 items in syllabus order. track: "All" | "Adult" | "Junior".
          // Source of truth is the Syllabus 2026 spreadsheet — verify before editing.

PRACTICE = [ {id, name, hint}, ... ]
          // the /practice tiles, passed to the island as a prop. Timings in hints
          // come from the Syllabus 2026
          // Simplified sheet. The quiz island auto-logs 'terms'/'kumite' on
          // finishing a round; flashcards auto-logs 'philosophy' on deck completion.

KATA    = [ {slug, name, translation, hex, white, match, quote?, sections}, ... ]
          // /kata and /kata/<slug> are real Astro routes; public/kata.html is
          // gone. kata.json is the source of truth for everything EXCEPT the
          // prose, which is authored as markdown in src/content/kata/ and must
          // say the same thing word for word; astro.config.mjs fails the build
          // if the two drift
          // (assertKataProseParity in src/data/kata-prose.ts — same check as
          // tests/unit/kata-prose-parity.test.ts, without a build).
          // match = lowercase substrings used to auto-build the "In
          // the syllabus" list from SYLLABUS (e.g. ["rokushu","rockushu"]
          // covers a source spelling variant). sections[].b is TRUSTED HTML —
          // only <b>/<i> plus <p>/<ul>/<li> for multi-part sections, authored
          // in this repo, never user input.
```

To add content, edit the JSON file in `src/data/` directly. Since slice 6 that is
the only copy: `public/assets/data.js` and the extraction script that regenerated
the JSON from it both retired with the quiz page, which was data.js's last
consumer. `npm run build` runs `assertContentIntegrity()` over the result, so a
belt pointing at a missing tier or a kata whose `match` finds nothing fails the
build rather than shipping a blank section.

A change to a kata's `sections[].b` prose is a second step: update the matching
kata's markdown file in `src/content/kata/` too, word for word. Those two are
authored copies of the same prose, and the build fails the moment they disagree
(`assertKataProseParity()` in `src/data/kata-prose.ts`, run from
`astro.config.mjs`'s `astro:build:start` hook; `tests/unit/kata-prose-parity.test.ts`
proves the same thing without a build).

Editing anything under `public/` is different, and needs one extra step. Those files
ship to the browser unbundled — `assets/store.js`, `assets/legacy-hash.js` and
`assets/home.js` are live code, and the imagery and PDFs are content — so a checksum
manifest records the known-good version of each. Update that file's line in
`tests/build/legacy-content.sha256` with what `sha256sum <path>` prints (on Windows,
`certutil -hashfile <path> SHA256`), keeping the filename after it unchanged. A
deliberate change means deliberately re-recording it, which is what lets the check
catch accidental drift without blocking real edits. The test names the file and
prints both hashes when you forget.

To add a new page, add an Astro route under `src/pages/`. Every page is one now —
`src/pages/flashcards.astro` is the pattern for an island, `src/pages/404.astro`
for a static route. Nothing new belongs in `public/`, which holds no pages at all.

## Design system

`src/styles/tokens.css` is the single source of truth for these values now — read it
before hand-copying a hex code or width into a new page.

- Colours: red `#C8102E`, dark `#161616`, paper bg `#faf7f2`, gold `#9A7D00`,
  good `#1e8a4c`, bad `#c0392b`
- Belt colours: red `#C8102E`, orange `#ED8B00`, yellow `#E3BC00`/`#FFD100`,
  green `#00843D`, blue `#0072CE`, purple `#702F8A`, brown `#8B5A2B`, black `#1A1A1A`
- System font stack, mobile-first, content max-width 480–560px (drifts by page —
  480px on quiz, 520px on index, 560px on belts and kata; a later slice normalises
  this), cards with 14px radius and soft shadows. Buttons are big and thumb-friendly.
- No emojis in content except the existing streak flame and the ☯ the flashcards
  island shows on deck completion. The club mark is the Ki logo (see Imagery), not ☯.

## Persistence

Everything a student does is kept in **their own browser** and nowhere else. There
is no account, no server and no analytics. The store holds day numbers, counts and
scores — never anything that identifies a child.

One `localStorage` key, `shizenryu-progress-v1`:

```js
{ streak: {last, count, best},   // last = LOCAL calendar day number
  best:   {mode: score},         // quiz best scores, keyed by mode
  miss:   {cardHash: n},         // flashcards answered "Again", shown first next time
  plog:   {dayNumber: [id]} }    // daily practice log, pruned to 60 days
```

Every key is optional: a student who has only ever done a quiz has `streak` and
`best` and no `plog`.

**One writer, one reader.** `src/domain/store.ts` is the typed store, and since
slice 6 it is the only thing that WRITES this key — all three islands go through
it. `public/assets/store.js` survives as a reader: the home page is deliberately
not an island (React on the landing page is roughly 60KB gzipped to render one
line of text, on the page a student opens on poor signal at the dojo), so
`assets/home.js` still calls `Store.today()` and `Store.streakInfo()` through it
for the maxim of the day and the streak chip. Those two calls are the whole
surviving contract, and `tests/unit/store-parity.test.ts` proves it: state written
by the island, read by both, same answers. Do not "finish the job" by islanding
the home page.

Where `store.ts` looks odd because it was matching `store.js`'s writes, that is
now unobservable rather than required — the code says which parts those are. A
change there is safe in a way it was not before slice 6, but it is still a change
to state a reader has to understand.

Three things about `store.ts` that look odd and are deliberate:

- **The day number is a LOCAL calendar day**, composed through `Date.UTC` from the
  local Y/M/D rather than dividing a timestamp. Dividing gives a UTC day, which is
  the defect #12 removed: during British Summer Time a student training at 00:30
  local is at 23:30 UTC the previous day, so the session lands on a day that has
  already finished and a kept streak looks broken.
- **Storage and the clock are injected**, not reached for, which is what makes the
  day arithmetic testable in node. `src/domain/store.ts` deliberately exports no
  browser-bound factory: `useBrowserStore()` in `src/components/` is the only
  thing that constructs one, and being a hook it cannot run during render. That
  matters because Astro renders a `client:load` island in Node at build time,
  where there is no `localStorage`, so reading the store while rendering gives one
  answer on the server and another in the browser — a mismatch React 19 recovers
  from silently. Nothing throws and no test notices.
- **What comes back out is untrusted.** A hand-rolled ~20-line guard discards
  anything malformed and starts clean, rather than letting a bad value reach the
  page. Not Zod: Zod runs at build time for content collections, and pulling it
  into an island would ship roughly 12KB to a phone to check a four-key object.
  Schema version 1 is deliberately **unversioned** — adding a version field would
  make the two implementations' writes differ, so the key name carries the
  version and a version 2 changes the key and migrates.
