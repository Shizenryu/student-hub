# Slice 2a — Content Migration and Faithfulness Proof: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move all eight content datasets out of the legacy `public/assets/data.js` into typed JSON the Astro build can consume, and prove mechanically that not one byte of martial content changed meaning.

**Architecture:** The legacy `data.js` stays exactly where it is — all six legacy pages still load it via `<script src>`, and it remains the source of truth until the last page migrates in slice 6. This slice adds a second, typed representation alongside it and a parity test asserting the two agree. That test lives for the whole migration, so every later slice keeps proving the migrated content still matches what students are actually being served.

No page changes. Nothing students see moves. The deliverable is provably faithful data plus the machinery that keeps it faithful.

**Tech Stack:** Plain JSON, TypeScript strict, Vitest (node). No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-28-productionise-student-hub-design.md`

## Corrections to the spec, already decided

The spec is wrong on two points and this plan supersedes it:

1. **The spec says the original `data.js` is "deleted in the same PR once the test passes".** It cannot be. All six legacy pages load it (`grep -n "data.js" public/*.html` confirms six hits). Deleting it here breaks flashcards, index, kata, practice and quiz. It stays until slice 6, and the parity test stays with it — which is strictly better, because it keeps guarding every intermediate state rather than firing once.

2. **The spec says the data becomes Astro content collections, Zod-validated.** The `file()` loader requires a unique `id` per entry. `GRADES`, `KUMITE`, `DECKS`, `PRACTICE` and `KATA` have natural keys, but `SYLLABUS` is 159 rows with no unique key, `TERMS` is an object of arrays keyed by tier, and `MAXIMS` is a list of bare strings. Forcing those into collections means inventing identifiers — reshaping martial content to suit a tool. This slice uses plain JSON with hand-rolled integrity checks instead, matching the reasoning already applied to the persisted-state guard. Content collections still arrive in slice 3, for the kata prose as markdown, where they genuinely fit.

## Global Constraints

- **Zero runtime dependencies of our own.** Direct deps stay exactly: `astro`, `@astrojs/react`, `react`, `react-dom`. No new devDependencies either — this slice needs none.
- **No content changes.** Not one byte of martial content may be edited, reformatted, reworded or reordered. Values are copied mechanically. Ordering is preserved exactly, because `MAXIMS` is indexed by day number and `GRADES`/`SYLLABUS` are in syllabus order.
- **`public/` is untouched.** `public/assets/data.js` is not edited, moved or deleted in this slice. `tests/build/legacy-content.sha256` must still pass unchanged.
- **TypeScript strict**, including `noUncheckedIndexedAccess`. Do not weaken any compiler option.
- **No page or route changes.** No `.astro` files under `src/pages/` are added or modified. Slice 2b owns the UI.
- **Node pinned to 22.** Path comparisons normalise separators (`path.sep` → `/`), since development is on Windows and CI is Linux.

## Reference: the data as it exists today

Verified by loading the real file. Do not take these on trust — the parity test re-derives them.

| Dataset | Shape | Size |
|---|---|---|
| `TERMS` | object keyed `"1".."4"`, each an array of `[japanese, english]` pairs | 4 tiers |
| `MAXIMS` | array of strings — **order is load-bearing**, `index.html` shows `MAXIMS[day % length]` | 10 |
| `KUMITE` | `{n, side, belt, steps[]}` | 12 |
| `DECKS` | `{id, name, cls, cards[[front, back]]}` | 6 |
| `GRADES` | `{slug, key, banner, hex, white, tier, maxim, mind}` | 12 |
| `SYLLABUS` | `{grade, track, section, item, detail}` | 159 |
| `KATA` | `{slug, name, translation, hex, white, match[], quote?, sections[]}` | 4 |
| `PRACTICE` | `{id, name, hint}` | 10 |

`data.js` declares these with `const` at top level and has no exports. `eval()` will NOT expose them — `const` inside `eval` is block-scoped and vanishes. Use the `new Function` trick shown in Task 1.

---

### Task 1: Extract the data, and prove the extraction is faithful

**Files:**
- Create: `scripts/extract-legacy-data.mjs`
- Create: `src/data/terms.json`, `maxims.json`, `kumite.json`, `decks.json`, `grades.json`, `syllabus.json`, `kata.json`, `practice.json`
- Create: `tests/unit/legacy-data-parity.test.ts`

**Interfaces:**
- Consumes: `public/assets/data.js` (read-only — never modify it).
- Produces: eight JSON files under `src/data/`, each holding exactly the value of the matching `const` in `data.js`. Task 2 imports these.

The extraction is mechanical on purpose. Nobody retypes syllabus content, and the test is what licenses trusting the result.

- [ ] **Step 1: Write the extraction script**

Create `scripts/extract-legacy-data.mjs`:

```js
// Extracts the content datasets from the legacy public/assets/data.js into JSON.
// data.js declares everything with top-level `const` and exports nothing, so it is
// evaluated inside a Function body that returns the bindings — `eval` would not work,
// because `const` inside eval is block-scoped and never escapes.
//
// This script is the record of how the migration was performed. It stays until the
// last legacy page migrates in slice 6 and data.js is finally removed.
import { readFile, writeFile, mkdir } from 'node:fs/promises';

const SOURCE = 'public/assets/data.js';
const OUT_DIR = 'src/data';

const DATASETS = ['TERMS', 'MAXIMS', 'KUMITE', 'DECKS', 'GRADES', 'SYLLABUS', 'KATA', 'PRACTICE'];

const source = await readFile(SOURCE, 'utf8');
const data = new Function(`${source}\nreturn { ${DATASETS.join(', ')} };`)();
await mkdir(OUT_DIR, { recursive: true });

for (const name of DATASETS) {
  const file = `${OUT_DIR}/${name.toLowerCase()}.json`;
  await writeFile(file, `${JSON.stringify(data[name], null, 2)}\n`, 'utf8');
  const value = data[name];
  const size = Array.isArray(value) ? `${value.length} items` : `${Object.keys(value).length} keys`;
  console.log(`wrote ${file} (${size})`);
}
```

- [ ] **Step 2: Run the extraction**

Run: `node scripts/extract-legacy-data.mjs`

Expected output, exactly:

```
wrote src/data/terms.json (4 keys)
wrote src/data/maxims.json (10 items)
wrote src/data/kumite.json (12 items)
wrote src/data/decks.json (6 items)
wrote src/data/grades.json (12 items)
wrote src/data/syllabus.json (159 items)
wrote src/data/kata.json (4 items)
wrote src/data/practice.json (10 items)
```

If any count differs from that table, STOP and report — the source file has changed since this plan was written and the counts must be reconciled before going further.

- [ ] **Step 3: Write the failing parity test**

Create `tests/unit/legacy-data-parity.test.ts`. This is the test that licenses trusting the migration, and it stays alive until slice 6.

```ts
import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import decks from '../../src/data/decks.json';
import grades from '../../src/data/grades.json';
import kata from '../../src/data/kata.json';
import kumite from '../../src/data/kumite.json';
import maxims from '../../src/data/maxims.json';
import practice from '../../src/data/practice.json';
import syllabus from '../../src/data/syllabus.json';
import terms from '../../src/data/terms.json';

const LEGACY_SOURCE = 'public/assets/data.js';
const DATASETS = ['TERMS', 'MAXIMS', 'KUMITE', 'DECKS', 'GRADES', 'SYLLABUS', 'KATA', 'PRACTICE'] as const;

const MIGRATED: Record<(typeof DATASETS)[number], unknown> = {
  TERMS: terms,
  MAXIMS: maxims,
  KUMITE: kumite,
  DECKS: decks,
  GRADES: grades,
  SYLLABUS: syllabus,
  KATA: kata,
  PRACTICE: practice,
};

async function loadLegacyData(): Promise<Record<string, unknown>> {
  const source = await readFile(LEGACY_SOURCE, 'utf8');
  return new Function(`${source}\nreturn { ${DATASETS.join(', ')} };`)() as Record<string, unknown>;
}

describe('migrated JSON matches the content students are still served', () => {
  it.each(DATASETS)('%s is identical to the legacy data.js value', async (name) => {
    const legacy = await loadLegacyData();
    expect(MIGRATED[name]).toStrictEqual(legacy[name]);
  });

  it('covers every dataset the legacy file declares', async () => {
    const legacy = await loadLegacyData();
    expect(Object.keys(legacy).sort()).toStrictEqual([...DATASETS].sort());
  });
});
```

`toStrictEqual` rather than `toEqual`: it distinguishes `undefined` properties from absent ones, which matters because `KATA.quote` is optional.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test`

Expected: PASS — 9 new tests (8 datasets + the coverage check), alongside the 6 existing build tests.

- [ ] **Step 5: Prove the test detects a single altered character**

This is the whole point of the task. Edit `src/data/syllabus.json` and change one character of one `item` value — for example change `"Part 1"` to `"Part 2"` in the first entry.

Run: `npm test`

Expected: FAIL on `SYLLABUS is identical to the legacy data.js value`, with a diff naming the changed entry.

Then revert that edit (`git checkout -- src/data/syllabus.json`) and confirm the suite is green again. Report both outputs. **Do not commit the altered file.**

- [ ] **Step 6: Prove `public/` was not touched**

Run: `git status --short public`

Expected: empty. If anything under `public/` is modified, STOP — the extraction script must only read that directory.

Then run: `npm test`

Expected: the existing `legacy-content.sha256` checksum tests still pass, confirming the legacy content is byte-identical to its known-good baseline.

- [ ] **Step 7: Commit**

```bash
git add scripts/extract-legacy-data.mjs src/data tests/unit/legacy-data-parity.test.ts
git commit -m "feat: extract content datasets to JSON with a parity proof against data.js"
```

---

### Task 2: Types and integrity, enforced at build and in tests

**Files:**
- Create: `src/data/index.ts`
- Create: `src/data/integrity.ts`
- Create: `tests/unit/content-integrity.test.ts`

**Interfaces:**
- Consumes: the eight JSON files from Task 1.
- Produces: `src/data/index.ts` exporting typed `TERMS`, `MAXIMS`, `KUMITE`, `DECKS`, `GRADES`, `SYLLABUS`, `KATA`, `PRACTICE`, plus the types `Grade`, `SyllabusItem`, `Kumite`, `Deck`, `Kata`, `PracticeActivity`, `TermPair`, `Tier`. Slice 2b's `/belts/[slug]` route imports from here and nowhere else.
- Produces: `assertContentIntegrity()` from `src/data/integrity.ts`, called both by the test suite and at build time.

Why hand-rolled rather than Zod: the shapes are already proven correct by Task 1's parity test, so runtime shape parsing buys nothing today. What genuinely needs guarding is the cross-references a future content edit could break — a belt whose `key` no longer matches any syllabus row renders an empty study guide with no error at all. That is a handful of set comparisons, not a schema library. (Zod itself would add no dependency — it ships transitively with Astro and is re-exported as `import { z } from 'astro:content'` — but it is still the wrong tool here: reaching for a schema library to express a handful of set comparisons is no gain over hand-rolling them.)

- [ ] **Step 1: Write the typed accessor module**

Create `src/data/index.ts`:

```ts
import decksJson from './decks.json';
import gradesJson from './grades.json';
import kataJson from './kata.json';
import kumiteJson from './kumite.json';
import maximsJson from './maxims.json';
import practiceJson from './practice.json';
import syllabusJson from './syllabus.json';
import termsJson from './terms.json';

// Field types mirror what JSON can actually prove. `tier`, `track` and `side` have
// small fixed value sets, but TypeScript infers `number`/`string` from a .json file
// and narrowing them here would need a type assertion — which the project bans
// without justification. Their allowed values are enforced in integrity.ts instead,
// where a violation produces a named error rather than a silent mistyping.
//
// Pairs are `readonly string[]` for the same reason: JSON infers arrays, not tuples.
// Their length is checked in integrity.ts.

export type TermPair = readonly string[];

export type Grade = {
  readonly slug: string;
  readonly key: string;
  readonly banner: string;
  readonly hex: string;
  readonly white: boolean;
  readonly tier: number;
  readonly maxim: string;
  readonly mind: string;
};

export type SyllabusItem = {
  readonly grade: string;
  readonly track: string;
  readonly section: string;
  readonly item: string;
  readonly detail: string;
};

export type Kumite = {
  readonly n: number;
  readonly side: string;
  readonly belt: string;
  readonly steps: readonly string[];
};

export type Deck = {
  readonly id: string;
  readonly name: string;
  readonly cls: string;
  readonly cards: readonly TermPair[];
};

export type KataSection = { readonly h: string; readonly b: string };

export type Kata = {
  readonly slug: string;
  readonly name: string;
  readonly translation: string;
  readonly hex: string;
  readonly white: boolean;
  readonly match: readonly string[];
  readonly quote?: { readonly text: string; readonly src: string };
  readonly sections: readonly KataSection[];
};

export type PracticeActivity = { readonly id: string; readonly name: string; readonly hint: string };

// Annotations, not assertions — the JSON's inferred shape must actually satisfy these
// types or the build fails, which is the point.
export const TERMS: Readonly<Record<string, readonly TermPair[]>> = termsJson;
export const MAXIMS: readonly string[] = maximsJson;
export const KUMITE: readonly Kumite[] = kumiteJson;
export const DECKS: readonly Deck[] = decksJson;
export const GRADES: readonly Grade[] = gradesJson;
export const SYLLABUS: readonly SyllabusItem[] = syllabusJson;
export const KATA: readonly Kata[] = kataJson;
export const PRACTICE: readonly PracticeActivity[] = practiceJson;
```

There is not a single type assertion in this module, and there must not be. Each `const` is a plain annotation, so if a JSON file's shape ever stops matching its type the build fails at this line and names the dataset.

If `npm run typecheck` reports that JSON modules cannot be imported, add `"resolveJsonModule": true` to `tsconfig.json`. That enables a capability rather than relaxing a check, and is permitted. Do not disable any existing strict option.

If a JSON value genuinely will not satisfy its annotation — for example `KATA.quote` being absent on some entries — fix the *type* to describe the real data, never the data to suit the type, and say so in your report.

- [ ] **Step 2: Write the failing integrity test**

Create `tests/unit/content-integrity.test.ts`:

```ts
import { describe, expect, it } from 'vitest';

import { assertContentIntegrity } from '../../src/data/integrity';
import { GRADES, KATA, SYLLABUS, TERMS } from '../../src/data';

describe('content cross-references hold', () => {
  it('accepts the real content', () => {
    expect(() => assertContentIntegrity()).not.toThrow();
  });

  it('gives every belt a syllabus', () => {
    const graded = new Set(SYLLABUS.map((item) => item.grade));
    for (const grade of GRADES) {
      expect(graded, `no syllabus rows for belt "${grade.key}"`).toContain(grade.key);
    }
  });

  it('assigns every syllabus row to a known belt', () => {
    const keys = new Set(GRADES.map((grade) => grade.key));
    for (const item of SYLLABUS) {
      expect(keys, `syllabus row for unknown belt "${item.grade}"`).toContain(item.grade);
    }
  });

  it('points every belt at a terminology tier that exists', () => {
    for (const grade of GRADES) {
      expect(TERMS[String(grade.tier)], `belt "${grade.key}" has no tier ${grade.tier}`).toBeDefined();
    }
  });

  it('gives every belt and kata a unique slug', () => {
    const beltSlugs = GRADES.map((grade) => grade.slug);
    expect(new Set(beltSlugs).size).toBe(beltSlugs.length);
    const kataSlugs = KATA.map((entry) => entry.slug);
    expect(new Set(kataSlugs).size).toBe(kataSlugs.length);
  });

  it('matches every kata to at least one syllabus row', () => {
    for (const entry of KATA) {
      const hit = SYLLABUS.some((item) =>
        entry.match.some((needle) => `${item.section} ${item.item} ${item.detail}`.toLowerCase().includes(needle)),
      );
      expect(hit, `kata "${entry.name}" matches no syllabus row via ${JSON.stringify(entry.match)}`).toBe(true);
    }
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test`

Expected: FAIL — `Cannot find module '../../src/data/integrity'`. This confirms the test is reaching for code that does not exist yet.

- [ ] **Step 4: Write the integrity module**

Create `src/data/integrity.ts`:

```ts
import { DECKS, GRADES, KATA, KUMITE, SYLLABUS, TERMS } from './index';

const TRACKS = new Set(['All', 'Adult', 'Junior']);
const SIDES = new Set(['OS', 'SS']);

// Cross-reference checks that a future content edit could break silently.
// A belt whose key stops matching any syllabus row renders an empty study guide
// with no error anywhere — this turns that into a build failure.
export function assertContentIntegrity(): void {
  const problems: string[] = [];

  const gradeKeys = new Set(GRADES.map((grade) => grade.key));
  const gradedInSyllabus = new Set(SYLLABUS.map((item) => item.grade));

  for (const grade of GRADES) {
    if (!gradedInSyllabus.has(grade.key)) problems.push(`belt "${grade.key}" has no syllabus rows`);
    if (!TERMS[String(grade.tier)]) problems.push(`belt "${grade.key}" points at missing tier ${grade.tier}`);
  }

  for (const item of SYLLABUS) {
    if (!gradeKeys.has(item.grade)) problems.push(`syllabus row names unknown belt "${item.grade}"`);
    if (!TRACKS.has(item.track)) problems.push(`syllabus row for "${item.grade}" has unknown track "${item.track}"`);
  }

  // The value sets the types cannot express, checked here instead.
  for (const bout of KUMITE) {
    if (!SIDES.has(bout.side)) problems.push(`kumite ${bout.n} has unknown side "${bout.side}"`);
  }

  for (const [tier, pairs] of Object.entries(TERMS)) {
    pairs.forEach((pair, index) => {
      if (pair.length !== 2) problems.push(`tier ${tier} term ${index} is not a japanese/english pair`);
    });
  }

  for (const deck of DECKS) {
    deck.cards.forEach((card, index) => {
      if (card.length !== 2) problems.push(`deck "${deck.id}" card ${index} is not a front/back pair`);
    });
  }

  const beltSlugs = GRADES.map((grade) => grade.slug);
  if (new Set(beltSlugs).size !== beltSlugs.length) problems.push('two belts share a slug');

  const kataSlugs = KATA.map((entry) => entry.slug);
  if (new Set(kataSlugs).size !== kataSlugs.length) problems.push('two kata share a slug');

  for (const entry of KATA) {
    const hit = SYLLABUS.some((item) =>
      entry.match.some((needle) => `${item.section} ${item.item} ${item.detail}`.toLowerCase().includes(needle)),
    );
    if (!hit) problems.push(`kata "${entry.name}" matches no syllabus row`);
  }

  if (problems.length > 0) {
    throw new Error(`Content integrity failed:\n  - ${problems.join('\n  - ')}`);
  }
}
```

Note `problems` accumulates rather than throwing on the first failure, so one run reports everything wrong. A maintainer fixing content should not have to re-run eight times to find eight problems.

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test`

Expected: PASS — 6 integrity tests, 9 parity tests, 6 build tests.

If `assertContentIntegrity()` throws on the real content, do NOT relax the check to make it pass. The content is the authority: report exactly what it reported, and stop. A genuine cross-reference break in the live syllabus is a finding worth surfacing to the maintainer, not a test to soften.

- [ ] **Step 6: Prove the integrity check detects a broken cross-reference**

Edit `src/data/grades.json` and change the first entry's `"key"` from `"9th Kyu"` to `"9th Kyuu"`.

Run: `npm test`

Expected: FAIL, reporting both that belt `"9th Kyuu"` has no syllabus rows AND that syllabus rows name an unknown belt `"9th Kyu"` — the accumulating design means one run shows both sides of the break. The parity test should also fail, since the JSON no longer matches `data.js`.

Revert (`git checkout -- src/data/grades.json`) and confirm green. Report both outputs. **Do not commit the altered file.**

- [ ] **Step 7: Confirm types are genuinely enforced**

Run: `npm run typecheck`

Expected: 0 errors.

Then temporarily add this line to the end of `src/data/index.ts`:

```ts
const probe: number = GRADES[0].key;
```

Run: `npm run typecheck`

Expected: FAIL with two errors — `GRADES[0]` is possibly `undefined` (`noUncheckedIndexedAccess`), and `string` is not assignable to `number`. This proves the JSON is genuinely typed rather than silently `any`.

Remove the probe line and confirm `npm run typecheck` reports 0 errors again.

- [ ] **Step 8: Commit**

```bash
git add src/data/index.ts src/data/integrity.ts tests/unit/content-integrity.test.ts
git commit -m "feat: type the migrated content and enforce its cross-references"
```

---

## Definition of done for this slice

- [ ] `npm ci && npm run typecheck && npm run build && npm test && npm run test:browser` passes from a clean clone.
- [ ] `git status --short public` is empty — the legacy content is untouched and its checksum baseline still passes.
- [ ] The parity test proves all eight datasets match `data.js` exactly, and was observed failing on a single altered character.
- [ ] The integrity check was observed failing on a broken belt/syllabus cross-reference.
- [ ] No `.astro` file was added or changed. No page or route behaviour differs. Nothing students see has moved.

## Mutation gate

Run mutation testing over `src/data/integrity.ts` only — it is the sole file in this slice containing branching logic worth mutating. The JSON files are data, the accessor module is type assertions, and the parity test is an equality assertion whose strength was demonstrated directly in Task 1 Step 5.

Surviving mutants in the cross-reference loops are worth killing: each corresponds to a class of content breakage reaching production unnoticed.

## What this slice deliberately does not do

- No design tokens, no shared shell, no `/belts/[slug]` route — slice 2b.
- No deletion of `public/belts.html` or its checksum entry — slice 2b, when the route replaces it.
- No deletion of `public/assets/data.js` — slice 6, when the last legacy page migrates.
- No content collections — slice 3, for the kata prose as markdown, where the loader's requirements actually fit.
- No conversion of `KATA.sections[].b` from trusted HTML to markdown — slice 3. This slice ports it verbatim so the migration stays purely mechanical.
