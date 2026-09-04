# CLAUDE.md — Shizenryu Student Hub

Static student hub for Shizenryu Karate ("The Natural Way of Karate").
Live site deployed to Netlify, built from source into `dist/`. Repo: github.com/Shizenryu/student-hub

## Architecture

**Astro, TypeScript, no runtime dependencies of our own.** The site is built by
Netlify from source on every push to `main`; `dist/` is never committed. Static
pages ship zero JavaScript; the three interactive pages (quiz, flashcards,
practice) become React islands as they are migrated. Practice is the first one
across; quiz and flashcards are all that is left of the original hand-written
HTML in `public/`.

`/practice` is that island. Everything on it except the tile list is a fact about
one student's own browser — what they ticked today, which of the last thirty days
they trained, whether the streak is alive — so it cannot be answered at build
time. The activities themselves are content and come from `src/data`, which took
`assets/data.js` off that page entirely. Its streak chip belongs inside the
shared `<header>`, above the island's own markup, so the island renders it
through a React portal into `#streakChip`: one root and one piece of state, since
ticking the first activity of the day changes the chip.

Belt study guides and kata reference are the first pages out: they are real
Astro routes at `/belts`, `/belts/<slug>`, `/kata` and `/kata/<slug>`,
statically generated from `src/data`. Kata prose itself is authored as
markdown in `src/content/kata/` — a content collection, not hand-written
HTML — and it must stay in step with `public/assets/data.js`'s `KATA` array
until that file retires; `astro.config.mjs`'s `astro:build:start` hook enforces
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

Migration in progress: pages not yet ported live untouched in `public/`, which
Astro copies to the build output verbatim. That directory shrinks to empty as
slices land, and this note is deleted with the last page.

Do not add runtime dependencies, third-party scripts, analytics, or CDN assets.
That constraint has not changed and is what keeps this site cheap to own.

TypeScript is pinned to `^6.0.3` — do not upgrade to 7 yet. `@astrojs/check`
(the type checker behind `npm run typecheck`) declares
`peerDependencies.typescript: "^5.0.0 || ^6.0.0"`, and TypeScript 7 breaks it outright.

```
public/            legacy pages, served verbatim, shrinking each slice
├── quiz.html  flashcards.html
├── assets/         data.js, store.js, legacy-hash.js, home.js, img/
└── docs/           printable PDFs
src/
├── pages/index.astro, 404.astro, practice.astro,
│                    belts/index.astro, belts/[slug].astro,
│                    kata/index.astro, kata/[slug].astro
│                    every migrated page, in migration order: belts, kata,
│                    home, practice. practice.astro is the only one that
│                    hydrates anything — it mounts the Practice island
├── content/kata/    kata prose as markdown, one file per kata, validated
│                    against a content collection schema at build time
├── components/      shared pieces a route composes, e.g. BeltGuide.astro,
│                    KataGuide.astro. Practice.tsx is the first React island;
│                    practice-labels.ts holds its strings as pure functions so
│                    they are testable without a browser. StreakChip.tsx,
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
│                    reaching in with :global() — see .app--home and
│                    .app--practice in app.css, both of which Slice 9 deletes
├── styles/          tokens.css (design tokens, the source of truth for colours,
│                    radii and widths) and app.css (shell/reset styles); routes
│                    and components add their own scoped <style> alongside this
├── data/           typed content — src/data/index.ts is the module pages import
                    content from; the JSON files behind it, plus integrity.ts,
                    parity.ts and kata-prose.ts (cross-reference, legacy-parity
                    and kata prose/markdown build guards)
└── domain/         pure TypeScript: no DOM, no storage, no clock of its own.
                    store.ts is the progress store and the only thing in src/
                    that touches localStorage — it takes both storage and a clock
                    as arguments, which is what makes the day-boundary arithmetic
                    testable in node. It must persist byte-identical state to
                    public/assets/store.js until that file retires in slice 6;
                    tests/unit/store-parity.test.ts holds the two together and
                    deletes itself alongside it.
scripts/            extract-legacy-data.mjs — regenerates src/data/*.json from
                    public/assets/data.js after a content edit
tests/
├── build/          build-output assertions
├── browser/        Vitest Browser Mode
└── unit/           content integrity, legacy-parity and kata-prose-parity tests,
                    plus the src/domain/store.ts suite (Node, no browser). The
                    kata-prose one keeps src/content/kata/ in step with data.js's
                    KATA array word for word; store-parity does the same job for
                    the two progress stores. Shared helpers that vitest does not
                    collect sit beside the suites: store-fixtures.ts, fake-storage.ts
docs/superpowers/   committed specs and plans — not to be confused with
                    public/docs/, the student-facing printable PDFs above
astro.config.mjs  tsconfig.json  vitest.config.ts  vitest.browser.config.ts
netlify.toml      build command and publish directory
.github/workflows/ci.yml   PR gate: typecheck, build, and both test suites
```

Pages still in `public/` load `assets/data.js` via a plain `<script src>` tag before
their inline app script, same as before the migration.

## Imagery (`public/assets/img/`)

| File | What | Used by |
|---|---|---|
| `ki.png` | The Ki (氣) logo — black ink, transparent | the home route's crest |
| `shizenryu-calligraphy.png` | Shizenryu (自然流) calligraphy — black ink, transparent | the home route's footer seal |
| `icon.png` | White Ki on an opaque club-red tile | favicon + touch icon, all pages |

Two rules the pages depend on:

- Set `width`/`height` to the image's **intrinsic** pixel size and control the displayed
  size in CSS, so the browser reserves the space and nothing shifts as the page loads.
