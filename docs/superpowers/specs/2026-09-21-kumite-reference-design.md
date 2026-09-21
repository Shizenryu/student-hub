# Kumite Reference — Design

**Status:** Agreed with Rich, 2026-09-21; reviewed against the code the same day.
**Plan:** `docs/superpowers/plans/2026-09-21-kumite-reference.md`.

## Why

On 2026-09-16 a student asked Rich where the kumite sequences are listed on the site. They
are not. The twelve Kihon Kumite ship as data (`src/data/kumite.json`) and are asked about in
the quiz, and the home page's quiz tile even says "plus the Kumite 1–12 sequences" — but the
only place a student can read one is its row in a belt study guide, one or two per belt,
under "Kihon Kumite", where nobody would think to look for all twelve. A student sent to
test themselves on sequences they were never shown is the gap this closes.

## What

`/kumite`: one static page listing Kumite 1 to 12 in syllabus order, grouped under the belt
each is learned at, each shown as **one attack and the responses to it**, in the site's
design system, reached from a sixth tile on the home page. Nothing else: no explanations,
no applications, no drill mode. Those would need content the repo does not have, and the
list alone is what the student asked for.

## Content

Every technique, side, belt and syllabus sentence on the page comes from `src/data`. The
page's own words are its lede, the two labels "Attack" and "Response", the side expansions,
and the banner sub-label — all listed under **Wording** below, so nothing else is coined.

- `KUMITE` — number, side, belt and steps, exactly as the quiz uses them.
- `GRADES` — the belt order and each belt's banner text and colour, so the groups look like
  the belt guides' banners and appear in the order a student meets them. Seven belts have
  a kumite: 9th, 8th, 7th, 6th, 5th, 4th and 3rd Kyu.
- The 2nd Kyu "Kihon Kumite" row — item `Kumite 1 to 12`, detail
  `Show variations (Ohyo Kumite)` — as an eighth, final section under the 2nd Kyu banner,
  rendered as the belt guide renders a row (through `expandAbbreviations`, per content
  rule 6). Selected by grade *and* item, because 1st Kyu carries an identical row; that
  repeat, and Shodan's junior-track "All 12 Kumite" row, stay where they are, in the belt
  guides.

**The notation.** The syllabus writes each kumite as `attack >>> response >> response`:
`>>>` separates the attacker's technique from the defender's response, `>>` separates the
defender's responses (confirmed by Rich; the syllabus itself carries only the arrows, and
the words are his). `kumite.json`'s `steps` list them in that order, attack first, and a
new integrity guard proves it: every kumite's steps equal the tokens of its syllabus row,
split on `>>>` then `>>` and trimmed, compared case-insensitively, and the row's grade is
the kumite's belt and the row's `(OS)`/`(SS)` is its side. If either copy of the content is
edited alone, the build fails.

Two facts the guard surfaced when written against the real content:

- Kumite 11 and 12 are capitalised in the syllabus ("Crossed hand…") and not in the data.
  The quiz has always shown the data's casing; the page does the same, and the guard
  ignores case for that reason only.
- **Kumite 10's second step carried an em dash in the data (`sen no sen — nagashi-uke`)
  where the syllabus has a hyphen.** Content rule 2 — data matches the syllabus exactly —
  decides it: the data takes the hyphen. The quiz prompt for that step changes by one
  character. This is the only content edit in the slice, and it is a correction towards the
  source, not new content.

The page therefore shows `steps[0]` as the attack and the rest as the responses — not by
parsing arrows, but because the data is in that order and the guard says the syllabus
agrees. One small function, `kumiteSequence()`, is the only place that reading is written.

