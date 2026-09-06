import { useCallback, useState } from 'react';

import type { Kumite, TermPair } from '../data';
import { kumiteRound, termsRound } from '../domain/quiz-questions';
import type { Round } from '../domain/quiz-questions';
import StreakChip from './StreakChip';
import {
  displayedTotal,
  finalScore,
  liveScore,
  maximLine,
  praise,
  progressLine,
  questionCounter,
  rankFor,
  streakRun,
  wrongAnswerFeedback,
} from './quiz-labels';
import { NO_STREAK } from './streak-label';
import type { StreakView } from './streak-label';
import { useBrowserStore } from './use-browser-store';

// The dojo quiz, ported from the hand-written public/quiz.html this route replaced —
// the last page of the migration.
//
// Three screens — choose a round, answer it, see how it went — all derived from one
// session value, so there is no way to be on two at once. No session is the menu; a
// session whose index has run past its questions is the result. The legacy page
// toggled a `hidden` class on three divs.
//
// Which questions a round contains is not decided here: src/domain/quiz-questions.ts
// owns that, takes its random source injected, and is where the three latent defects
// are pinned. This file is the screens and the scoring.

type Props = {
  readonly terms: Readonly<Record<string, readonly TermPair[]>>;
  readonly kumite: readonly Kumite[];
  readonly maxims: readonly string[];
};

// What was chosen from the menu, kept for the whole session so "Train again" repeats
// the same round rather than dropping back to a default. The legacy page kept `level`
// and `krange` in two module-level variables and read whichever matched `mode`.
type Choice = { readonly mode: 'terms'; readonly level: number } | { readonly mode: 'kumite'; readonly upTo: number };

// The chosen option's POSITION, not its text. A question can offer the same text
// twice — that is defect 1 — and only the position says which button was pressed.
type Answered = { readonly option: number; readonly right: boolean; readonly feedback: string };

// Settled once, when the round ends, rather than derived while rendering the result:
// the maxim is drawn at random and the best score is read after it has been written,
// so both would change under a re-render that is meant to change nothing.
type Outcome = {
  readonly newBest: boolean;
  readonly best: number;
  readonly maxim: string;
  readonly streakCount: number;
};

// Two shapes, not one with an optional outcome, because a round that is over and a
// round in progress are different things and nothing should be able to be both.
//
// The first version of this derived the result screen from "there is no question at
// this index", which looked equivalent and was not: a round that ended one question
// early left a question still sitting at that index, so the page went on asking and
// finished twice — marking the day and logging the practice twice with it. The
// mutation gate caught it. `kind` is now the only thing that decides the screen.
type Session =
  | {
      readonly kind: 'round';
      readonly choice: Choice;
      readonly round: Round;
      readonly index: number;
      readonly score: number;
      readonly run: number;
      readonly answered: Answered | null;
    }
  | {
      readonly kind: 'result';
      readonly choice: Choice;
      readonly score: number;
      readonly total: number;
      readonly outcome: Outcome;
    };

type MenuEntry = { readonly choice: Choice; readonly name: string; readonly detail: string; readonly cls: string };

const LEVELS: readonly MenuEntry[] = [
  { choice: { mode: 'terms', level: 1 }, name: 'Beginner', detail: 'Red & Orange · 9th–8th Kyu', cls: 'b1' },
  { choice: { mode: 'terms', level: 2 }, name: 'Intermediate', detail: 'Yellow & Green · 7th–6th Kyu', cls: 'b2' },
  { choice: { mode: 'terms', level: 3 }, name: 'Advanced', detail: 'Blue & Purple · 5th–4th Kyu', cls: 'b3' },
  { choice: { mode: 'terms', level: 4 }, name: 'Brown & Black', detail: '3rd Kyu — Dan grades', cls: 'b4' },
  // Level 0 is "everything", which quiz-questions reads as all four tiers.
  { choice: { mode: 'terms', level: 0 }, name: 'Everything', detail: 'Full syllabus, all terms', cls: 'b5' },
];

