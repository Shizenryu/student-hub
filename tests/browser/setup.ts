import { beforeEach } from 'vitest';

// One student's browser per test. Without this, tests share localStorage and pass
// or fail depending on the order they happen to run in — which shows up as a flake
// weeks later rather than a failure now.
beforeEach(() => {
  localStorage.clear();
});
