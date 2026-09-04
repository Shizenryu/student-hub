// The strings the flashcards completion screen shows, as pure functions — the same
// split as practice-labels.ts, and for the same reason: the wording is worth
// pinning in node rather than only through a long browser flow that has to grade
// an entire deck to reach it.

export const completionMessage = (total: number): string => `Deck complete — ${total} cards mastered.`;

// KNOWN DEFECT, ported unchanged and pinned in tests/unit/flashcards-labels.test.ts.
//
// `laps` counts presses of Again, not distinct cards. A student who misses the
// same card three times is told "3 cards needed a second look" when it was one
// card, three times. The sentence has said that since the page was written.
//
// Slice 8 owns the fix, one RED->GREEN commit, so that "we ported it" and "we
// changed it" never share a diff.
const repeats = (laps: number): string =>
  laps === 0
    ? 'First pass, no repeats. Grading standard.'
    : `${laps} card${laps === 1 ? '' : 's'} needed a second look. They will come up first next time.`;

// The streak is mentioned only from two days: one day is not yet a streak, and
// saying so after every single session would make the word worthless.
const streakNote = (count: number): string => (count >= 2 ? ` 🔥 ${count}-day streak.` : '');

export const completionSubline = (laps: number, streakCount: number): string =>
  `${repeats(laps)}${streakNote(streakCount)}`;

export const cardsToGo = (remaining: number): string => `${remaining} TO GO`;
