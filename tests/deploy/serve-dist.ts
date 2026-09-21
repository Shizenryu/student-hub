// Serves the built site the way Netlify will: every file under dist/, a
// directory's index.html at its trailing-slash URL, 404.html for anything else,
// the headers netlify.toml declares on every response, and the redirects it
// declares — an ordinary rule only when no file answers the path, a forced one
// even when one does, which is Netlify's documented order and the reason the
// /index.html rule is forced at all.
//
// It also emulates Netlify's pretty URLs, which 301 /quiz to /quiz/ — without
// that, following a retired URL through its rule would land on a 404 here while
// production served the page.
//
// One honest limit is left: it applies the `/*` rule to its own 404 responses,
// which is an assumption about Netlify that only a curl against the live site
// can confirm (CLAUDE.md lists that check).
//
// `astro preview` cannot stand in for this: it does not read netlify.toml, so
// it serves the pages with no headers and the browser has nothing to violate.
//
// Not a *.test.ts file, so vitest does not collect it as a suite.

import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

import { headerRules, redirectRules, rule } from '../support/netlify-config';

const DIST_DIR = 'dist';

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

const filePathFor = (pathname: string): string => (pathname.endsWith('/') ? `${pathname}index.html` : pathname);

type Served = { readonly path: string; readonly body: Buffer };

async function readIfPresent(path: string): Promise<Served | null> {
  try {
    return { path, body: await readFile(join(DIST_DIR, normalize(path))) };
  } catch {
    return null;
  }
}

// `address()` is a string for a pipe or socket path; this server only ever
// listens on a TCP port, so anything else is a bug worth failing on.
const listen = (server: Server): Promise<number> =>
  new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        reject(new Error(`expected a TCP address, got ${String(address)}`));
        return;
      }
      resolve(address.port);
    });
  });

export async function serveBuiltSite(): Promise<BuiltSite> {
  const toml = await readFile('netlify.toml', 'utf8');
  const rules = headerRules(toml);
  const redirects = redirectRules(toml);
  const everyResponse = rule(rules, '/*');
  const hashedAssets = rule(rules, '/_astro/*');

  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const found = await readIfPresent(filePathFor(pathname));

    // A file beats an ordinary rule; a forced rule beats the file.
    const redirect = redirects.find((candidate) => candidate.from === pathname);
    if (redirect && (redirect.force || found === null)) {
      response.writeHead(redirect.status, { ...everyResponse, Location: redirect.to });
      response.end();
      return;
    }

    // Netlify's pretty URLs: a path with no file of its own, but a directory
    // holding an index.html, is 301'd to its trailing-slash form. It is how
    // /quiz reaches dist/quiz/index.html, and why a retired URL pointing at
    // /quiz takes two hops to arrive.
    if (found === null && !pathname.endsWith('/') && (await readIfPresent(`${pathname}/index.html`)) !== null) {
      response.writeHead(301, { ...everyResponse, Location: `${pathname}/` });
      response.end();
      return;
    }

    const served = found ?? { path: '/404.html', body: await readFile(join(DIST_DIR, '404.html')) };
    response.writeHead(found === null ? 404 : 200, {
      ...everyResponse,
      ...(pathname.startsWith('/_astro/') ? hashedAssets : {}),
      'Content-Type': CONTENT_TYPES[extname(served.path)] ?? 'application/octet-stream',
    });
    response.end(served.body);
  });

  const port = await listen(server);
  return {
    origin: `http://127.0.0.1:${port}`,
    headers: everyResponse,
    close: () => new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve()))),
  };
}
