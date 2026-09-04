# Shizenryu Student Hub

The digital home for students of Shizenryu Karate — *The Natural Way of Karate*.

**Live site:** built and deployed automatically to Netlify on every push to `main`.

## What's here

| Page | Purpose |
|---|---|
| `/` | Landing page — maxim of the day, links to everything. A real Astro route now; `public/index.html` is gone and `/index.html` redirects here for old bookmarks. The maxim and the streak chip are filled in client-side by `public/assets/home.js`, because a page built ahead of time cannot know what day you are reading it |
| `public/quiz.html` | Dojo Quiz — Japanese terminology by belt level, plus Kumite 1–12 sequence training |
| `public/flashcards.html` | Philosophy flashcards — the Maxims, Zen & Karate, Tui Shou, and more |
| `/belts`, `/belts/<slug>` | Belt study guides — syllabus, key terms and the mind behind the movement for each grade. A real Astro route now; `public/belts.html` is gone and `belts.html` redirects here for old bookmarks |
| `/kata`, `/kata/<slug>` | Kata reference — what each kata is, what its name means, and where it lives in the syllabus. A real Astro route now; `public/kata.html` is gone and `kata.html` redirects here for old bookmarks. Kata prose is authored as markdown in `src/content/kata/` |
| `public/docs/` | Printable PDFs: grade study guides, philosophy study guide, belt passport |
| `public/assets/data.js` | All quiz/flashcard content — see CLAUDE.md's "To add content" procedure before editing |

## Working on this repo

You need [Node 22](https://nodejs.org). Then:

```bash
npm ci        # install exactly the locked dependencies
npm run dev   # local site at http://localhost:4321/
```

| Command | What it does |
|---|---|
| `npm run dev` | Local development server with live reload |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the built `dist/` locally — does not apply `netlify.toml` redirects/headers |
| `npm run typecheck` | TypeScript and Astro type checking |
| `npm test` | Node tests (run `npm run build` first) |
| `npm run test:browser` | Browser tests in Chromium (see below) |

Pages cannot be opened directly from disk any more — use `npm run dev`.

The browser tests need Chromium, which `npm ci` does not download. Once per machine:

```bash
npx playwright install chromium
```

`npm run dev` and `npm run preview` both run as background daemons — the command
returns immediately once the server is up, it does not keep running in your terminal.
Check with `npx astro dev status` / `npx astro preview status`, and stop with
`npx astro dev stop` / `npx astro preview stop`.

Netlify builds the site from source on every push to `main`; nothing generated is
committed.

Start with **CLAUDE.md**: it documents the structure, data schemas, design system,
content rules (all martial content comes from the official syllabus and source papers),
and the verification checklist to run before committing.

## Credits

Content drawn from the Shizenryu Syllabus 2026 and the papers of Ian Smith.
Source documents are copyright their author and are not stored in this repository.

*Structure > Discipline > Measure / Accountability = Growth*
