# Slice 7 — Strict CSP and Header Hardening: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement
> this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. This slice ships as **one
> PR** against `main`; see **Delivery Shape**.

**Branch**: `plan/slice-7-csp-hardening` (this plan) → `feat/slice-7-csp-hardening`
**Status**: Active

## Goal

Every page the site serves arrives with a strict Content Security Policy and the hardening
headers the spec lists, as real HTTP headers from Netlify; a browser test proves every built
page and all three islands work under that policy before it can merge; and the supply-chain
gaps the spec names (Dependabot, the raw-HTML ban) are closed. Nothing a student sees changes.

## Corrections to the spec, established before planning

The spec's security section was written against Astro 5, before any page had been built.
Three things are different now that the whole site is built from `src/pages/`.

**1. The CSP is delivered by hand, not by the Netlify adapter.** The spec chose
`@astrojs/netlify` with `staticHeaders: true` so Astro's per-route hashes land as headers.
The built site makes that machinery unnecessary. A full build inventory
(`npm run build`, then grep `dist/`) shows:

| Surface | Count | Where |
|---|---|---|
| Inline `<script>` | 2 distinct, 6 total | Astro's island bootstrap (a 130-byte loader and the 4,380-byte `<astro-island>` element definition), byte-identical on `/practice`, `/flashcards` and `/quiz` |
| External `<script src>` | 3 files | `/assets/store.js`, `/assets/home.js`, `/assets/legacy-hash.js` — all same-origin |
| Inline `<style>` | 1–2 per page, every page | Astro's `build.inlineStylesheets: 'auto'` default inlines anything under 4KB, and every page's CSS is |
| `style=""` attributes | 0 | already pinned by three build tests |
| `on*=""` handlers | 0 | |
| `<link rel="stylesheet">` | 0 | |
| Raw-HTML sinks in `src/` and `public/assets/` | 0 | `innerHTML`, `set:html`, `dangerouslySetInnerHTML`, `insertAdjacentHTML`, `document.write` |

So the entire policy is: `script-src 'self'` plus **two hashes**, and — once stylesheets are
external — `style-src 'self'` with no hashes at all. That is one header rule for `/*` in
`netlify.toml`, written by hand. Against that, the adapter (`@astrojs/netlify@8.2.5`) would add
nine transitive dependencies to a static site, including `@vercel/nft`, `@netlify/functions`,
`@netlify/blobs` and a second `esbuild`; it writes only per-route rules, so the 404 page served
for an unknown path would carry **no** policy; and Netlify does not document precedence
between its Frameworks API config and `netlify.toml` headers. The doctrine that keeps this site
cheap to own says: no dependency to write a JSON file we can write ourselves.

The cost is that an Astro upgrade which changes the island bootstrap changes the two hashes.
That is caught by a build test which prints the new hash to re-record — the exact pattern
`tests/build/legacy-content.sha256` already uses for `public/`. A Dependabot PR for Astro then
fails CI until someone re-records deliberately, which is the right amount of friction for a
change to what the browser is allowed to execute. Decided with Rich on 2026-09-16.

**2. Stylesheets go external.** `build.inlineStylesheets: 'never'` in `astro.config.mjs`.
Every page's CSS then arrives as `<link rel="stylesheet" href="/_astro/….css">`, which
`style-src 'self'` covers with no per-page hashes. Same CSS, same pixels; one extra request per
page, cacheable across pages. Without this, `style-src` would need a hash per page per
stylesheet, and every scoped `<style>` edit anywhere would change one. The quiz progress bar
sets its width through the CSSOM at runtime (see the note in `Quiz.tsx`), which CSP does not
govern, so no `'unsafe-hashes'` and no `'unsafe-inline'` anywhere in the policy.

**3. The raw-HTML ban is a test, not a linter.** The spec says "lint bans
`dangerouslySetInnerHTML` and `set:html`". The repo has no linter, and adopting Biome or ESLint
to enforce one rule is a dependency and a config surface for a ban a ten-line source scan
enforces just as well in the existing `npm test` gate. If a linter arrives later for other
reasons, the rule moves there and the test retires.

**Already done in slice 1, recorded here so nobody re-does it:** committed lockfile, `npm ci`
in CI, Node pinned via `.nvmrc` and `NODE_VERSION`, `npm audit --audit-level=high` as the last
CI step. What slice 7 adds on the supply-chain side is Dependabot only.

