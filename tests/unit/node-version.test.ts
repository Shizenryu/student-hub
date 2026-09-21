import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

import { buildEnvironment } from '../support/netlify-config';

// Which Node this project runs on is stated in four places, and nothing but this
// test makes them agree. CI reads .nvmrc; Netlify reads its own NODE_VERSION and
// has never heard of .nvmrc; package.json's engines field is what a contributor
// reads; @types/node is what the compiler believes.
//
// The failure that matters: someone bumps .nvmrc, CI goes green on the new
// version, and every deploy keeps building on the old one — dev/prod parity
// broken silently, in the direction nobody looks.
//
// Only the MAJOR is compared. .nvmrc naming a major is deliberate: it takes
// security patches without a commit.

const major = (version: string): string => version.trim().replace(/^[^\d]*/, '').split('.')[0] ?? '';

const nvmrc = major(await readFile('.nvmrc', 'utf8'));
const netlify = buildEnvironment(await readFile('netlify.toml', 'utf8'));
const packageJson: {
  readonly engines?: { readonly node?: string };
  readonly devDependencies?: Readonly<Record<string, string>>;
} = JSON.parse(await readFile('package.json', 'utf8'));

describe('every declaration of the Node version agrees', () => {
  it('has a major version in .nvmrc to compare against', () => {
    expect(nvmrc).toMatch(/^\d+$/);
  });

  it('builds on Netlify with the version CI builds on', () => {
    expect(major(netlify.NODE_VERSION ?? ''), 'netlify.toml [build.environment] NODE_VERSION vs .nvmrc').toBe(nvmrc);
  });

  it('tells a contributor the same version through package.json engines', () => {
    expect(major(packageJson.engines?.node ?? ''), 'package.json engines.node vs .nvmrc').toBe(nvmrc);
  });

  it('type-checks against the runtime it runs on', () => {
    expect(major(packageJson.devDependencies?.['@types/node'] ?? ''), '@types/node vs .nvmrc').toBe(nvmrc);
  });
});
