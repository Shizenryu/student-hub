import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { DECKS, GRADES, KATA, KUMITE, MAXIMS, PRACTICE, SYLLABUS, TERMS } from '../../src/data';
import {
  DATASETS,
  type DatasetName,
  LEGACY_SOURCE,
  discoverLegacyDatasetNames,
  extractLegacyDatasets,
} from '../../src/data/parity';

// The contract the *next* slice consumes is src/data/index.ts's exports, not the raw
// JSON files behind them — so that is what parity is proved against here. Today the
// mapping from JSON to these exports is identity, but a future derivation in index.ts
// (a sort, a dedupe, a filter, the "JJ" expansion applied at module level) would only be
// caught by pointing this test at the exports themselves.
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

async function loadLegacyData(): Promise<Record<string, unknown>> {
  const source = await readFile(LEGACY_SOURCE, 'utf8');
  return extractLegacyDatasets(source);
}

describe('migrated content matches what the legacy pages are still served', () => {
  it.each(DATASETS)('%s is identical to the legacy data.js value', async (name) => {
    const legacy = await loadLegacyData();
    expect(MIGRATED[name]).toStrictEqual(legacy[name]);
  });

  it('migrates every dataset the legacy file declares', async () => {
    const source = await readFile(LEGACY_SOURCE, 'utf8');
    const declared = discoverLegacyDatasetNames(source);
    expect(
      declared.sort(),
      'public/assets/data.js declares a dataset this suite does not migrate — add it to src/data/ and to DATASETS, or remove it from data.js',
    ).toStrictEqual([...DATASETS].sort());
  });
});

describe('discoverLegacyDatasetNames', () => {
  it('finds a top-level const declaration that DATASETS does not know about', () => {
    const syntheticSource = 'const TERMS = {};\nconst NEWDATASET = [];\n';

    expect(discoverLegacyDatasetNames(syntheticSource)).toEqual(['TERMS', 'NEWDATASET']);
  });

  it('ignores indented const declarations', () => {
    const syntheticSource =
      'const TERMS = {};\nfunction helper() {\n  const NOT_TOP_LEVEL = 1;\n  return NOT_TOP_LEVEL;\n}\n';

    expect(discoverLegacyDatasetNames(syntheticSource)).toEqual(['TERMS']);
  });
});
