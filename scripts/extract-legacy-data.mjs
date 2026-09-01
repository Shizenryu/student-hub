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
