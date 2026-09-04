import { describe, expect, it } from 'vitest';

import { DECKS } from '../../src/data';
import type { Deck } from '../../src/data';
import { EVERYTHING, buildQueue, deckSize } from '../../src/components/flashcards-queue';

// The order a deck comes at a student in is the flashcards page's one piece of
// real cleverness, and it is invisible from the outside: the queue is shuffled,
// then sorted so the cards they keep missing come first — and because the sort is
// stable, cards they have missed equally often keep the order the shuffle gave
// them.
//
// None of that can be observed through a browser and a shuffled deck. So the
// builder takes its random source the way store.ts takes a clock, and these drive
// it with sources whose permutation is known.

// Small, obviously-ordered decks: real content would make an ordering assertion
// unreadable, and nothing here depends on what a card says.
const deckOf = (name: string, fronts: readonly string[]): Deck => ({
  id: name.toLowerCase(),
  name,
  cls: 'd1',
  cards: fronts.map((front) => [front, `${front} answered`] as const),
});

const fronts = (queue: ReturnType<typeof buildQueue>): readonly string[] =>
  queue.map((entry) => entry.card[0]);

// The legacy shuffle walks from the end, swapping each element with one at
// Math.floor(random() * (i + 1)). A source returning 0 therefore always picks
// index 0 — a known, complete reversal-free permutation rather than "some order".
const alwaysFirst = () => 0;

// Never swaps: Math.floor(random() * (i + 1)) === i for every i, so the deck comes
// out in its authored order. The clearest baseline for the sorting assertions.
const noShuffle = () => 0.999999;

describe('choosing a single deck', () => {
  it('offers every card in it, once', () => {
    const deck = deckOf('The Maxims', ['a', 'b', 'c']);

    const queue = buildQueue({ deck, misses: {}, hash: (text) => text, random: noShuffle });

    expect([...fronts(queue)].sort()).toEqual(['a', 'b', 'c']);
  });

  it('tags every card with the deck it came from', () => {
    const deck = deckOf('The Maxims', ['a', 'b']);

    const queue = buildQueue({ deck, misses: {}, hash: (text) => text, random: noShuffle });

    expect(queue.map((entry) => entry.category)).toEqual(['The Maxims', 'The Maxims']);
  });
});

describe('choosing Everything', () => {
  it('offers every card from every deck', () => {
    const decks = [deckOf('One', ['a', 'b']), deckOf('Two', ['c'])];

    const queue = buildQueue({ deck: EVERYTHING, decks, misses: {}, hash: (t) => t, random: noShuffle });

    expect([...fronts(queue)].sort()).toEqual(['a', 'b', 'c']);
  });

  it('tags each card with its OWN deck, not with Everything', () => {
    // The category shows on both faces of the card, so a student studying
    // Everything still sees which deck each card came from.
    const decks = [deckOf('One', ['a']), deckOf('Two', ['c'])];

    const queue = buildQueue({ deck: EVERYTHING, decks, misses: {}, hash: (t) => t, random: noShuffle });

    expect(queue.map((entry) => entry.category)).toEqual(['One', 'Two']);
  });
});

describe('cards the student keeps missing come first', () => {
  it('puts a more-missed card ahead of a less-missed one', () => {
    const deck = deckOf('The Maxims', ['a', 'b', 'c']);

    const queue = buildQueue({
      deck,
      misses: { a: 1, b: 3, c: 2 },
      hash: (text) => text,
      random: noShuffle,
    });

    expect(fronts(queue)).toEqual(['b', 'c', 'a']);
  });

  it('treats a card with no misses as zero rather than dropping it', () => {
    const deck = deckOf('The Maxims', ['a', 'b']);

    const queue = buildQueue({ deck, misses: { b: 1 }, hash: (text) => text, random: noShuffle });

    expect(fronts(queue)).toEqual(['b', 'a']);
  });

  it('keys misses by the hash of the card FRONT, as the store does', () => {
    // The miss queue is keyed by a hash of the front text — the same hash the
    // store uses when recording a grade. Keying by anything else silently empties
    // a queue a student has built up over months.
    const deck = deckOf('The Maxims', ['a', 'b']);

    const queue = buildQueue({
      deck,
      misses: { 'hashed:b': 5 },
      hash: (text) => `hashed:${text}`,
      random: noShuffle,
    });

    expect(fronts(queue)).toEqual(['b', 'a']);
  });

  it('leaves the shuffled order alone when nothing has been missed', () => {
    const deck = deckOf('The Maxims', ['a', 'b', 'c']);

    const queue = buildQueue({ deck, misses: {}, hash: (text) => text, random: noShuffle });

    expect(fronts(queue)).toEqual(['a', 'b', 'c']);
  });

  it('keeps equally-missed cards in the order the shuffle gave them', () => {
    // The stability claim, and the reason the sort must not be replaced with one
    // that reorders equal elements. With every card missed once, the sort has
    // nothing to order by, so the whole queue must come out exactly as the
    // shuffle left it — which alwaysFirst makes predictable.
    const deck = deckOf('The Maxims', ['a', 'b', 'c', 'd']);
    const shuffled = buildQueue({ deck, misses: {}, hash: (t) => t, random: alwaysFirst });

    const equallyMissed = buildQueue({
      deck,
      misses: { a: 1, b: 1, c: 1, d: 1 },
      hash: (text) => text,
      random: alwaysFirst,
    });

    expect(fronts(equallyMissed)).toEqual(fronts(shuffled));
  });
});

describe('the shuffle', () => {
  it('reorders the deck', () => {
    // Not an assertion about which order — that is the random source's business —
    // but that the source is consulted at all. A builder that ignored it would
    // return authored order here, and every student would meet the same deck in
    // the same sequence every time.
    const deck = deckOf('The Maxims', ['a', 'b', 'c', 'd', 'e']);

    const queue = buildQueue({ deck, misses: {}, hash: (t) => t, random: alwaysFirst });

    expect(fronts(queue)).not.toEqual(['a', 'b', 'c', 'd', 'e']);
    expect([...fronts(queue)].sort()).toEqual(['a', 'b', 'c', 'd', 'e']);
  });
});

describe('how many cards a deck holds', () => {
  it('counts a single deck', () => {
    expect(deckSize(deckOf('One', ['a', 'b']), [])).toBe(2);
  });

  it('counts every deck for Everything', () => {
    // The menu shows this beside the Everything button; against the real data it
    // is 61, and deriving it here rather than restating it is what keeps the menu
    // honest when a deck gains a card.
    expect(deckSize(EVERYTHING, DECKS)).toBe(DECKS.reduce((n, deck) => n + deck.cards.length, 0));
  });
});
