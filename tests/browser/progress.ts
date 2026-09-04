// Shared scaffolding for island tests that touch a student's stored progress.
//
// Browser tests cannot import tests/unit/store-fixtures.ts — that reads the
// filesystem at module scope to evaluate the legacy store — so this is the
// browser-side equivalent. Quiz and flashcards need all of it in slices 5 and 6.
//
// Not a *.test.tsx file, so vitest does not collect it; see the `include` glob in
// vitest.browser.config.ts.

// Restated rather than imported from src/domain/store.ts, which does not export
// it. This copy IS the pin on the key name: if production ever changes it without
// a migration, these tests must fail.
export const PROGRESS_KEY = 'shizenryu-progress-v1';

// The same local-calendar day number the store computes, derived here rather than
// imported so a seeded fixture cannot silently agree with a broken implementation.
export const today = (): number => {
  const now = new Date();
  return Math.floor(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86400000);
};

export const seed = (state: unknown): void => {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
};

// Deliberately returns unknown and does not sanitise. toEqual takes it happily,
// and a store that wrote something unexpected should fail showing what it wrote
// rather than being quietly normalised into an empty object first.
export const stored = (): unknown => JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? 'null');

// The element src/components/StreakChipSlot.astro renders and StreakChip.tsx
// portals into. A component test renders the island alone, so the page's own
// markup has to be stood up around it.
export const mountChipTarget = (): void => {
  document.getElementById('streakChip')?.remove();
  const chip = document.createElement('div');
  chip.id = 'streakChip';
  chip.className = 'streak-chip';
  document.body.append(chip);
};
