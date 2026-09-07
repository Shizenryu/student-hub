import { describe, expect, it } from 'vitest';

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
} from '../../src/components/quiz-labels';
import { alwaysFirst, noShuffle } from './random-sources';

// Every sentence the quiz says, away from the browser. The island is then a
// question of which of these is shown when, which is what the browser suite is
// for --- these are the words themselves, transcribed from public/quiz.html.

describe('the question counter', () => {
  it('counts from one, not from zero', () => {
    expect(questionCounter(0, 10)).toBe('QUESTION 1 / 10');
    expect(questionCounter(9, 10)).toBe('QUESTION 10 / 10');
  });

  it('shows the running score beside it', () => {
    expect(liveScore(0)).toBe('SCORE 0');
    expect(liveScore(7)).toBe('SCORE 7');
  });
});

describe('DEFER(slice-8): DEFECT 2 --- the total a terminology round reports', () => {
  // A PIN, NOT A SPECIFICATION. quiz.html renders the constant N_Q while scoring
  // against the real queue length, so a terminology round drawn from a tier with
  // fewer than ten terms counts "QUESTION 3 / 10" and then finishes at "3 / 3".
  //
  // Unreachable today: the smallest tier pool is 13 terms. It bites the first time
  // a tier is edited below ten. The kumite renderer already uses the real length,
  // and that asymmetry is part of what is being ported.
  it('says ten for a terminology round however long the round really is', () => {
    expect(displayedTotal('terms', 4)).toBe(10);
    expect(displayedTotal('terms', 10)).toBe(10);
  });

  it('says the real length for a kumite round', () => {
    expect(displayedTotal('kumite', 4)).toBe(4);
    expect(displayedTotal('kumite', 10)).toBe(10);
  });

  it('scores against the real length in both modes, which is where the two disagree', () => {
    expect(finalScore(3, 3)).toBe('3 / 3');
    // Asymmetric on purpose: every other score in these suites is a perfect round,
    // and `score / total` reads identically to `total / score` when they are equal.
    expect(finalScore(7, 10)).toBe('7 / 10');
    expect(questionCounter(2, displayedTotal('terms', 3))).toBe('QUESTION 3 / 10');
  });
});

describe('answering', () => {
  it('names the answer when the student got it wrong', () => {
    expect(wrongAnswerFeedback('front kick')).toBe('Not quite — it means: front kick');
  });

  it('praises a right answer in one of four ways', () => {
    expect(praise(alwaysFirst)).toBe('Osu! Correct.');
    expect(praise(noShuffle)).toBe('Correct!');
  });

  it('calls out a run only once it is three long', () => {
    expect(streakRun(2)).toBe('');
    expect(streakRun(3)).toBe('\u{1F525} 3 in a row!');
    expect(streakRun(7)).toBe('\u{1F525} 7 in a row!');
  });
});

describe('the result screen', () => {
  it('bands the score, generously at the edges', () => {
    expect(rankFor(10, 10)).toBe('Perfect — grading standard!');
    expect(rankFor(8, 10)).toBe('Excellent — nearly there.');
    expect(rankFor(6, 10)).toBe('Good — keep polishing.');
    expect(rankFor(4, 10)).toBe('Coming along — train the words like techniques.');
    expect(rankFor(3, 10)).toBe('Every master was once a beginner. Again!');
  });

  it('quotes the maxim it drew', () => {
    expect(maximLine(['Structure first', 'Then discipline'], alwaysFirst)).toBe('“Structure first”');
    expect(maximLine(['Structure first', 'Then discipline'], noShuffle)).toBe('“Then discipline”');
  });

  it('announces a new personal best without repeating the number', () => {
    expect(progressLine({ newBest: true, best: 9, total: 10, streakCount: 1 })).toBe(
      'New personal best for this mode!  ·  Trained today ✓',
    );
  });

  it('shows the best still standing when the round did not beat it', () => {
    expect(progressLine({ newBest: false, best: 9, total: 10, streakCount: 1 })).toBe(
      'Your best for this mode: 9 / 10  ·  Trained today ✓',
    );
  });

  it('mentions a streak only from the second day', () => {
    expect(progressLine({ newBest: true, best: 5, total: 10, streakCount: 2 })).toBe(
      'New personal best for this mode!  ·  \u{1F525} 2-day streak',
    );
  });
});
