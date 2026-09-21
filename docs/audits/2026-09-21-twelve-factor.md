# Twelve-Factor Audit — Shizenryu Student Hub

**Date:** 2026-09-21 · **Commit audited:** `7f87302` (main) · **Method:** read the repo, not the
running site; every claim below cites the file it came from.

## Verdict

**Nothing to fix for compliance's sake.** Five of the twelve factors do not apply to this site
at all, and saying so is most of the audit's value: twelve-factor is a methodology for
long-lived server processes, and this site is static files on a CDN with no server, no
database, no session store and no runtime configuration. A checklist applied literally would
demand a health endpoint, a SIGTERM handler and a structured logger for a program that never
runs anywhere but a student's browser.

Of the seven factors that do apply, six pass. The findings are concentrated in **dev/prod
parity** — specifically six redirect rules that nothing tests — and in **logs**, where the
absence of any production signal is a deliberate trade worth naming out loud rather than
fixing.

## Scope: what is actually deployed

| | |
|---|---|
| Deployed artefact | Static HTML, CSS, JS and images in `dist/`, served by Netlify's CDN |
| Server processes | None |
| Backing services | None (`netlify.toml`, no adapter; persistence is one `localStorage` key) |
| Runtime configuration | None — no `process.env` or `import.meta.env` read anywhere in `src/`, `scripts/`, `public/` or `astro.config.mjs` |
| Build configuration | One value: `NODE_VERSION` in `netlify.toml` |

That table is why the audit reads as it does. The factors below are marked **applies**,
**N/A** (structurally impossible to violate), or **tooling** (applies to the dev and test
scripts, not to anything a student loads).

## Factor by factor

| # | Factor | Verdict | Evidence |
|---|---|---|---|
| I | Codebase | **Pass** | One repo, one deployable. Netlify builds `main` on push; PRs get deploy previews. No shared-library extraction needed. |
| II | Dependencies | **Pass**, one tooling note | All four runtime deps declared in `package.json` with `package-lock.json` committed; `npm ci` in CI and on Netlify. Chromium is an explicit, documented install (`npx playwright install chromium`, README and `ci.yml`). See finding 5. |
| III | Config | **Pass** | There is no config surface to get wrong: nothing reads the environment, no `.env` files exist, nothing to validate at startup because there is no startup. See finding 2 on the one value that is declared four ways. |
| IV | Backing services | **N/A** | None exist. The store is the visitor's own browser, not an attached resource — `src/domain/store.ts` takes storage and a clock as arguments and treats what comes back as untrusted input. |
| V | Build, release, run | **Pass**, with a nuance | `npm run build` is the only build; `dist/` is gitignored; `astro.config.mjs` has no environment branching, so every context produces the same output. Note the model: Netlify **rebuilds** per context rather than promoting one artefact, so "same artefact everywhere" holds because the build is deterministic and config-free, not because the bytes are carried forward. |
| VI | Stateless processes | **N/A** | No processes. Client state is one `localStorage` key, per-browser by design and documented as such. |
| VII | Port binding | **N/A** | No service to bind. Worth noting the test server does it correctly anyway: `tests/deploy/serve-dist.ts` listens on `127.0.0.1:0` and reports its port rather than assuming one. |
| VIII | Concurrency | **N/A** | Scaling is the CDN's. There is no work to divide into process types. |
| IX | Disposability | **N/A** for the site; **tooling** finding | Nothing to shut down in production. See finding 4 for `scripts/capture-routes.mjs`. |
| X | Dev/prod parity | **Pass with findings** | Strong mechanism, two gaps. See below. |
| XI | Logs | **Accepted risk** | No log stream exists, deliberately. See finding 3. |
| XII | Admin processes | **Pass** | `scripts/compare-pixels.mjs` and `scripts/capture-routes.mjs` live in the repo, run on the same Node and dependencies, and are documented in README's command table. The content guards (`assertContentIntegrity`, `assertKataProseParity`) run inside the build rather than as a separate step, which is right when the "data" is files in the repo. |

### Factor X in detail

The parity mechanism is better than most projects have. `npm run test:deploy` serves the real
`dist/` with the headers **parsed from `netlify.toml` itself** (`tests/support/netlify-headers.ts`)
and walks every page plus all three islands in real Chromium, failing on any CSP violation.
`astro preview` could not do this: it does not read `netlify.toml`, so it serves no headers and
the browser has nothing to violate. `serve-dist.ts` also names its own two assumptions in
comments rather than hiding them.

The two gaps: the dev server (`npm run dev`) serves no security headers, so the CSP is only
ever exercised by `test:deploy` and CI; and the stand-in server deliberately does not implement
redirects, which leads to finding 1.

## Findings, ranked

### 1. Six redirect rules, zero automated coverage — Factor X

**Status: fixed** in the PR that added this report (`bb8154c`, `cb1ecf9`).

`netlify.toml` declares six `[[redirects]]`, one of them `force = true` with a comment
explaining a subtlety (`/index.html` would otherwise be served by the real file Astro emits).
Nothing asserts any of them. Every match for "redirect" or "301" under `tests/` is prose in a
comment; `tests/support/netlify-headers.ts` parses `[[headers]]` only and
`tests/unit/netlify-headers.test.ts` has an explicit case proving it *ignores* redirect tables.

