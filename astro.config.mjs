import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

import { assertContentIntegrity } from './src/data/integrity';
import { assertLegacyParity } from './src/data/parity';

export default defineConfig({
  output: 'static',
  // smartypants is Astro's markdown default and silently rewrites straight
  // quotes/apostrophes to curly ones at render time. public/kata.html (and
  // every other legacy page still being migrated) injects its authored HTML
  // with innerHTML, so the browser shows the literal ASCII characters written
  // in data.js/the source markdown — a migrated route must show exactly the
  // same characters, not a typographically "improved" copy of Ian Smith's
  // prose. Set once here, not per-render, so every future markdown-backed
  // page migration inherits it rather than re-discovering this bug.
  markdown: {
    smartypants: false,
  },
  integrations: [
    react(),
    {
      name: 'content-integrity',
      hooks: {
        'astro:build:start': async () => {
          assertContentIntegrity();
          await assertLegacyParity();
        },
      },
    },
  ],
});