**Spec:** `docs/superpowers/specs/2026-08-28-productionise-student-hub-design.md`

## Acceptance Criteria

- [ ] Every response Netlify serves — every route, every asset, the 404 page — carries a
      `Content-Security-Policy` with `default-src 'none'`, `script-src 'self'` plus exactly the
      island bootstrap hashes, `style-src 'self'`, `img-src 'self'`, `object-src 'none'`,
      `base-uri 'none'`, `form-action 'none'`, `frame-ancestors 'none'`, and no
      `'unsafe-inline'`, `'unsafe-eval'` or `'unsafe-hashes'`.
- [ ] Every response also carries `Strict-Transport-Security`, `X-Content-Type-Options`,
      `Referrer-Policy`, `Cross-Origin-Opener-Policy`, `Permissions-Policy` and
      `X-Frame-Options` with the values in the spec's Security section.
- [ ] Under that exact policy in a real Chromium, every built page loads, the three islands
      hydrate and work — tick a practice tile, flip a flashcard, answer a quiz question — with
      **zero** `securitypolicyviolation` events and zero page errors. This runs in CI on every
      PR.
- [ ] A build test fails, naming the page and printing the hash to record, when a built page
      contains an inline script whose hash is not in the policy, any `<style>` element, any
      `style=""` attribute, any `on*=` attribute, or any cross-origin script, stylesheet or image.
- [ ] `npm test` fails if `src/` or `public/assets/` gains a raw-HTML sink.
- [ ] Dependabot opens weekly, grouped PRs for npm and GitHub Actions.
- [ ] Pixel-identical on every page to `main` before this slice, proven with
      `node scripts/compare-pixels.mjs --page <page> --ref <ref>` for at least one static page
      and one island page — the stylesheet move is the only rendering-adjacent change.
- [ ] Verified on the live site with `curl -sI` after deploy: all headers present on `/`,
      `/quiz/`, an asset, and a nonexistent path.

## Delivery Shape

**Mode**: Independent PR against `main` · **Stack**: none.

One PR. The spec's delivery table treats slice 7 as one PR, and the diff is small: two config
files, one CI workflow, one Dependabot file, three tests and a test helper. Splitting the
policy from the other headers would put the same `[[headers]]` block in two PRs for no review
benefit.

**Release risk, stated plainly:** a wrong CSP breaks all three islands for every student at
once, on a site with no error reporting. The CI deploy test is the guard — it loads the real
built pages under the real header text from `netlify.toml` in a real browser and drives the
islands. Roll-back is `git revert` of one commit; Netlify redeploys `main` in about a minute.

## What the current deploy does

`netlify.toml` already sets three headers for `/*`: `X-Frame-Options: DENY`,
`X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`. There is
no CSP of any kind, no HSTS, no COOP, no Permissions-Policy. CI runs typecheck, build, node
tests, Chromium install, browser tests, audit. There is no Dependabot configuration.

## Implementation

**Required skills**: `tdd` and `testing` for the three new tests (the tests *are* the
behaviour here — each one pins what the deploy must serve); `front-end-testing` for the
Playwright deploy test; `typescript-strict`, `functional`; `refactoring` after each GREEN;
`mutation-testing` at PR readiness records `N/A` (configuration slice) with the alternate
evidence in Step 7. `evaluate-existing-solutions` preflight for the TOML question is settled
below in Step 2: no parser dependency.

**Class**: Behavior change (what the server sends changes; what the student sees does not).

### Step 1: The policy, pinned against the built site (RED→GREEN, node)

- [ ] `tests/build/security-headers.test.ts`. Reads `netlify.toml` as text and takes the
      `for = "/*"` headers block. RED first: assert a `Content-Security-Policy` value exists
      with each directive above, and the five hardening headers with their spec values. This
      fails today.
- [ ] In the same file, walk every `dist/**/*.html` and assert, per page: every inline
      `<script>` body's SHA-256 (base64, `sha256-` prefixed — exactly what the browser
      computes) is listed in the policy's `script-src`; the policy lists **no** hash that no
      page uses (a stale hash is a stale allow); no `<style>` element; no `style="`; no
      ` on[a-z]+=`; every `<script src>`, `<link href>` and `<img src>` is root-relative.
      The failure message names the page and prints the hash it found, the way
      `public-passthrough.test.ts` prints both checksums.
- [ ] GREEN: `netlify.toml` gains the policy and the headers (below), `astro.config.mjs` gains
      `build: { inlineStylesheets: 'never' }`. Rebuild; the test passes.

