# CLAUDE.md — Shizenryu Student Hub

Static student hub for Shizenryu Karate ("The Natural Way of Karate").
Live site deployed to Netlify from `site/`. Repo: github.com/Shizenryu/student-hub

## Architecture

**No build step. No framework. No dependencies.** Plain HTML/CSS/JS, one self-contained
file per page. This is deliberate — the maintainer is a karate instructor, not a developer,
and every page must also work opened directly from disk (file://). Do not introduce
bundlers, npm, frameworks, or CDN dependencies without being explicitly asked.

```
site/
├── index.html        Landing page: maxim of the day, links to everything
├── quiz.html         Dojo Quiz — terminology by belt level + Kumite 1–12 sequences
├── flashcards.html   Philosophy flashcards — flip cards, Again/Got-it queue
├── belts.html        Belt study guides — renders any belt from GRADES + SYLLABUS data;
│                     deep-linkable via hash, e.g. belts.html#5th-kyu
├── assets/
│   └── data.js       ALL content data (see schemas below). Content changes happen HERE.
└── docs/             Printable PDFs (generated outside this repo, committed as binaries)
netlify.toml          Publish config (publish = "site")
```

Pages load `assets/data.js` via a plain `<script src>` tag before their inline app script
(no fetch/JSON — that would break file:// usage).

## Content rules — read before writing ANY martial content

1. **Never invent martial content.** Every technique, sequence, translation, maxim and
   historical claim must come from the official *Syllabus 2026* spreadsheet or the papers
   of Ian Smith (Zen & Karate, MAXIMS, Tui Shou, The 6 Human Needs, Grades and Titles,
   Retreat Notes). If a fact isn't in the sources, ask Rich — don't fill the gap.
2. **Exactness matters.** Kumite steps, OS/SS markings, Japanese spellings and kata names
   must match the syllabus exactly (e.g. `sekui-uke`, `Naifuanchin`, `tobikomi-zuki`).
3. **Source documents stay out of the repo.** Ian Smith's papers and the syllabus are
   copyright and partly personal; do not commit them. The generated PDFs in `site/docs/`
   are the publishable derivatives.
4. **Audience includes children.** Everything public must be junior-appropriate.
   The Retreat Notes contain personal/lineage-dispute material — philosophical content
   only; anything naming living third parties critically needs Ian's sign-off first.
5. **Tone:** warm, disciplined, plain-spoken. No mysticism-for-effect. The club motto is
   `Structure > Discipline > Measure / Accountability = Growth`.

## Data schemas (`site/assets/data.js`)

```js
TERMS   = { 1:[[japanese, english], ...], 2:[...], 3:[...], 4:[...] }
          // tiers: 1 Beginner (9th–8th kyu) · 2 Intermediate (7th–6th)
          //        3 Advanced (5th–4th)     · 4 Brown & Black (3rd kyu–Dan)
          // Quiz levels are cumulative: level N includes tiers 1..N.

KUMITE  = [ {n:1, side:"OS"|"SS", belt:"9th Kyu", steps:["jun-zuki", ...]}, ... ]
          // steps in order: attack first, then responses. Source: Syllabus 2026.

MAXIMS  = [ "string", ... ]   // shown randomly after quiz rounds; index.html shows
                              // MAXIMS[dayNumber % length] as "maxim of the day"

DECKS   = [ {id, name, cls, cards:[[front, back], ...]}, ... ]
          // cls is a colour class defined in flashcards.html (d1–d7)

GRADES  = [ {slug, key, banner, hex, white, tier, maxim, mind}, ... ]
          // one per belt, syllabus order. slug is the URL hash (e.g. "5th-kyu");
          // key matches SYLLABUS.grade; tier links to TERMS; white = banner text colour.

SYLLABUS = [ {grade, track, section, item, detail}, ... ]
          // all 159 items in syllabus order. track: "All" | "Adult" | "Junior".
          // Source of truth is the Syllabus 2026 spreadsheet — verify before editing.
```

To add content: edit `data.js` only. To add a new page: copy the structure of an
existing page (header, card UI, footer with `← Shizenryu home` link).

## Design system

- Colours: red `#C8102E`, dark `#161616`, paper bg `#faf7f2`, gold `#9A7D00`,
  good `#1e8a4c`, bad `#c0392b`
- Belt colours: red `#C8102E`, orange `#ED8B00`, yellow `#E3BC00`/`#FFD100`,
  green `#00843D`, blue `#0072CE`, purple `#702F8A`, brown `#8B5A2B`, black `#1A1A1A`
- System font stack, mobile-first, content max-width 480–520px, cards with
  14px radius and soft shadows. Buttons are big and thumb-friendly.
- No emojis in content except the existing streak flame and ☯.

## Persistence

Currently none (in-memory only) so pages work everywhere. If adding streaks/spaced
repetition, use `localStorage` with feature detection and graceful fallback — never
require it, and never store personal data (child users; no names, no accounts).

## Verification before commit

1. `node -e "..."` syntax-check each page's inline script together with data.js
   (or simply open each page in a browser and play a full round).
2. Check internal links/hrefs resolve to files in `site/`.
3. Quiz: run one round of every level and both kumite modes.
4. Flashcards: complete one deck using bot