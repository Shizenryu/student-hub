// The strings the flashcards completion screen shows, as pure functions — the same
// split as practice-labels.ts, and for the same reason: the wording is worth
// pinning in node rather than only through a long browser flow that has to grade
// an entire deck to reach it.

export const completionMessage = (total: number): string => `Deck complete — ${total} cards mastered.`;

// `missedCards` is a count of DISTINCT cards, not of presses of Again: a card
// missed three times is one card that needed a second look. The island keeps the
// set; this only words its size.
const repeats = (missedCards: number): string =>
  missedCards === 0
    ? 'First pass, no repeats. Grading standard.'
    : `${missedCards} card${missedCards === 1 ? '' : 's'} needed a second look. They will come up first next time.`;

// The streak is mentioned only from two days: one day is not yet a streak, and
// saying so after every single session would make the word worthless.
const streakNote = (count: number): string => (count >= 2 ? ` 🔥 ${count}-day streak.` : '');

export const completionSubline = (missedCards: number, streakCount: number): string =>
  `${repeats(missedCards)}${streakNote(streakCount)}`;

export const cardsToGo = (remaining: number): string => `${remaining} TO GO`;