const RANGES: readonly MenuEntry[] = [
  { choice: { mode: 'kumite', upTo: 6 }, name: 'Kumite 1–6', detail: 'Red to Green belt', cls: 'b2' },
  { choice: { mode: 'kumite', upTo: 12 }, name: 'Kumite 1–12', detail: 'The full set', cls: 'b4' },
];

export default function Quiz({ terms, kumite, maxims }: Props) {
  const store = useBrowserStore();
  const [session, setSession] = useState<Session | null>(null);
  const [streak, setStreak] = useState<StreakView | null>(null);

  // DEFER(slice-8): DEFECT 7. The run line is its own state, and is deliberately NOT
  // cleared when a round starts — because quiz.html does not clear it either. That
  // page writes '#streak' only from answer(), and renderQ() leaves it alone, so the
  // "N in a row!" a student earned on the last answer of one round is still on
  // screen for the first, unanswered question of the next, claiming a run that has
  // already been reset to zero.
  //
  // Unlike the other three this one is reachable today: end a round on a run of
  // three and tap "Train again". Ported unchanged rather than quietly fixed, because
  // a port whose diff also contains repairs cannot be reviewed as a port. Pinned in
  // tests/browser/quiz.test.tsx; slice 8 owns the fix, which is one line here.
  const [runLine, setRunLine] = useState('');

  // Read once, when the store stops being null — the same shape as Flashcards.tsx,
  // deliberately, so two islands do not solve one problem two ways.
  if (store !== null && streak === null) {
    setStreak(store.streakInfo());
  }

  const start = useCallback(
    (choice: Choice) => {
      const round =
        choice.mode === 'terms'
          ? termsRound({ terms, level: choice.level, random: Math.random })
          : kumiteRound({ kumite, upTo: choice.upTo, random: Math.random });

      setSession({ kind: 'round', choice, round, index: 0, score: 0, run: 0, answered: null });
    },
    [kumite, terms],
  );

  const respond = useCallback(
    (option: number) => {
      // No guard against answering twice: the options are `disabled` the moment one
      // is taken, and a disabled button fires no click. A second condition here
      // would be unreachable, and the mutation gate would have nothing to kill.
      if (session?.kind !== 'round') return;
      const question = session.round.questions[session.index];
      if (question === undefined) return;

      const right = question.options[option] === question.correct;
      const run = right ? session.run + 1 : 0;

      setSession({
        ...session,
        score: right ? session.score + 1 : session.score,
        run,
        answered: {
          option,
          right,
          feedback: right ? praise(Math.random) : wrongAnswerFeedback(question.correct),
        },
      });
      setRunLine(streakRun(run));
    },
    [session],
  );

  const next = useCallback(() => {
    // The store is bound in an effect, so it is null only before the first paint
    // after hydration — and nothing here can be pressed until a round has been
    // started, which needs that paint. Guarded the way the other two islands guard,
    // rather than left to be discovered.
    if (session?.kind !== 'round' || store === null) return;

    const index = session.index + 1;
    const total = session.round.questions.length;
    if (index < total) {
      setSession({ ...session, index, answered: null });
      return;
    }

    const { bestKey, mode } = session.round;
    const newBest = store.setBest(bestKey, session.score);
    store.logPractice(mode);
    const marked = store.markTrained();
    setStreak({ count: marked.count, today: marked.today });

    setSession({
      kind: 'result',
      choice: session.choice,
      score: session.score,
      total,
      outcome: {
        newBest,
        best: store.best(bestKey),
        maxim: maximLine(maxims, Math.random),
        streakCount: marked.count,
      },
    });
  }, [maxims, session, store]);

  // Undefined outside a round, and — as a typing artefact of indexing an array —
  // possibly undefined inside one too. The screen does not depend on it; see the
  // note on Session.
  const question = session?.kind === 'round' ? session.round.questions[session.index] : undefined;

  const menu = (
    <>
      <p className="intro">10 questions. Choose your level — each level includes everything below it.</p>
      <div className="belts">
        {LEVELS.map((entry) => (
          <MenuButton key={entry.name} entry={entry} onChoose={start} />
        ))}
      </div>
      <div className="modehead">Kumite Sequences</div>
      <p className="kumite-lede">What comes next? Which kumite is it? Same side or opposite side?</p>
      <div className="belts">
        {RANGES.map((entry) => (
          <MenuButton key={entry.name} entry={entry} onChoose={start} />
        ))}
      </div>
    </>
  );

  const body =
    session === null ? (
      menu
    ) : session.kind === 'result' ? (
      <>
        <div className="score-big">{finalScore(session.score, session.total)}</div>
        <div className="rank">{rankFor(session.score, session.total)}</div>
        <div className="progress-line">
          {progressLine({
            newBest: session.outcome.newBest,
            best: session.outcome.best,
            total: session.total,
            streakCount: session.outcome.streakCount,
          })}
        </div>
        <div className="maxim">
          <span>Maxim of Shizenryu</span>
          <em>{session.outcome.maxim}</em>
        </div>
        <button type="button" className="next-btn" onClick={() => start(session.choice)}>
          Train again
        </button>
        <button type="button" className="home-btn" onClick={() => setSession(null)}>
          Change level
        </button>
      </>
    ) : (
      <>
        <div className="qcount">
          <span>{questionCounter(session.index, displayedTotal(session.round.mode, session.round.questions.length))}</span>
          <span>{liveScore(session.score)}</span>
        </div>
        <div className="progress">
          {/* Assigned through the CSSOM, not written as a style attribute: see the
              note on `.progress div` in quiz.css. The denominator is the DISPLAYED
              total, which in terminology mode is the constant — that is defect 2,
              and the bar carries it as faithfully as the counter above does. */}
          <div
            style={{
              width: `${(session.index / displayedTotal(session.round.mode, session.round.questions.length)) * 100}%`,
            }}
          />
        </div>
        <div className={session.round.mode === 'kumite' ? 'jp seq' : 'jp'}>{question?.prompt}</div>
        <div className="hint">{question?.hint}</div>
        <div className="opts">
          {(question?.options ?? []).map((option, position) => (
            <button
              // Position, not text: a question can offer the same text twice, which
              // is defect 1, and React needs to tell those two buttons apart.
              key={position}
              type="button"
              className={optionClass(option, position, question?.correct ?? '', session.answered)}
              disabled={session.answered !== null}
              onClick={() => respond(position)}
            >
              {option}
            </button>
          ))}
        </div>
        <div className={session.answered === null ? 'feedback' : `feedback ${session.answered.right ? 'good' : 'bad'}`}>
          {session.answered?.feedback}
        </div>
        <div className="streak">{runLine}</div>
        {session.answered !== null && (
          <button type="button" className="next-btn" onClick={next}>
            Next
          </button>
        )}
      </>
    );

  return (
    <>
      <div className="card card-roomy">{body}</div>
      <StreakChip streak={streak ?? NO_STREAK} />
    </>
  );
}

// DEFER(slice-8): DEFECT 1. EVERY option whose text matches the answer is marked
// correct, which is how a question that offers the same gloss twice ends up showing
// two right answers. Matching on position instead would mark one button and quietly
// repair the defect during the port. Pinned in tests/unit/quiz-questions.test.ts.
function optionClass(option: string, position: number, correct: string, answered: Answered | null): string {
  if (answered === null) return 'opt';
  if (option === correct) return 'opt correct';
  return answered.option === position ? 'opt wrong' : 'opt';
}

// The level and range buttons are the same button. One expression for the label and
// its trailing space, not `{name} <small>`: React separates adjacent text nodes with
// an empty comment, which splits the text run and changes how the browser shapes it
// — invisible to a reader, and enough to stop the page matching the one it replaced
// pixel for pixel. tests/build/quiz-route.test.ts is what keeps it that way.
function MenuButton({ entry, onChoose }: { readonly entry: MenuEntry; readonly onChoose: (choice: Choice) => void }) {
  return (
    <button type="button" className={`belt-btn ${entry.cls}`} onClick={() => onChoose(entry.choice)}>
      {`${entry.name} `}
      <small>{entry.detail}</small>
    </button>
  );
}
