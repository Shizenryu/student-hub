// Reads netlify.toml, the file the deploy is configured by, so that a test can
// assert what the edge will do rather than a copy of its values. Three kinds of
// table matter, and each has a consumer:
//
//   [[headers]]         tests/build/security-headers.test.ts pins every value;
//                       tests/deploy/serve-dist.ts serves the built pages with
//                       them so a real browser can violate the policy.
//   [[redirects]]       tests/build/netlify-redirects.test.ts pins the rules that
//                       keep old bookmarks alive; serve-dist.ts applies them, so
//                       the deploy walk follows one end to end.
//   [build.environment] tests/unit/node-version.test.ts checks the Node version
//                       Netlify builds on against the one CI builds on.
//
// This is not a TOML parser. It reads exactly the subset the file uses and
// refuses anything else by name. A header value must be a one-line basic string
// with `\"` and `\\` escapes: an HTTP header value cannot contain a newline, and
// Netlify's own parser only trims a value and normalises whitespace around
// commas, so a multi-line string would reach the edge with newlines inside it
// and whatever happened next would happen in production, not here.
//
// Not a *.test.ts file, so vitest does not collect it as a suite.

export type HeaderRule = {
  readonly for: string;
  readonly values: Readonly<Record<string, string>>;
};

export type RedirectRule = {
  readonly from: string;
  readonly to: string;
  readonly status: number;
  // Netlify fires an ordinary rule only when no real file answers the path; a
  // forced one wins even when one does. `/index.html` needs that, because Astro
  // emits a real dist/index.html which would otherwise be served directly.
  readonly force: boolean;
};

const HEADERS_TABLE = /^\[\[headers\]\]\s*$/m;
const REDIRECTS_TABLE = /^\[\[redirects\]\]\s*$/m;
const BUILD_ENVIRONMENT_TABLE = /^\[build\.environment\]\s*$/m;
const STATUS_LINE = /^\s*status\s*=\s*(\d+)\s*$/m;
const FORCE_LINE = /^\s*force\s*=\s*(true|false)\s*$/m;
const ENVIRONMENT_LINE = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*"([^"]*)"\s*$/gm;

const quoted = (key: string): RegExp => new RegExp(`^\\s*${key}\\s*=\\s*"([^"]*)"\\s*$`, 'm');

// A `#` line is a comment wherever it appears, so it is removed before anything
// is split on a table header — otherwise a table name mentioned in a comment
// would read as a table.
const withoutComments = (toml: string): string => toml.replace(/^\s*#.*$/gm, '');

// Everything from one table header up to the next table of any kind.
const blocksUnder = (toml: string, table: RegExp): readonly string[] =>
  withoutComments(toml)
    .split(table)
    .slice(1)
    .map((block) => block.split(/^\[/m)[0] ?? '');
const FOR_LINE = /^\s*for\s*=\s*"([^"]*)"\s*$/m;
const HEADER_LINE = /^\s*([A-Za-z][A-Za-z0-9-]*)\s*=\s*(.*?)\s*$/gm;
const ONE_LINE_BASIC_STRING = /^"((?:[^"\\]|\\["\\])*)"$/;

const unescape = (raw: string): string => raw.replace(/\\(["\\])/g, '$1');

function valuesOf(block: string): Readonly<Record<string, string>> {
  const afterValuesTable = block.split(/^\s*\[headers\.values\]\s*$/m)[1] ?? '';
  return Object.fromEntries(
    [...afterValuesTable.matchAll(HEADER_LINE)].map(([, name, raw]) => {
      const value = ONE_LINE_BASIC_STRING.exec(raw ?? '')?.[1];
      if (name === undefined || value === undefined) {
        throw new Error(
          `netlify.toml header ${name ?? '?'} must be written on one line as a "basic string" — ` +
            `an HTTP header value cannot contain a newline, and this reader supports no other TOML string form`,
        );
      }
      return [name, unescape(value)];
    }),
  );
}

export function headerRules(toml: string): readonly HeaderRule[] {
  // Headers are the one table whose block runs past a nested `[headers.values]`
  // header, so this stops at the next `[[` rather than the next `[`.
  return withoutComments(toml)
    .split(HEADERS_TABLE)
    .slice(1)
    .map((block) => block.split(/^\[\[/m)[0] ?? '')
    .map((block) => ({ for: FOR_LINE.exec(block)?.[1] ?? '', values: valuesOf(block) }));
}

// The rules that keep an old bookmark working. Every field is required except
// `force`, and a rule missing one is a mistake worth naming rather than
// defaulting: a redirect with no status is not a redirect.
export function redirectRules(toml: string): readonly RedirectRule[] {
  return blocksUnder(toml, REDIRECTS_TABLE).map((block) => {
    const from = quoted('from').exec(block)?.[1];
    if (from === undefined) throw new Error('netlify.toml has a redirect with no "from"');
    const to = quoted('to').exec(block)?.[1];
    if (to === undefined) throw new Error(`netlify.toml redirect "${from}" has no "to"`);
    const status = STATUS_LINE.exec(block)?.[1];
    if (status === undefined) throw new Error(`netlify.toml redirect "${from}" has no status`);
    return { from, to, status: Number(status), force: FORCE_LINE.exec(block)?.[1] === 'true' };
  });
}

// The build environment, which is where the Node version Netlify builds on is
// declared — the one value in this file that a second place (.nvmrc) also states.
export function buildEnvironment(toml: string): Readonly<Record<string, string>> {
  const [block] = blocksUnder(toml, BUILD_ENVIRONMENT_TABLE);
  if (block === undefined) return {};
  return Object.fromEntries(
    [...block.matchAll(ENVIRONMENT_LINE)].map((match) => [match[1] ?? '', match[2] ?? ''] as const),
  );
}

// The rule for one path, or a clear failure naming the file — every consumer
// wants exactly this, and "undefined" from a missing rule would surface as a
// confusing assertion three calls later.
export function rule(rules: readonly HeaderRule[], path: string): Readonly<Record<string, string>> {
  const found = rules.find((candidate) => candidate.for === path);
  if (!found) throw new Error(`netlify.toml has no [[headers]] rule for "${path}"`);
  return found.values;
}
