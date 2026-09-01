/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config';

export default getViteConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/build/**/*.test.ts'],
    environment: 'node',
    // The club is in the UK and the streak day-number bug is a UK-timezone bug
    // (see tests/unit/streak-local-day.test.ts) — pin the test process to that zone
    // deterministically rather than relying on whatever zone the machine happens to be in.
    env: { TZ: 'Europe/London' },
  },
});
