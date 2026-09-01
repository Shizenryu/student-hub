import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

import { assertContentIntegrity } from './src/data/integrity';
import { assertLegacyParity } from './src/data/parity';

export default defineConfig({
  output: 'static',
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
