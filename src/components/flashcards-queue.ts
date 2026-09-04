import type { Deck, TermPair } from '../data';

// The order a deck comes at a student in.
//
// Two rules, and the second depends on the first: shuffle, then bring forward the
// cards they keep missing. A card they got wrong three times should be the first
// thing they see; two cards they have missed equally often should come in a
// different order each time rather than in a fixed one.
//
// Pure, and the random source is a parameter — the same seam src/domain/store.ts
// uses for the clock, and for the same reason. Ordering that depends on
// Math.random can only be tested by observing it, and observing a shuffle is not
// something a browser test can do.

export const EVERYTHING = Symbol('everything');

// A student is either studying one deck or all of them. A symbol rather than null
// so the "all of them" case has a name at every call site, and rather than the
// legacy page's -1 index sentinel, which only worked because a name lookup for
// 'Everything' happened to miss.
export type DeckChoice = Deck | typeof EVERYTHING;

// The two sides resolved to strings. src/data types a card as `readonly string[]`,
// so indexing it yields `string | undefined`; narrowing here once keeps that out of
// the component, the tests and every assertion about ordering.
export type QueuedCard = { readonly front: string; readonly back: string; readonly category: string };

const queued = (card: TermPair, category: string): QueuedCard => ({
  front: card[0] ?? '',
  back: card[1] ?? '',
  category,
});

export function deckSize(deck: DeckChoice, decks: readonly Deck[]): number {
  return deck === EVERYTHING ? decks.reduce((total, each) => total + each.cards.length, 0) : deck.cards.length;
}

// Fisher-Yates, walking from the end, transcribed from the legacy page so that a
// given sequence of random numbers produces the same deck order it always did.
//
// It mutates, which the rest of this codebase does not — but only a copy it just
// made and still owns, and the alternative spellings of an in-place shuffle are
// all harder to check against the original.
function shuffled<T>(items: readonly T[], random: () => number): readonly T[] {
  const order = [...items];
  for (let index = order.length - 1; index > 0; index--) {
    const swap = Math.floor(random() * (index + 1));
    const held = order[index];
    const other = order[swap];
    if (held === undefined || other === undefined) continue;
    order[index] = other;
    order[swap] = held;
  }
  return order;
}

export function buildQueue(options: {
  readonly deck: DeckChoice;
  readonly decks?: readonly Deck[];
  readonly misses: Readonly<Record<string, number>>;
  readonly hash: (text: string) => string;
  readonly random: () => number;
}): readonly QueuedCard[] {
  const { deck, decks = [], misses, hash, random } = options;

  // Every card carries its OWN deck's name, so a student studying Everything can
  // still see where each card came from.
  const cards: readonly QueuedCard[] =
    deck === EVERYTHING
      ? decks.flatMap((each) => each.cards.map((card) => queued(card, each.name)))
      : deck.cards.map((card) => queued(card, deck.name));

  const missCount = (entry: QueuedCard) => misses[hash(entry.front)] ?? 0;

  // Sorting AFTER the shuffle, and relying on the sort being stable: cards with
  // equal miss counts — which is most of them, and all of them for a student who
  // has never pressed Again — keep the order the shuffle gave them. Sorting first,
  // or with an unstable sort, would hand every student the same deck order.
  // Array.prototype.sort has been required to be stable since ES2019.
  return [...shuffled(cards, random)].sort((left, right) => missCount(right) - missCount(left));
}
