# Productionising the Shizenryu Student Hub — Design

**Date:** 2026-08-28
**Status:** Approved, ready for implementation planning

## Purpose

Take the Student Hub from six hand-written HTML files to a typed, tested, tokenised
and hardened static site — without changing what students see, and without making the
site expensive for a non-developer to own.

Three properties matter more than any individual technology choice here:

- **Content stays cheap to edit.** Ian and Rich add a kata or a term without reading TypeScript.
- **Wrong martial content cannot ship.** Content errors become build failures.
- **The site stays free of third parties.** No analytics, no CDN, no runtime dependencies.

## Constraint that changed

The original architecture forbade a build step so pages would open from `file://`.
That constraint is **dropped**. Local development is `npm run dev`; the README carries
the setup instructions. This unlocks real ES modules, a framework, and a build-time
content pipeline.

Dropping it has a cost worth stating plainly: a fresh `git clone` no longer produces
working pages on disk. `npm ci && npm run build` is now required.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Build | Astro (static) + React islands | Static pages ship zero JS; islands only where state exists |
| Deployment | Netlify builds from source | No build artefacts in git, no source/output drift |
| Content | Astro content collections, Zod-validated | Bad data fails the build instead of rendering an empty page |
| Content format | JSON data files + markdown prose, never TypeScript | Content is edited without reading a line of code |
| Kata prose | Markdown, rendered at build time | Easier to author than HTML; no HTML string reaches the browser |
| Styling | Plain CSS custom properties | Tokens without a preprocessor or a utility framework |
| Tests | Vitest node + Vitest Browser Mode | Pure logic fast; islands in a real browser |
| Port fidelity | Pixel-faithful first, normalise after | Any visual diff during the port is a bug, not a choice |

### Why Astro over Next.js

Next.js was the natural candidate and lost on a verifiable point. Its documented strict-CSP
approach generates a per-request nonce in middleware and **requires dynamic rendering**.
With `output: 'export'` there is no server, so no nonce — leaving `'unsafe-inline'` or
hand-maintained script hashes. `output: 'export'` additionally disables `headers` in
`next.config`.

Astro computes CSP hashes at build time and, via `@astrojs/netlify` with
`staticHeaders: true`, emits them as real HTTP headers on a fully static build.

### Why not a React SPA

Most of this site is reference material — belt syllabi and kata notes a student reads on
a phone, often on poor signal at the dojo. Client-rendering static text to serve three
interactive pages is the wrong trade. Islands give React exactly where state exists and
nowhere else.

## Architecture

```
src/
├── pages/
│   ├── index.astro              static
│   ├── belts/[slug].astro       static per belt — real URLs, was #hash
│   ├── kata/[slug].astro        static per kata — real URLs, was #hash
│   ├── quiz.astro               shell + <Quiz client:load />
│   ├── flashcards.astro         shell + <Flashcards client:load />
│   └── practice.astro           shell + <Practice client:load />
├── components/
│   ├── Quiz.tsx  Flashcards.tsx  Practice.tsx        React islands
│   └── Shell.astro  Card.astro  Maxim.astro  Footer.astro
├── domain/                      pure TypeScript — no DOM, no storage, no clock
│   ├── progress.ts              streak maths (`now` injected)
│   ├── quiz.ts                  question generation and scoring
│   └── store.ts                 the only localStorage toucher
├── content/
│   ├── config.ts                Zod schemas
│   ├── kata/*.md                prose + frontmatter
│   └── data/*.json              syllabus, terms, kumite, grades, maxims, decks, practice
└── styles/tokens.css  app.css
tests/unit/                      Vitest, node
tests/browser/                   Vitest Browser Mode + vitest-browser-react
```

`domain/` is pure and injectable. That separation is what makes the streak logic — the
fiddliest and currently least-tested code in the project — unit-testable without a browser
or a mocked global clock.

### URL change

`belts.html#5th-kyu` becomes `/belts/5th-kyu`; `kata.html#sanchin` becomes `/kata/sanchin`.
Statically generated, individually linkable, indexable. A small client-side redirect
preserves bookmarked hash URLs.

## Defects found in the current code

Discovered while reading the existing implementation, and — for 5 and 6 — while porting it.
Each is pinned by a characterisation test during the port, then fixed as its own RED→GREEN
commit in PR 8, so "we ported it" and "we changed it" never share a diff. Defect 3 was the
exception: it was fixed early, in #12, because it silently broke streaks for the students
who train most.

