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
