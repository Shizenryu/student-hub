import { ROUND_LENGTH } from '../domain/quiz-questions';
import type { Round } from '../domain/quiz-questions';

// Everything the quiz says, transcribed from public/quiz.html, as pure functions —
// the same split as practice-labels.ts and flashcards-labels.ts, and for the same
// reason: the wording is worth pinning in node rather than only through a browser
// flow that has to answer ten questions to reach the last sentence.

export const questionCounter = (index: number, total: number): string => `QUESTION ${index + 1} / ${total}`;

export const liveScore = (score: number): string => `SCORE ${score}`;

// DEFER(slice-8): DEFECT 2. The progress line and the bar are drawn against the
// CONSTANT in terminology mode and against the real queue length in kumite mode —
// quiz.html's renderQ() uses N_Q where renderK() uses kqs.length — while both
// modes finish by scoring against the real length. So a terminology round drawn
// from a tier of fewer than ten terms counts up to "/ 10" and then reports "4 / 4".
//
// Unreachable today: the smallest tier pool is 13 terms, so a round is always ten
// and the constant is right. It bites the first time a tier is edited below ten.
// Ported unchanged; pinned in tests/unit/quiz-labels.test.ts.
export const displayedTotal = (mode: Round['mode'], questionCount: number): number =>
  mode === 'terms' ? ROUND_LENGTH : questionCount;

export const finalScore = (score: number, total: number): string => `${score} / ${total}`;

export const wrongAnswerFeedback = (correct: string): string => `Not quite — it means: ${correct}`;

// Four of them, drawn per answer. The student sees roughly ten of these a round, so
// one line would wear out inside a single session.
const PRAISE = ['Osu! Correct.', 'Yes — well done.', 'Sharp. Correct.', 'Correct!'] as const;

export const praise = (random: () => number): string =>
  PRAISE[Math.floor(random() * PRAISE.length)] ?? PRAISE[0];

// Three in a row before it is worth saying, matching the flashcards' rule that one
// day is not yet a streak: a run called out at two would be called out constantly.
export const streakRun = (run: number): string => (run >= 3 ? `\u{1F525} ${run} in a row!` : '');

// Bands, not a formula: the wording is the point. Read top-down — the first band a
// score reaches is the one it gets — which is how quiz.html's chain of ternaries
// behaved, and why 0.8 lands in "Excellent" rather than "Good".
export function rankFor(score: number, total: number): string {
  const share = score / total;
  if (share === 1) return 'Perfect — grading standard!';
  if (share >= 0.8) return 'Excellent — nearly there.';
  if (share >= 0.6) return 'Good — keep polishing.';
  if (share >= 0.4) return 'Coming along — train the words like techniques.';
  return 'Every master was once a beginner. Again!';
}

// Curly quotes, in the string rather than the stylesheet, because that is where
// quiz.html put them and this has to render the same characters.
export const maximLine = (maxims: readonly string[], random: () => number): string =>
  `“${maxims[Math.floor(random() * maxims.length)] ?? ''}”`;

// The two halves of the result's gold line: how this round compares with the
// student's best, and whether today counts. Joined with two spaces either side of
// the middot, as the page has always written it.
export function progressLine(options: {
  readonly newBest: boolean;
  readonly best: number;
  readonly total: number;
  readonly streakCount: number;
}): string {
  const { newBest, best, total, streakCount } = options;
  const bestLine = newBest ? 'New personal best for this mode!' : `Your best for this mode: ${best} / ${total}`;
  const dayLine = streakCount >= 2 ? `\u{1F525} ${streakCount}-day streak` : 'Trained today ✓';
  return `${bestLine}  ·  ${dayLine}`;
}
