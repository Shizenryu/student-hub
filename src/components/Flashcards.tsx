import { useCallback, useState } from 'react';

import type { Deck } from '../data';
import { EVERYTHING, buildQueue, deckName, totalCards } from '../domain/flashcards-queue';
import type { DeckChoice, QueuedCard } from '../domain/flashcards-queue';
import StreakChip from './StreakChip';
import { cardsToGo, completionMessage, completionSubline } from './flashcards-labels';
import { NO_STREAK } from './streak-label';
import type { StreakView } from './streak-label';
import { useBrowserStore } from './use-browser-store';

// The philosophy flashcards, ported from the hand-written public/flashcards.html
// that this route replaced.
//
// Three screens — pick a deck, study it, finish it — all derived from one session
// value, so there is no way to be on two at once. An empty queue IS the finished
// state. The legacy page toggled a `hidden` class on three divs.

type Props = { readonly decks: readonly Deck[] };

type Session = {
  readonly deck: DeckChoice;
  readonly queue: readonly QueuedCard[];
  readonly total: number;
  // Presses of Again, not distinct cards — see flashcards-labels.ts, where the
  // sentence this feeds is registered as defect 6.
  readonly laps: number;
};

export default function Flashcards({ decks }: Props) {
  const store = useBrowserStore();
  const [session, setSession] = useState<Session | null>(null);
  const [streak, setStreak] = useState<StreakView | null>(null);

  // Read once, when the store stops being null. Setting state during render is
  // React's documented way to derive from a changed input without a second effect
  // and a second paint; Practice.tsx does the same, and two islands solving one
  // problem two different ways is how slice 6 ends up guessing which is meant.
  if (store !== null && streak === null) {
    setStreak(store.streakInfo());
  }

  // How many times the card has been turned, rather than two booleans that have to
  // be reset in step. Odd means the answer is showing; anything above zero means it
  // has been seen at least once — which is what the grading buttons depend on,
  // because the legacy page's flip() only ever REVEALED them. A student who flips
  // back to re-read the question keeps them.
  const [flips, setFlips] = useState(0);
  const flipped = flips % 2 === 1;
  const revealed = flips > 0;

  const start = useCallback(
    (deck: DeckChoice) => {
      if (store === null) return;
      const queue = buildQueue({
        deck,
        decks,
        misses: store.misses(),
        hash: store.hash,
        random: Math.random,
      });
      setSession({ deck, queue, total: queue.length, laps: 0 });
      setFlips(0);
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
      const queue = gotIt ? rest : [...rest, current];
      const laps = gotIt ? session.laps : session.laps + 1;
      setFlips(0);
      setSession({ ...session, queue, laps });

      if (queue.length === 0) {
        store.logPractice('philosophy');
        const marked = store.markTrained();
        setStreak({ count: marked.count, today: marked.today });
      }
    },
    [session, store],
  );

  const shownStreak = streak ?? NO_STREAK;
  const current = session?.queue[0];

  const body =
    session === null ? (
      <>
        <p className="intro">
          Read the front, answer in your head, tap to flip.
          <br />
          <b>Got it</b> retires the card — <b>Again</b> sends it to the back of the pile.
        </p>
        <div className="decks">
          {decks.map((deck) => (
            <button key={deck.id} type="button" className={`deck-btn ${deck.cls}`} onClick={() => start(deck)}>
              {deck.name}
              {/* One expression, not `{n} cards`: React separates adjacent text
                  nodes with an empty comment, which splits the text run and changes
                  how the browser shapes it. Invisible to a reader, but enough to
                  stop the page matching the one it replaced pixel for pixel.
                  tests/build/flashcards-route.test.ts is what keeps it that way. */}
              <small>{`${deck.cards.length} cards`}</small>
            </button>
          ))}
          <button type="button" className="deck-btn d7" onClick={() => start(EVERYTHING)}>
            {deckName(EVERYTHING)}
            <small>{`${totalCards(decks)} cards`}</small>
          </button>
        </div>
      </>
    ) : session.queue.length === 0 ? (
      <>
        <div className="done-big">☯</div>
        <div className="done-msg">{completionMessage(session.total)}</div>
        <div className="done-sub">{completionSubline(session.laps, shownStreak.count)}</div>
        <button type="button" className="next-btn" onClick={() => start(session.deck)}>
          Study again
        </button>
        <button type="button" className="home-link" onClick={() => setSession(null)}>
          ← back to decks
        </button>
      </>
    ) : (
      <>
        <div className="meta">
          <span>{deckName(session.deck).toUpperCase()}</span>
          <span>{cardsToGo(session.queue.length)}</span>
        </div>
        <div className="scene">
          {/* A button, where the page this replaced used a div with an onclick:
              flipping is the only way to see an answer, so on a div the page cannot
              be used from a keyboard at all. flashcards.css strips it back to what
              the div rendered as, and the pixel comparison is what says it does. */}
          <button type="button" className={flipped ? 'flash flipped' : 'flash'} onClick={() => setFlips(flips + 1)}>
            {/* Both faces are always in the DOM — that is how the 3D flip works —
                and backface-visibility hides the far one from the eye but not from
                assistive technology. Without this the button's accessible name is
                question AND answer, so a screen-reader user is told the answer on
                focus and the exercise is pointless. Changes no pixels. */}
            <div className="face front" aria-hidden={flipped}>
              <div className="cat">{current?.category}</div>
              <div className="txt">{current?.front}</div>
              <div className="tapnote">TAP TO REVEAL</div>
            </div>
            <div className="face back" aria-hidden={!flipped}>
              <div className="cat">{current?.category}</div>
              <div className="txt">{current?.back}</div>
            </div>
          </button>
        </div>
        <div className={revealed ? 'btns' : 'btns hide'}>
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
      </>
    );

  return (
    <>
      <div className="card card-roomy">{body}</div>
      <StreakChip streak={shownStreak} />
    </>
  );
}
