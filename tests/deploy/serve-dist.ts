// Serves the built site the way Netlify will: every file under dist/, a
// directory's index.html at its trailing-slash URL, 404.html for anything else,
// and the headers netlify.toml declares on every response.
//
// Two honest limits. It applies the `/*` rule to its own 404 responses, which
// is an assumption about Netlify that only a curl against the live site can
// confirm (CLAUDE.md lists that check). And it serves only the canonical form
// of each URL: Netlify 301s /quiz to /quiz/, so a link written without the
// slash is a redirect in production, and this server answers it 404 rather
// than quietly serving what production would not.
//
// `astro preview` cannot stand in for this: it does not read netlify.toml, so
// it serves the pages with no headers and the browser has nothing to violate.
//
// Not a *.test.ts file, so vitest does not collect it as a suite.

import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

import { headerRules, rule } from '../support/netlify-headers';

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

async function readOr404(path: string): Promise<{ readonly path: string; readonly body: Buffer; readonly status: number }> {
  try {
    return { path, body: await readFile(join(DIST_DIR, normalize(path))), status: 200 };
  } catch {
    return { path: '/404.html', body: await readFile(join(DIST_DIR, '404.html')), status: 404 };
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
  const rules = headerRules(await readFile('netlify.toml', 'utf8'));
  const everyResponse = rule(rules, '/*');
  const hashedAssets = rule(rules, '/_astro/*');

  const server = createServer(async (request, response) => {
    const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
    const served = await readOr404(filePathFor(pathname));
    response.writeHead(served.status, {
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