The `[[headers]]` block, verbatim, so review is against the spec's text:

```toml
[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = '''
      default-src 'none';
      script-src 'self' 'sha256-QzWFZi+FLIx23tnm9SBU4aEgx4x8DsuASP07mfqol/c=' 'sha256-Ya0pUYrC7nM5Cn/056TyVuEiz6dFGrzmkWzgON0pF0U=';
      style-src 'self';
      img-src 'self';
      object-src 'none';
      base-uri 'none';
      form-action 'none';
      frame-ancestors 'none'
    '''
    Strict-Transport-Security  = "max-age=31536000; includeSubDomains"
    X-Content-Type-Options     = "nosniff"
    X-Frame-Options            = "DENY"
    Referrer-Policy            = "strict-origin-when-cross-origin"
    Cross-Origin-Opener-Policy = "same-origin"
    Permissions-Policy         = "camera=(), microphone=(), geolocation=(), interest-cohort=()"
```

The two hashes are today's, from `dist/practice/index.html` at commit `6c6d403`; the test
re-derives them, so the values above are documentation, not the source of truth. Netlify
collapses a multi-line TOML string into one header value per HTTP/1.1, and the test collapses
whitespace the same way before comparing. `X-Frame-Options` stays alongside
`frame-ancestors` for browsers that predate CSP 2; a comment says so.

**On `includeSubDomains`:** it is in the spec, and it is right for a domain that serves only
this site. If the club's domain ever hosts anything else over plain HTTP on a subdomain, this
header would break it. Confirm with Rich which hostname the site answers on before merge; if
it is a Netlify subdomain, HSTS is already preloaded for `netlify.app` and the header is
belt-and-braces.

### Step 2: Reading `netlify.toml` without a TOML parser

- [ ] `tests/support/netlify-headers.ts` (shared by Steps 1 and 3): returns
      `{ for: string, values: Record<string, string> }[]` from the `[[headers]]` tables, handling
      exactly two TOML string forms — `"basic"` on one line and `'''literal multi-line'''` —
      and nothing else. Around twenty lines; unit-tested in `tests/unit/netlify-headers.test.ts`
      against a fixture string with both forms, a header the file does not have, and two tables.

Why not a parser: Node 22 has none built in, `smol-toml` would be a fourth devDependency for
three fixed keys, and the file is ours — if someone writes a header in a third TOML string
form, the test fails loudly on a missing header rather than silently reading it wrong.

### Step 3: The deploy test — every page and every island under the enforced policy (RED→GREEN, Chromium)

- [ ] `tests/deploy/csp-violations.test.ts`, run by a new `npm run test:deploy` with its own
      `vitest.deploy.config.ts` (`include: ['tests/deploy/**/*.test.ts']`, node environment)
      so `npm test` stays Chromium-free. It needs `npm run build` first and the Chromium
      that `npx playwright install chromium` provides — the same one the browser tests use.
- [ ] The test starts a `node:http` server on an ephemeral port serving `dist/` with the
      `/*` headers from Step 2 applied to every response, `404.html` for unknown paths, and
      the correct `Content-Type` for `.html`, `.css`, `.js`, `.png`, `.pdf`. Around forty
      lines, in `tests/deploy/serve-dist.ts`.
- [ ] It launches Chromium through the `playwright` package already installed, registers
      `page.addInitScript` to collect `securitypolicyviolation` events into a window array
      before any page script runs, and collects `pageerror` and console errors.
- [ ] RED first: for every route (`dist/**/index.html` mapped to its URL, plus `/404.html`
      and one unknown path), assert the response carries the `Content-Security-Policy`
      header. This fails before Step 1's GREEN and passes after — it is the same RED seen
      from the browser's side.
- [ ] Then, for each page, assert zero violations and zero errors after load, and after
      driving the islands: on `/practice` tick a tile and see the streak chip appear in the
      header; on `/flashcards` pick a deck and flip a card; on `/quiz` start Kumite 1–6,
      answer a question, and see the progress bar move. The quiz step is the one that
      proves the CSSOM claim in correction 2.
- [ ] Also assert every page ships **no** `<meta http-equiv="content-security-policy">` —
      the policy comes from the header alone, so there is exactly one place to edit it.
- [ ] `ci.yml`: add `npm run test:deploy` after the browser tests, before the audit. Both
      need Chromium, which is already installed by then. README's "Working on this repo"
      section gains the one-line recipe.

