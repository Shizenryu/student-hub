import { describe, expect, it } from 'vitest';

import { buildEnvironment, headerRules, redirectRules, rule } from '../support/netlify-config';

// netlify.toml is what Netlify serves from, so the tests that pin the deployed
// headers have to read the same file rather than a copy of its values. Node has
// no TOML parser and a dependency for a handful of keys is not worth owning, so
// this reads exactly the subset the file uses: `[[headers]]` tables whose values
// are one-line basic strings. Anything else must fail loudly rather than parse
// into something Netlify might not serve — see the multi-line case below.

const table = (body: string, path = '/*'): string => `[[headers]]\n  for = "${path}"\n  [headers.values]\n${body}\n`;

describe('reading [[headers]] rules out of netlify.toml', () => {
  it('returns each rule with its path and every one-line header value', () => {
    const toml = `${table('    X-Frame-Options = "DENY"\n    Referrer-Policy = "no-referrer"')}${table('    Cache-Control = "public, max-age=60"', '/docs/*')}`;

    expect(headerRules(toml)).toEqual([
      { for: '/*', values: { 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' } },
      { for: '/docs/*', values: { 'Cache-Control': 'public, max-age=60' } },
    ]);
  });

  it('keeps single quotes and semicolons inside a value intact', () => {
    const toml = table(`    Content-Security-Policy = "default-src 'none'; script-src 'self' 'sha256-abc='"`);

    expect(headerRules(toml)[0]?.values['Content-Security-Policy']).toBe(
      "default-src 'none'; script-src 'self' 'sha256-abc='",
    );
  });

  it('unescapes the two escapes a basic string needs, quotes and backslashes', () => {
    const toml = table(`    Permissions-Policy = "geolocation=(self \\"https://maps.example\\") back\\\\slash"`);

    expect(headerRules(toml)[0]?.values['Permissions-Policy']).toBe(
      'geolocation=(self "https://maps.example") back\\slash',
    );
  });

  it('ignores redirects and build tables, and comments', () => {
    const toml = `[build]\n  publish = "dist"\n\n[[redirects]]\n  from = "/a"\n  to = "/b"\n\n# A comment = "not a header"\n${table('    X-Content-Type-Options = "nosniff"')}`;

    expect(headerRules(toml)).toEqual([{ for: '/*', values: { 'X-Content-Type-Options': 'nosniff' } }]);
  });

  it('returns no rules when the file has no headers table', () => {
    expect(headerRules('[build]\n  publish = "dist"\n')).toEqual([]);
  });

  // An HTTP header value cannot contain a newline. Netlify's parser only trims
  // a value, so a multi-line TOML string would reach the edge with newlines
  // inside it; refusing it here keeps that from being discovered in production.
  it('refuses a multi-line string value, naming the header', () => {
    const toml = table(`    Content-Security-Policy = '''\n      default-src 'none';\n      script-src 'self'\n    '''`);

    expect(() => headerRules(toml)).toThrow(/Content-Security-Policy.*one line/);
  });
});

describe('picking the rule for one path', () => {
  it('returns that rule\'s values', () => {
    const rules = headerRules(`${table('    X-Frame-Options = "DENY"')}${table('    Cache-Control = "immutable"', '/_astro/*')}`);

    expect(rule(rules, '/_astro/*')).toEqual({ 'Cache-Control': 'immutable' });
  });

  it('fails naming the missing path rather than returning nothing', () => {
    expect(() => rule(headerRules(table('    X-Frame-Options = "DENY"')), '/docs/*')).toThrow(/no \[\[headers\]\] rule for "\/docs\/\*"/);
  });
});

// The rules that keep old bookmarks alive. Unlike a header value, a redirect
// mixes types: two quoted paths, an integer status and an optional boolean.
describe('reading [[redirects]] rules out of netlify.toml', () => {
  const redirect = (body: string): string => `[[redirects]]\n${body}\n`;

  it('returns each rule with its paths and status', () => {
    const toml = `${redirect('  from = "/old.html"\n  to = "/old"\n  status = 301')}${redirect('  from = "/gone"\n  to = "/"\n  status = 302')}`;

    expect(redirectRules(toml)).toEqual([
      { from: '/old.html', to: '/old', status: 301, force: false },
      { from: '/gone', to: '/', status: 302, force: false },
    ]);
  });

  it('reads force, which decides whether a rule beats a real file', () => {
    const toml = redirect('  from = "/index.html"\n  to = "/"\n  status = 301\n  force = true');

    expect(redirectRules(toml)[0]?.force).toBe(true);
  });

  it('ignores headers and build tables, and comments', () => {
    const toml = `[build]\n  publish = "dist"\n\n# [[redirects]] in a comment is not a rule\n${redirect('  from = "/a"\n  to = "/b"\n  status = 301')}[[headers]]\n  for = "/*"\n  [headers.values]\n    X-Frame-Options = "DENY"\n`;

    expect(redirectRules(toml)).toEqual([{ from: '/a', to: '/b', status: 301, force: false }]);
  });

  it('returns no rules when the file has none', () => {
    expect(redirectRules('[build]\n  publish = "dist"\n')).toEqual([]);
  });

  it('refuses a rule missing a path or a status, rather than inventing one', () => {
    expect(() => redirectRules(redirect('  from = "/a"\n  to = "/b"'))).toThrow(/redirect "\/a" has no status/);
    expect(() => redirectRules(redirect('  to = "/b"\n  status = 301'))).toThrow(/redirect with no "from"/);
  });
});

// The one value that varies by deploy: which Node Netlify builds on.
describe('reading [build.environment] out of netlify.toml', () => {
  it('returns the table as strings', () => {
    const toml = '[build]\n  command = "npm run build"\n\n[build.environment]\n  NODE_VERSION = "22"\n\n[[headers]]\n  for = "/*"\n';

    expect(buildEnvironment(toml)).toEqual({ NODE_VERSION: '22' });
  });

  it('is empty when the file declares no build environment', () => {
    expect(buildEnvironment('[build]\n  publish = "dist"\n')).toEqual({});
  });
});
