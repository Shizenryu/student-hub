// Every file under a directory, as forward-slashed paths relative to it. Five
// suites walk a tree this way — public/ for the checksum manifest, dist/ for
// the built pages, src/ for the source scans — and `readdir` hands back
// native-separator `parentPath` on Windows, so the normalisation has to live in
// one place or one copy will quietly stop matching on one platform.
//
// Not a *.test.ts file, so vitest does not collect it as a suite.

import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

export async function filesUnder(dir: string): Promise<readonly string[]> {
  const entries = await readdir(dir, { withFileTypes: true, recursive: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join('/'))
    .sort();
}
