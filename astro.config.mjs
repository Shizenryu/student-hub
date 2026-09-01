import { defineConfig } from 'astro/config';
import react from '@astrojs/react';

import { assertContentIntegrity } from './src/data/integrity';

export default defineConfig({
  output: 'static',
  integrations: [
    react(),
    {
      name: 'content-integrity',
      hooks: { 'astro:build:start': () => assertContentIntegrity() },
    },
  ],
});
