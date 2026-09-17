/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

// The deploy suite drives the BUILT site (dist/) in a real Chromium under the
// headers netlify.toml declares. It is its own config, not a third include in
// vitest.config.ts, so that `npm test` stays a Chromium-free node run: this
// one needs `npm run build` first and the browser `npx playwright install
// chromium` provides, and CI runs it after both.
export default defineConfig({
  test: {
    include: ['tests/deploy/**/*.test.ts'],
    environment: 'node',
    // One suite launching one browser and walking every page: a per-test
    // budget generous enough for a cold Chromium on a CI runner.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
