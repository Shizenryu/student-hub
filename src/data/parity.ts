import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { isDeepStrictEqual } from 'node:util';

import { DECKS, GRADES, KATA, KUMITE, MAXIMS, PRACTICE, SYLLABUS, TERMS } from './index';

// The legacy source every migrated dataset is proved against. Deleted in the slice
// that migrates the last legacy page — assertLegacyParity() below treats its absence
// as "nothing left to prove", not a failure.
export const LEGACY_SOURCE = 'public/assets/data.js';

export const DATASETS = ['TERMS', 'MAXIMS', 'KUMITE', 'DECKS', 'GRADES', 'SYLLABUS', 'KATA', 'PRACTICE'] as const;

export type DatasetName = (typeof DATASETS)[number];

// data.js declares everything with top-level `const` and exports nothing, so it is
// evaluated inside a Function body that returns the bindings — `eval` would not work,
// because `const` inside eval is block-scoped and never escapes. Shared by the build-time
// parity check and its test so the extraction trick exists in exactly one place.
export function extractLegacyDatasets(source: string): Record<DatasetName, unknown> {
  return new Function(`${source}\nreturn { ${DATASETS.join(', ')} };`)() as Record<DatasetName, unknown>;
}

// Reads the *source text* rather than trusting DATASETS, so it can catch a dataset that
// was added to data.js but never migrated.
//
// Real assumptions this regex encodes (hold for data.js today, but are easy to outgrow):
// - matches `const` declarations only — a top-level `let` or `var` is invisible to it
// - anchored at column zero (`^` with the `m` flag) — an *indented* `const`, whether
//   nested inside a function body, a block, or a comment, is not matched; a top-level
//   `const` that happens to be indented would also be missed
// - matches one declarator per statement — `const A = {}, B = [];` finds only `A`
// - does not match `export const` — data.js exports nothing, so this never arises here
export function discoverLegacyDatasetNames(source: string): string[] {
  return [...source.matchAll(/^const\s+([A-Za-z_$][\w$]*)\s*=/gm)]
    .map((match) => match[1])
    .filter((name): name is string => name !== undefined);
}

const MIGRATED: Record<DatasetName, unknown> = {
  TERMS,
  MAXIMS,
  KUMITE,
  DECKS,
  GRADES,
  SYLLABUS,
  KATA,
  PRACTICE,
};

// Build-time twin of tests/unit/legacy-data-parity.test.ts: proves src/data/index.ts's
// exports still equal what public/assets/data.js serves to the legacy pages, so a
// derivation added to index.ts (a sort, a dedupe, a filter) that silently diverges from
// data.js fails the build, not just the test suite Netlify does not run.
//
// public/assets/data.js is deleted once the last legacy page migrates off it (slice 6).
// From that point there is nothing left to prove parity against, so a missing file is a
// no-op, not a failure — this check is meant to retire cleanly, not break the build.
export async function assertLegacyParity(): Promise<void> {
  if (!existsSync(LEGACY_SOURCE)) return;

  const source = await readFile(LEGACY_SOURCE, 'utf8');
  const legacy = extractLegacyDatasets(source);

  const problems = DATASETS.filter((name) => !isDeepStrictEqual(MIGRATED[name], legacy[name]));

  if (problems.length > 0) {
    throw new Error(
      `Legacy parity failed — src/data/index.ts no longer matches ${LEGACY_SOURCE} for: ${problems.join(', ')}`,
    );
  }
}
