import { describe, expect, it } from 'vitest';

import { cardsToGo, completionMessage, completionSubline } from '../../src/components/flashcards-labels';

// The completion screen's wording, pinned in node. Reaching it in a browser means
// grading a whole deck, so the cheapest place to say exactly what it should read
// is here.

describe('finishing a deck', () => {
  it('counts the deck, not the number of grades', () => {
    // A card missed and seen again is graded twice but mastered once, so this is
    // the deck size rather than a tally of presses.
    expect(completionMessage(9)).toBe('Deck complete — 9 cards mastered.');
  });

  it('praises a clean pass', () => {
    expect(completionSubline(0, 0)).toBe('First pass, no repeats. Grading standard.');
  });

  it('says what will come round first next time', () => {
    expect(completionSubline(2, 0)).toBe(
      '2 cards needed a second look. They will come up first next time.',
    );
  });

  it('gets the singular right for one repeat', () => {
    expect(completionSubline(1, 0)).toBe('1 card needed a second look. They will come up first next time.');
  });
});

describe('the streak is mentioned only when it is one', () => {
  it('says nothing after a first day', () => {
    // One day is not a streak worth announcing, and saying so after every session
    // would make the word worthless.
    expect(completionSubline(0, 1)).toBe('First pass, no repeats. Grading standard.');
  });

  it('announces two days', () => {
    expect(completionSubline(0, 2)).toBe('First pass, no repeats. Grading standard. 🔥 2-day streak.');
  });

  it('appends to the repeats line too', () => {
    expect(completionSubline(1, 5)).toBe(
      '1 card needed a second look. They will come up first next time. 🔥 5-day streak.',
    );
  });
});

describe('the repeat count is a count of cards', () => {
  // The argument is how many DISTINCT cards were missed; the island keeps the set
  // and hands over its size, which tests/browser/flashcards.test.tsx proves with
  // one card missed three times. Here, three means three cards.
  it('reports three cards that each needed a second look', () => {
    expect(completionSubline(3, 0)).toBe(
      '3 cards needed a second look. They will come up first next time.',
    );
  });
});

describe('how many are left', () => {
  it('counts what is still in the queue', () => {
    expect(cardsToGo(9)).toBe('9 TO GO');
  });

  it('does not stop at one', () => {
    // Shown above the last card, so it reads "1 TO GO" rather than being hidden.
    expect(cardsToGo(1)).toBe('1 TO GO');
  });
});