**Failure this allows:** a typo in a `from` or a dropped `force` ships green, and every student
with an old `/quiz.html` bookmark gets a 404 — the exact breakage the rules exist to prevent.
The migration's whole promise to old bookmarks rests on untested config.

**Fixed by:** the reader (renamed `tests/support/netlify-config.ts`, since it now reads three
kinds of table) returns `[[redirects]]`; `tests/build/netlify-redirects.test.ts` pins where
each retired URL goes, that only `/index.html` is forced, and — derived from the build rather
than restated — that every rule points at a page the build produces;
`tests/deploy/redirects.test.ts` follows them through the stand-in server, which now applies
both the declared rules and Netlify's pretty URLs, closing the second of the two limits its
header comment listed. Proven to bite: a typo'd `from`, a dropped `force`, and a `to` naming a
route that does not exist each fail.

**Noted while fixing, not changed:** a retired URL takes two hops today, `/quiz.html` → `/quiz`
→ `/quiz/`, because the rules target the un-slashed form. Writing `to = "/quiz/"` would make it
one. Harmless either way, and a change to deploy config is not the audit's to make.

### 2. The Node version is declared four ways, and nothing checks they agree — Factors II, X

**Status: fixed** in the PR that added this report.

`.nvmrc` says `22`; `netlify.toml` says `NODE_VERSION = "22"`; `package.json` says
`engines.node: ">=22.12.0"`; `devDependencies` pins `@types/node: "^22"`. CI reads `.nvmrc`,
Netlify reads its own value, and neither knows about the other two.

**Failure this allows:** someone bumps `.nvmrc` to 24 and CI goes green on Node 24 while every
deploy still builds on Node 22 — the classic parity break, invisible until something behaves
differently in production.

**Fixed by:** `tests/unit/node-version.test.ts` compares the major in all four declarations —
`.nvmrc`, `netlify.toml`'s `NODE_VERSION`, `engines.node` and `@types/node` — naming which pair
disagrees when one does. Only the major is compared, because `.nvmrc` naming a bare major is
deliberate: it takes security patches without a commit. Proven to bite: bumping `.nvmrc` to 24
fails three of the four assertions.

### 3. Nothing reports that the site is broken — Factor XI, accepted risk

There is no application log stream, no error reporting and no analytics. That is deliberate and
documented as a standing invariant ("no third-party scripts, no analytics, no CDN"), and it is
the right call for a club site holding children's practice streaks.

**Name the consequence honestly:** if an island throws on a phone, if a CSP change blocks a
script, or if a deploy half-fails, **nobody finds out until a student mentions it in person** —
which is precisely how the missing kumite page surfaced. Today's compensation is entirely
preventive: the CI gate, the deploy-preview check, and one manual `curl` of the live headers
after a `netlify.toml` change (CLAUDE.md, Security).

**Cheapest mitigation that respects the invariant** (no client script, no vendor, no personal
data): a CI job on `deployment_status` that curls the deploy-preview URL Netlify already posts
and asserts the seven headers and a 200 on a few routes. That converts the one manual check
into an automated one and catches a broken deploy before anyone opens the site. Netlify's own
deploy and access logs are server-side and already exist if a question ever needs answering.

*This is recorded as a risk accepted with eyes open, not a defect.*

### 4. `capture-routes.mjs` leaks its servers and browser on failure — Factor IX, tooling

`scripts/capture-routes.mjs` closes the browser and both HTTP servers only on the happy path
(lines 176–178); there is no `try`/`finally`. If a capture throws midway the process keeps two
listening servers and a Chromium alive, so it hangs rather than exits. `tests/deploy/` does this
correctly by comparison — `afterAll` closes both with optional chaining, so a failed setup still
tears down.

**Fix:** wrap the capture loop in `try`/`finally`. Small, and it stops a failed sheet run
needing a manual kill.

### 5. `compare-pixels.mjs` only runs on Windows — Factor II, tooling

The script shells out to `netstat` and `taskkill` (lines 317–322) to clear a stuck preview
server. Both are Windows-only; on macOS or Linux that path throws. It also shells to `git`,
which is fine and expected.

**Impact today:** none — it is a by-hand tool and Rich works on Windows. It matters the day
anyone else runs it or it is wanted in CI.

**Fix, if ever:** name the constraint in the script's header comment (it documents everything
else it learned the hard way), or branch on `process.platform`.

## Checked and clean

Stated explicitly so a future reader knows these were examined, not skipped: no hardcoded
hostnames or URLs anywhere in `src/` or `public/`; no `.env` file committed or expected; no
environment-name branching (`NODE_ENV`) in the build; `dist/`, `node_modules/` and
`.astro/` gitignored; lockfile committed and `npm ci` used everywhere; Dependabot weekly and
grouped, with majors separated; `npm audit --audit-level=high` gating CI; no in-memory or
filesystem state between requests, because there are no requests; admin scripts in-repo on the
same dependencies; the CSP's build-time half generated rather than hand-copied, so an Astro
upgrade cannot leave a stale hash.

## What is left

Findings 1 and 2 were fixed in the PR that added this report. Findings 4 and 5 are small and
touch only tooling. Finding 3 is a standing decision rather than a task: it stays open by
choice, and the cheapest thing that would change it is the deploy-preview curl described above.