### Step 4: The raw-HTML ban (RED→GREEN, node)

- [ ] `tests/unit/no-raw-html.test.ts`: scans `src/**/*.{astro,ts,tsx}` and
      `public/assets/*.js` for `innerHTML`, `outerHTML`, `insertAdjacentHTML`,
      `document.write`, `set:html` and `dangerouslySetInnerHTML`. RED by adding a
      `dangerouslySetInnerHTML` to a scratch component and watching it fail; remove it;
      GREEN is the clean tree. The message names the file and line.
- [ ] Delete the `esc()` helper if any copy survives anywhere; the inventory found none, so
      this is a check, not a task.

### Step 5: Dependabot

- [ ] `.github/dependabot.yml`: `npm` weekly, one group for all minor and patch updates,
      majors as individual PRs; `github-actions` weekly. Evidence is operational: the first
      run opens PRs within a week of merge; record the first PR number in the PR description
      after the fact, or note "not yet" honestly.

### Step 6: Documentation

- [ ] `CLAUDE.md`: a **Security** section. What the policy allows and why; that there is no
      way to add an inline script or style to a page and there should not be; the re-record
      procedure when Astro changes its bootstrap (the test prints the hash; put it in
      `netlify.toml`; say in the commit why the bootstrap changed); that `npm run test:deploy`
      is the pre-merge proof and needs a build. There is no `DEFER(slice-7)` token anywhere;
      the two forward references are prose — `src/styles/quiz.css` line 94 (the progress-bar
      note: "the CSP in slice 7 to refuse") and `CLAUDE.md` line 58 ("slice 7's CSP would
      reject them"). Reword both to the present tense; the facts they state stay true.
      `index.astro`'s comment about CSP forbidding inlined component scripts stays as it is.
- [ ] Spec: append a dated note under Security recording corrections 1–3, as slice 6's plan
      did for its own corrections, so the spec and the deploy agree.

### Step 7: PRE-PR gate — alternate evidence, then the PR

Mutation testing: **N/A** — the production diff is two config files and a workflow; there is
no logic to mutate. Proportionate evidence, each recorded in the PR description:

- [ ] **The hash guard bites.** Delete one hash from `netlify.toml`; `npm test` must fail
      naming the page and printing that hash; restore it.
- [ ] **The deploy test bites, twice.** (a) With the hash still deleted, `npm run test:deploy`
      must report a `securitypolicyviolation` on each island page — the islands must visibly
      fail to hydrate, which is exactly what production would do. (b) Add
      `style="color:red"` to one element in a copy of a built page served by the test; it
      must fail on the violation. Restore.
- [ ] **Pixel identity.** `compare-pixels.mjs` on `/belts/5th-kyu` and `/quiz` against
      `main`: identical, so the stylesheet move changed nothing a student sees.
- [ ] **Live headers.** After merge, `curl -sI https://<site>/`, `/quiz/`,
      `/_astro/<any>.css`, `/does-not-exist`: every one shows the CSP and the five headers.
      Open `/practice` on a phone and tick a tile. Then tick the last acceptance criterion.

## Pre-PR Quality Gate

Before the PR: implementation complete and refactoring assessed; Step 7's alternate evidence
recorded in the PR description with `Mutation: N/A — configuration slice`; `npm run typecheck`,
`npm run build`, `npm test`, `npm run test:browser`, `npm run test:deploy`,
`npm audit --audit-level=high`; `git status --short` clean. DDD glossary check: `N/A`.

## What this slice deliberately does not do

- **No `@astrojs/netlify`.** Correction 1. If a later slice needs on-demand rendering or
  Netlify Image CDN, the adapter comes in then, and the policy can move to `security.csp`
  with the hashes generated — the deploy test does not care which file the header came from.
- **No report-only rollout and no `report-to`.** A report endpoint is a server, and the
  standing invariants forbid one. The CI deploy test is the rehearsal.
- **No Trusted Types, no `require-trusted-types-for`.** Nothing in the code assigns HTML
  strings to the DOM; the test in Step 4 is what keeps it that way.
- **No SHA-pinning of GitHub Actions**, and no `ignore-scripts` in `.npmrc`. Neither is in
  the spec; both are worth a separate, small decision.
- **No defect fixes** — slice 8. **No visual normalisation** — slice 9, which inherits an
  external-stylesheet site and should find that easier, not harder.
- **No kumite reference page** — recorded separately, queued after slice 9.
