// Shared helpers for asserting against Astro's BUILT HTML.
//
// Every migrated route's build test needs the same two things: text escaped the
// way Astro escapes it, and a JSON payload read back out of a data attribute.
// They lived as near-copies in belts-routes and kata-routes, and the decode
// direction existed only as an inline single-entity `.replace`. One copy here
// means the next migrated page inherits the correct version rather than
// whichever copy it was pasted from.
//
// Not a *.test.ts file, so vitest does not collect it as a suite — see the
// `include` globs in vitest.config.ts.

// Astro escapes interpolated text (its equivalent of the legacy pages' own
// esc() helper): content containing &, <, >, " or ' comes out entity-escaped in
// the built HTML, so fixture text is escaped the same way before comparing.
export function astroEscapeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ATTRIBUTE_ENTITIES: Readonly<Record<string, string>> = {
  '&quot;': '"',
  '&#34;': '"',
  '&amp;': '&',
  '&#38;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&#39;': "'",
};

// The inverse of astroEscapeText, in ONE pass over the table rather than
// chained .replace() calls. Chaining decodes &amp;quot; — an escaped, literal
// "&quot;" inside the content — into a real quote, which then corrupts the JSON
// it is embedded in. Only &quot; occurs in today's content; the rest are here so
// a future content edit fails on its own merits instead of failing a test on a
// page that renders perfectly well.
export function decodeAttribute(value: string): string {
  return value.replace(/&(?:quot|amp|lt|gt|#34|#38|#39);/g, (entity) => ATTRIBUTE_ENTITIES[entity] ?? entity);
}

// Reads a JSON payload a route wrote into a data attribute — the contract the
// client scripts in public/assets/ read at runtime. Returns undefined when the
// attribute is absent, which JSON.parse can never itself produce, so a caller
// can assert on the value alone and still get a clear failure when the
// attribute went missing entirely.
export function jsonAttribute(html: string, attribute: string): unknown {
  const raw = new RegExp(`${attribute}="([^"]*)"`).exec(html)?.[1];
  return raw === undefined ? undefined : JSON.parse(decodeAttribute(raw));
}
