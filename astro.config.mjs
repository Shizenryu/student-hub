import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { satteri } from '@astrojs/markdown-satteri';

import { assertContentIntegrity } from './src/data/integrity';
import { assertKataProseParity } from './src/data/kata-prose';

export default defineConfig({
  output: 'static',
  // The half of the Content-Security-Policy that needs per-page hashes. Astro
  // computes them at build time — for its own island bootstrap scripts, the
  // one <style> it injects on island pages, and every stylesheet it inlines —
  // and writes the policy as a <meta> on every page, the 404 included. Nothing
  // is copied by hand, so an Astro upgrade cannot leave a stale hash behind.
  //
  // A <meta> cannot carry frame-ancestors, so that directive and the other
  // hardening headers are sent by netlify.toml. Two policies intersect; nothing
  // loosens. The resources are exactly what the site loads: same-origin
  // scripts, stylesheets and images, and nothing else at all. Both halves are
  // pinned by tests/build/security-headers.test.ts and proven in Chromium by
  // tests/deploy/csp-violations.test.ts.
  security: {
    csp: {
      directives: ["default-src 'none'", "img-src 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'"],
      scriptDirective: { resources: ["'self'"] },
      styleDirective: { resources: ["'self'"] },
    },
  },
  // Astro's markdown default silently rewrites straight quotes/apostrophes to
  // curly ones at render time. public/kata.html (and every other legacy page
  // still being migrated) injects its authored HTML with innerHTML, so the
  // browser shows the literal ASCII characters written in data.js/the source
  // markdown — a migrated route must show exactly the same characters, not a
  // typographically "improved" copy of Ian Smith's prose.
  //
  // This turns off smart punctuation only, on Sätteri (Astro's default
  // processor as of this version) explicitly, rather than the deprecated
  // top-level `markdown.smartypants` flag — that flag is scheduled for
  // removal, and losing it silently in some future Astro upgrade would mean
  // the prose quietly regains curly quotes with no warning. `features` here
  // is a partial override (every field defaults to Astro's normal value when
  // omitted, per @astrojs/markdown-satteri's SatteriFeatures type), so gfm is
  // deliberately left unset — it stays at its existing default rather than
  // being pinned to a value nothing has asked for or verified.
  markdown: {
    processor: satteri({ features: { smartPunctuation: false } }),
  },
  integrations: [
    react(),
    {
      name: 'content-integrity',
      hooks: {
        'astro:build:start': async () => {
          assertContentIntegrity();
          await assertKataProseParity();
        },
      },
    },
  ],
});
