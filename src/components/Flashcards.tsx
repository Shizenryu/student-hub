import { useCallback, useEffect, useState } from 'react';

import type { Deck } from '../data';
import StreakChip from './StreakChip';
import { cardsToGo, completionMessage, completionSubline } from './flashcards-labels';
import { EVERYTHING, buildQueue, deckSize } from './flashcards-queue';
import type { DeckChoice, QueuedCard } from './flashcards-queue';
import type { StreakView } from './practice-labels';
import { useBrowserStore } from './use-browser-store';

// The philosophy flashcards, ported from the hand-written public/flashcards.html
// that this route replaced.
//
// Three screens — pick a deck, study it, finish it — and which one is showing is
// derived from the session rather than tracked separately, so there is no way to
// be on two at once. The legacy page toggled a `hidden` class on three divs.

type Props = { readonly decks: readonly Deck[] };

type Session = {
  readonly deck: DeckChoice;
  readonly name: string;
  readonly queue: readonly QueuedCard[];
  readonly total: number;
  // Presses of Again, not distinct cards — see flashcards-labels.ts, where the
  // sentence this feeds is documented as a defect slice 8 owns.
  readonly laps: number;
};

type Finished = { readonly deck: DeckChoice; readonly name: string; readonly total: number; readonly laps: number };

const NO_STREAK: StreakView = { count: 0, today: false };

export default function Flashcards({ decks }: Props) {
  const store = useBrowserStore();
  const [session, setSession] = useState<Session | null>(null);
  const [finished, setFinished] = useState<Finished | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [streak, setStreak] = useState<StreakView>(NO_STREAK);

  // The chip shows the streak as it stood when the page opened, and again after a
  // deck is completed — the two moments the legacy page refreshed it.
  useEffect(() => {
    if (store !== null) setStreak(store.streakInfo());
  }, [store]);

  const start = useCallback(
    (deck: DeckChoice, name: string) => {
      if (store === null) return;
      const queue = buildQueue({
        deck,
        decks,
        misses: store.misses(),
        hash: store.hash,
        random: Math.random,
      });
      setSession({ deck, name, queue, total: queue.length, laps: 0 });
      setFinished(null);
      setFlipped(false);
    },
    [decks, store],
  );

  const grade = useCallback(
    (gotIt: boolean) => {
      if (store === null || session === null) return;
      const [current, ...rest] = session.queue;
      if (current === undefined) return;

      store.recordCard(store.hash(current.front), gotIt);

      // Got it retires the card; Again sends it to the back, so the deck is only
      // finished when every card has been got at least once.
      const remaining = gotIt ? rest : [...rest, current];
      const laps = gotIt ? session.laps : session.laps + 1;
      setFlipped(false);

      if (remaining.length > 0) {
        setSession({ ...session, queue: remaining, laps });
        return;
      }

      store.logPractice('philosophy');
      const marked = store.markTrained();
      setStreak({ count: marked.count, today: marked.today });
      setSession(null);
      setFinished({ deck: session.deck, name: session.name, total: session.total, laps });
    },
    [session, store],
  );

  if (finished !== null) {
    return (
      <>
        <div className="card-ui">
          <div className="done-big">☯</div>
          <div className="done-msg">{completionMessage(finished.total)}</div>
          <div className="done-sub">{completionSubline(finished.laps, streak.count)}</div>
          <button type="button" className="next-btn" onClick={() => start(finished.deck, finished.name)}>
            Study again
          </button>
          <button type="button" className="home-link" onClick={() => setFinished(null)}>
            ← back to decks
          </button>
        </div>
        <StreakChip streak={streak} />
      </>
    );
  }

  if (session !== null) {
    const current = session.queue[0];
    return (
      <>
        <div className="card-ui">
          <div className="meta">
            <span>{session.name.toUpperCase()}</span>
            <span>{cardsToGo(session.queue.length)}</span>
          </div>
          <div className="scene">
            {/* A button rather than the legacy page's <div onclick>: this is the
                only way to see the answer, so on a div it is unreachable by
                keyboard and the page simply cannot be used. It renders identically
                — the reset below strips the button's own styling. */}
            <button
              type="button"
              className={flipped ? 'flash flipped' : 'flash'}
              aria-pressed={flipped}
              onClick={() => setFlipped(!flipped)}
            >
              <div className="face front">
                <div className="cat">{current?.category}</div>
                <div className="txt">{current?.front}</div>
                <div className="tapnote">TAP TO REVEAL</div>
              </div>
              <div className="face back">
                <div className="cat">{current?.category}</div>
                <div className="txt">{current?.back}</div>
              </div>
            </button>
          </div>
          <div className={flipped ? 'btns' : 'btns hide'}>
            <button type="button" className="again" onClick={() => grade(false)}>
              Again
            </button>
            <button type="button" className="got" onClick={() => grade(true)}>
              Got it
            </button>
          </div>
          <button type="button" className="home-link" onClick={() => setSession(null)}>
            ← back to decks
          </button>
        </div>
        <StreakChip streak={streak} />
      </>
    );
  }

  const everythingTotal = deckSize(EVERYTHING, decks);
  return (
    <>
      <div className="card-ui">
        <p className="intro">
          Read the front, answer in your head, tap to flip.
          <br />
          <b>Got it</b> retires the card — <b>Again</b> sends it to the back of the pile.
        </p>
        <div className="decks">
          {decks.map((deck) => (
            <button
              key={deck.id}
              type="button"
              className={`deck-btn ${deck.cls}`}
              onClick={() => start(deck, deck.name)}
            >
              {deck.name}
              <small>{deck.cards.length} cards</small>
            </button>
          ))}
          <button type="button" className="deck-btn d7" onClick={() => start(EVERYTHING, 'Everything')}>
            Everything
            <small>{everythingTotal} cards</small>
          </button>
        </div>
      </div>
      <StreakChip streak={streak} />
    </>
  );
}
