import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import { satteri } from '@astrojs/markdown-satteri';

import { assertContentIntegrity } from './src/data/integrity';
import { assertKataProseParity } from './src/data/kata-prose';
import { assertLegacyParity } from './src/data/parity';

export default defineConfig({
  output: 'static',
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
          await assertLegacyParity();
          await assertKataProseParity();
        },
      },
    },
  ],
});
