// Serves the built site the way Netlify will: every file under dist/, a
// directory's index.html at its clean URL, 404.html for anything else, and the
// headers netlify.toml declares for "/*" on every response — including that
// 404, which is the case a per-route rule would miss.
//
// `astro preview` cannot stand in for this: it does not read netlify.toml, so
// it serves the pages with no policy at all and the browser has nothing to
// violate. What this serves is what the deploy test proves; what Netlify
// actually serves is confirmed once, by hand, with curl after the first deploy.
//
// Not a *.test.ts file, so vitest does not collect it as a suite.

import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import type { AddressInfo } from 'node:net';

import { headerRules } from '../support/netlify-headers';

const DIST_DIR = 'dist';
const NETLIFY_TOML = 'netlify.toml';

const CONTENT_TYPES: Readonly<Record<string, string>> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

export type BuiltSite = {
  readonly origin: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly close: () => Promise<void>;
};

async function everythingHeaders(): Promise<Readonly<Record<string, string>>> {
  const rule = headerRules(await readFile(NETLIFY_TOML, 'utf8')).find((candidate) => candidate.for === '/*');
  if (!rule) throw new Error(`${NETLIFY_TOML} has no [[headers]] rule for "/*"`);
  return rule.values;
}

// A clean URL resolves to its directory's index.html, the way Netlify (and
// Astro's default `build.format`) serve it; a file path resolves to itself.
const candidatePaths = (pathname: string): readonly string[] =>
  pathname.endsWith('/') ? [`${pathname}index.html`] : [pathname, `${pathname}/index.html`];

async function readFirst(paths: readonly string[]): Promise<{ readonly path: string; readonly body: Buffer } | null> {
  for (const path of paths) {
    try {
      return { path, body: await readFile(join(DIST_DIR, normalize(path))) };
    } catch {
      // not this candidate — try the next
    }
  }
  return null;
}

const listen = (server: Server): Promise<number> =>
  new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => resolve((server.address() as AddressInfo).port));
  });

export async function serveBuiltSite(): Promise<BuiltSite> {
  const headers = await everythingHeaders();

  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const found = await readFirst(candidatePaths(pathname));
    const served = found ?? { path: '/404.html', body: await readFile(join(DIST_DIR, '404.html')) };
    response.writeHead(found ? 200 : 404, {
      ...headers,
      'Content-Type': CONTENT_TYPES[extname(served.path)] ?? 'application/octet-stream',
    });
    response.end(served.body);
  });

  const port = await listen(server);
  return {
    origin: `http://127.0.0.1:${port}`,
    headers,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}