**A defect found during a port is added to this list in the same PR that pins it.**

1. **Duplicate distractors.** `quiz.html` picks wrong answers with
   `pool.filter(t => t[0] !== jp)` — excluding by Japanese term only. In forward mode the
   buttons show English glosses, so two Japanese terms sharing an English meaning render two
   identical options. `answer()` matches by `textContent`, so both are marked correct.
   An unanswerable question that scores itself as right.

2. **Round length misreported.** `renderQ` displays `QUESTION n / 10` and drives the progress
   bar from the constant `N_Q`, while `finish()` scores against `roundLen()`. Any tier
   combination under ten terms shows "/ 10" and then scores "/ 7".

3. **Streaks roll over at UTC midnight.** `day()` is `Math.floor(Date.now() / 86400000)`.
   Training at 00:30 during British Summer Time is 23:30 UTC and logs to the previous day,
   so a student appears to break a streak they did not break. This penalises the students who
   train most. Fix uses local calendar days.

4. **Small kumite ranges lose an option.** `startKumite(3)` leaves only two other kumite for
   "which kumite is this?" distractors, rendering three buttons instead of four.

Two more were found during the migration itself, after this list was written. They are
recorded here because this list is what slice 8 reads; a comment in the code and a task in a
merged plan are not a register, and both were nearly lost.

5. **The week strip is labelled a day early west of UTC.** A practice-log day number is a
   LOCAL calendar day, so multiplying it back out gives midnight UTC, which
   `toLocaleDateString` then formats in the viewer's own zone. At UTC+0/+1 it lands on the
   same date, which is why the club has never seen it. Pinned at four timezones in
   `tests/unit/practice-labels.test.ts`; the code is `weekdayLabel` in
   `src/components/practice-labels.ts`.

6. **The repeat count counts presses, not cards.** Finishing a flashcard deck reports
   "N cards needed a second look", where N is the number of times Again was pressed — so one
   card missed three times reports three cards. Pinned in
   `tests/unit/flashcards-labels.test.ts`; the code is `completionSubline` in
   `src/components/flashcards-labels.ts`.

## Testing

| Layer | Runner | Covers |
|---|---|---|
| `tests/unit/` | Vitest, node | Question generation, distractor rules, scoring bands, streak maths, miss queue, practice-log pruning, persisted-state guard |
| `tests/browser/` | Vitest Browser Mode | The three islands: answer and score, flip and queue, tick and streak. Real localStorage and events |
| Build time | Content collections + Zod | Every `GRADES.key` resolves to a `SYLLABUS.grade`; every `KATA.match` matches a syllabus row; belt slugs unique |
| Build time | CSP-violation browser test | Loads every built page, fails on any `securitypolicyviolation` event |

**Deliberate omissions.** No screenshot tests — flaky across OS on a font- and gradient-heavy
design. No coverage threshold — the mutation gate is the real check on test strength, and a
percentage invites tests written to move a number.

**Mutation gate** runs per PR, matching the project definition of a phase as one review
boundary. PRs 1 and 7 are almost entirely configuration; they record `N/A` plus configuration
and integration evidence rather than a fabricated score.

## Security

### Content Security Policy

Astro's built-in CSP emits `<meta http-equiv>` tags on a plain static build, and
`frame-ancestors` is ignored in a meta tag by spec — meta-only would silently drop
clickjacking protection. The build therefore uses `@astrojs/netlify` with
`staticHeaders: true` so the policy lands as real headers.

Astro contributes `script-src` and `style-src` with build-time hashes. `netlify.toml`
carries `default-src 'none'`, `object-src 'none'`, `base-uri 'none'`, `form-action 'none'`,
`frame-ancestors 'none'`, plus:

```toml
Strict-Transport-Security  = "max-age=31536000; includeSubDomains"
X-Content-Type-Options     = "nosniff"
Referrer-Policy            = "strict-origin-when-cross-origin"
Cross-Origin-Opener-Policy = "same-origin"
Permissions-Policy         = "camera=(), microphone=(), geolocation=(), interest-cohort=()"
```

Nothing requires `'unsafe-inline'`.

### innerHTML eliminated by construction