- Path style differs by where the page lives. The legacy pages in `public/`
  keep relative paths (`assets/img/…`) — they are served from the site root,
  so relative resolves correctly there and should not be changed as part of
  a migration. Astro routes under `src/pages/` must use root-relative paths
  (`/assets/img/…`), as `src/pages/404.astro` already does — a nested route
  (e.g. `/belts/5th-kyu`) resolves a relative `assets/img/ki.png` against its
  own path, not the site root, and the crest breaks.

The ink marks sit on the `#faf7f2` paper and so need transparency — a white-background
JPEG shows as a white box. The app icon is opaque because it sits on a home screen.
Astro copies `public/` straight through without processing, so resize an image
before committing it rather than shrinking it in CSS, and add
`loading="lazy" decoding="async"` to anything below the fold.

## Migration rules

**Accessibility during a port.** Semantics that change no pixels — an `aria-pressed`
on a toggle, a `type="button"`, a role — are in scope for a migration and should be
added, because the legacy pages have almost none and a later "accessibility slice"
would have to re-read every page to find them. Anything needing new markup, focus
management or a live region is NOT: it changes what a student experiences, so it
defers alongside the defects. `/practice`'s tiles gained `aria-pressed` under this
rule; the quiz's screen switcher, which announces nothing when the view changes,
does not qualify and waits.

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

## Data schemas (`public/assets/data.js`)

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
          // cls is a colour class defined in flashcards.html (d1–d7)

GRADES  = [ {slug, key, banner, hex, white, tier, maxim, mind}, ... ]
          // one per belt, syllabus order. slug is the URL hash (e.g. "5th-kyu");
          // key matches SYLLABUS.grade; tier links to TERMS; white = banner text colour.

SYLLABUS = [ {grade, track, section, item, detail}, ... ]
          // all 159 items in syllabus order. track: "All" | "Adult" | "Junior".
          // Source of truth is the Syllabus 2026 spreadsheet — verify before editing.

PRACTICE = [ {id, name, hint}, ... ]
          // the /practice tiles, passed to the island as a prop. Timings in hints
          // come from the Syllabus 2026
          // Simplified sheet. quiz.html auto-logs 'terms'/'kumite', flashcards.html
          // auto-logs 'philosophy' on completion.

KATA    = [ {slug, name, translation, hex, white, match, quote?, sections}, ... ]
          // /kata and /kata/<slug> are real Astro routes now; public/kata.html
          // is gone. This array is still the source of truth data.js loads and
          // extract-legacy-data.mjs reads from — the prose itself is authored
          // as markdown in src/content/kata/ and must say the same thing word
          // for word; astro.config.mjs fails the build if it drifts
          // (assertKataProseParity in src/data/kata-prose.ts — same check as
          // tests/unit/kata-prose-parity.test.ts, without a build).
          // match = lowercase substrings used to auto-build the "In
          // the syllabus" list from SYLLABUS (e.g. ["rokushu","rockushu"]
          // covers a source spelling variant). sections[].b is TRUSTED HTML —
          // only <b>/<i> plus <p>/<ul>/<li> for multi-part sections, authored
          // in this repo, never user input.
```

To add content:

1. Edit `public/assets/data.js` — it is still the source the legacy pages load and the
   one place a content edit is made.
2. Run `node scripts/extract-legacy-data.mjs` to regenerate the typed JSON in `src/data/`
   from your edit.
3. Update the `public/assets/data.js` line in `tests/build/legacy-content.sha256` to the
   new file's checksum. Run `sha256sum public/assets/data.js` (or, on Windows,
   `certutil -hashfile public/assets/data.js SHA256`) and replace the hash on that line
   with what it prints, keeping the filename after it unchanged.

Step 3 matters because that checksum records the known-good content — a deliberate
content change means deliberately re-recording it, so the checksum test keeps catching
accidental drift without blocking real edits.

The same step applies to **every** file under `public/`, not just `data.js`. Most of them
are frozen legacy content, but `assets/store.js`, `assets/legacy-hash.js` and
`assets/home.js` are live code that outlives the pages around them — they are in the
manifest because they ship to the browser unbundled, so editing one means re-recording its
line too, exactly as above. The test names the file and prints both hashes when you
forget.

A change to a `KATA` entry's `sections[].b` prose is a fourth step: update the matching
kata's markdown file in `src/content/kata/` too, word for word — `data.js` and the
markdown are two authored copies of the same prose until `data.js` retires, and the
build fails the moment they disagree (`assertKataProseParity()` in
`src/data/kata-prose.ts`, run from `astro.config.mjs`'s `astro:build:start` hook;
`tests/unit/kata-prose-parity.test.ts` proves the same thing without a build).

The pages in `public/` are legacy — hand-rolled HTML with inline CSS and JS,
kept only until each one is migrated into a real Astro route, and being
migrated out one page per slice. They are not a template to copy.

To add a new page, add an Astro route under `src/pages/` (see
`src/pages/404.astro` for the current pattern), not a new file in `public/`.
Root-relative asset paths are required there — see Imagery, above.

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
- No emojis in content except the existing streak flame and the ☯ that flashcards.html
  shows on deck completion. The club mark is the Ki logo (see Imagery), not ☯.

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

**Two implementations write this key until slice 6.** `src/domain/store.ts` is the
typed one, used by the practice island; `public/assets/store.js` is the legacy one
that `quiz.html`, `flashcards.html` and `assets/home.js` still load. Both are live
at once, and a student can tick an activity on the island and finish a quiz round
on a legacy page the same day — so they must write byte-identical state.
`tests/unit/store-parity.test.ts` drives both through the same operation sequences
and compares the stored JSON as a string plus every value returned. It deletes
itself along with `store.js`.

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