**Wording** (the page's own, each with its source):

| Text | Where it comes from |
|---|---|
| "The twelve Kihon Kumite — basic partner work — in the order they are learned." | `terms.json`: Kihon Kumite = "Basic partner work" |
| "Each is one attack and the responses to it." | the notation, as confirmed |
| "Attack" / "Response" labels | "The attack that starts it" is already the quiz's hint; "response" is Rich's word for `>>` |
| "OS — opposite side", "SS — same side" | the quiz's side question: "Same side (SS) or opposite side (OS)?" |
| Banner sub-label "KIHON KUMITE" | the syllabus section name |

No "sparring", no "worked on", no description of what any technique is.

## Shape

```
KUMITE REFERENCE
Kihon Kumite 1–12

[lede] The twelve Kihon Kumite — basic partner work — in the order they are learned.
Each is one attack and the responses to it. OS — opposite side. SS — same side.

┌ RED BELT · 9TH KYU ─────── KIHON KUMITE   (the belt guide's banner, its colour)
│ Kumite 1   OS · opposite side              id="kumite-1"
│   Attack    jun-zuki
│   Response  uchi-uke  »  gyaku-zuki
┌ ORANGE BELT · 8TH KYU ───── KIHON KUMITE
│ Kumite 2   OS · opposite side
…
┌ BROWN BELT · 3RD KYU ────── KIHON KUMITE
│ Kumite 11  SS · same side
│ Kumite 12  SS · same side
┌ BROWN BELT · 2ND KYU ────── KIHON KUMITE
│ Kumite 1 to 12 — Show variations (Ohyo Kumite)
← Shizenryu home
```

- The banner is the belt guide's banner: `grade.banner` text and the belt's colour from
  `belts.css`'s `.belt-colour[data-slug]` rule (that file holds nothing else, so importing it
  leaks nothing). The banner's shape today lives in `BeltGuide.astro`'s scoped styles, so it
  is extracted into a `BeltBanner.astro` component both pages use, with the sub-label as a
  prop ("STUDY GUIDE" on a belt guide, "KIHON KUMITE" here).
- One block per kumite with `id="kumite-N"`, so any page can link to a sequence by number.
  Nothing links to the anchors in this slice; they cost nothing and the belt guides may use
  them later.
- The responses are joined by the quiz's separator, `STEP_JOIN` (`  »  `), exported from
  `quiz-questions.ts` so the two pages cannot drift; the browser collapses its double
  spaces on both.
- The home page gains a sixth Train tile, "Kumite Reference", after Kata Reference, in the
  tile style, with a gradient from the belt palette. The quiz tile's copy is accurate as it
  stands and does not change.

The page wraps in `PageShell` like every route, uses only tokens, ships no JavaScript, and
is covered by the deploy suite's CSP walk without any change to it: every suite that
enumerates built pages does so through one list.

## What it is not

- Not per-kumite pages: a kumite has no prose to fill one.
- Not linked from the quiz menu, the practice tile or the belt guides (Rich chose the home
  tile alone).
- Not a change to `kumite.json`'s shape: `steps` stays a flat list the quiz reads; the
  attack/response split is proved by the guard, not a new field.
- Not new martial content. Every technique, side, belt and syllabus sentence already exists
  in `src/data`; the one data edit is a one-character correction towards the syllabus.

## Testing

| Layer | Covers |
|---|---|
| `tests/unit/content-integrity.test.ts` | the guard: a kumite whose steps, order, belt or side differ from its syllabus row, or that has no row, fails the build naming the kumite; the real content passes |
| `tests/unit/kumite-labels.test.ts` | the side expansions, the one pure function the page adds |
| `tests/build/kumite-route.test.ts` | the built page: twelve blocks with the right ids in order, the eight banners in order with their colour classes, each attack and response text, the 2nd Kyu row, no `<script`, no `style=` |
| `tests/build/home-route.test.ts` | six Train tiles, the sixth linking to `/kumite` |
| `tests/unit/design-drift.test.ts` | the new tile's gradient stop is allow-listed with the others |
| `tests/build/belts-routes.test.ts` | unchanged and still green after the banner is extracted |
| `tests/deploy/` | already walks every built page under the policy; the new route joins automatically |

Mutation: N/A for a static page; the guard's negative cases are the meaningful tests.
