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

const HEADERS_TABLE = /^\[\[headers\]\]\s*$/m;
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
  const withoutComments = toml.replace(/^\s*#.*$/gm, '');
  return withoutComments
    .split(HEADERS_TABLE)
    .slice(1)
    .map((block) => block.split(/^\[\[/m)[0] ?? '')
    .map((block) => ({ for: FOR_LINE.exec(block)?.[1] ?? '', values: valuesOf(block) }));
}

// The rule for one path, or a clear failure naming the file — every consumer
// wants exactly this, and "undefined" from a missing rule would surface as a
// confusing assertion three calls later.
export function rule(rules: readonly HeaderRule[], path: string): Readonly<Record<string, string>> {
  const found = rules.find((candidate) => candidate.for === path);
  if (!found) throw new Error(`netlify.toml has no [[headers]] rule for "${path}"`);
  return found.values;
}