JSX escapes by default; kata prose is rendered to HTML at build time and never handled as a
string in the browser. The `esc()` helper is deleted rather than retained and trusted. Lint
bans `dangerouslySetInnerHTML` and `set:html` so the path cannot return.

### Supply chain

The genuine new risk introduced by adopting npm. Committed lockfile, `npm ci` everywhere,
Node pinned via `.nvmrc` and `NODE_VERSION`, `npm audit --audit-level=high` gating CI,
Dependabot weekly and grouped. Direct dependencies: Astro, `@astrojs/react`,
`@astrojs/netlify`, React, Vitest, Playwright.

### Persisted state

`store.ts` treats localStorage as untrusted input: parse, validate, discard and start clean
on anything malformed, keyed by a schema version so future changes migrate rather than crash.

Validation uses a hand-rolled type guard, not Zod. Zod is present for content collections but
runs at build time only; pulling it into an island would ship roughly 12KB to every student's
phone to validate a four-key object. The guard is around twenty lines and is unit tested.

### Standing invariants

- Zero runtime dependencies of our own.
- No third-party scripts, no analytics, no CDN.
- The progress store holds day numbers, counts and scores — never anything identifying a child.

## Delivery

A flow-lineage stack: each PR builds on the last. Astro copies `public/` verbatim, so
un-migrated legacy pages keep working there while pages move across one at a time. Every PR
deploys a working site.

| # | Slice | Leaves the site |
|---|---|---|
| 1 | Toolchain, CI, Netlify build; all six pages moved untouched into `public/`; README dev setup; CLAUDE.md doctrine rewritten | Byte-identical, now built |
| 2 | Content migration + deep-equality proof; `tokens.css`; shared shell; `/belts/[slug]` | Belts on real URLs |
| 3 | Markdown pipeline; `/kata/[slug]`; `/` | Trusted-HTML path gone |
| 4 | `practice` island; `store.ts` port; validated persistence | First island live |
| 5 | `flashcards` island | |
| 6 | `quiz` island + defect pins; `data.js` retires | No pages left in `public/` |
| 7 | Strict CSP, header hardening, supply-chain CI, CSP-violation test | Hardened |
| 8 | All six defect fixes, one RED→GREEN commit each | Behaviour deliberately changed |
| 9 | Visual normalisation: greys, spacing scale, max-widths | Every diff intentional |

CSP lands at 7 rather than earlier because the legacy inline-script pages in `public/` would
violate it, and path-scoping the policy mid-migration is machinery for no gain.

Slice 6 leaves no *pages* in `public/`, not an empty directory: `assets/store.js`,
`assets/home.js`, `assets/legacy-hash.js`, the images and the PDFs remain. The home page's
maxim and streak chip are classic scripts reading `store.js`, and replacing them with an
island would put React on the landing page — around 60KB gzipped to render one line of text,
on the page a student opens on poor signal at the dojo. Retiring those three scripts is a
separate decision nobody has needed to make yet.

### Keeping content editable

Content never becomes TypeScript. Tabular content (terms, kumite, syllabus, grades, maxims,
decks, practice) becomes JSON data files loaded through the content collection `file()`
loader; kata prose becomes markdown. Zod schemas live in `src/content/config.ts` — separate
from the content itself — so a bad edit produces a named build error rather than a type error
in a file Ian is expected to read.

This is why the schemas matter more here than in a typical project: they are the mechanism
that lets a non-developer edit martial content safely.

### PR 2 carries the most risk

Migrating 1518 lines of syllabus data is where a silent transcription error could put wrong
martial content in front of students. The mitigation is a test that loads the original
`data.js` alongside the new typed modules and asserts deep equality across every array; the
original is deleted in the same PR once the test passes. Both files coexist for that one PR
by design.

That test proves the new data matches the old. It does **not** prove the old data matches the
Syllabus 2026 spreadsheet. Verifying content against source is a separate job, explicitly out
of scope here.

### PR 9 is visible to students

Normalising three different `.app` max-widths and four ad-hoc greys means pages will look
slightly different from today. Intended — and the only slice where "productionise" becomes
something Ian and the students can see.

## Out of scope

- Verifying existing content against the Syllabus 2026 spreadsheet.
- Any new student-facing feature.
- Backend, accounts, or cross-device sync — the store stays local and anonymous.
