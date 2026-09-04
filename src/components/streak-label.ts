// The streak chip's own vocabulary, beside the three files that render it.
//
// It lived in practice-labels.ts, because practice was the first island to show a
// chip. Nothing about it is practice-specific, and by the second island a component
// was importing a type from a module named for a different page.

export type StreakView = { readonly count: number; readonly today: boolean };

export const NO_STREAK: StreakView = { count: 0, today: false };

// The wording differs from the home page's chip, which says "N-day training
// streak" and is written in public/assets/home.js. That divergence is pre-existing;
// unifying the two is a content decision for the club, not a port decision.
export const streakLabel = ({ count, today }: StreakView): string =>
  count < 1 ? '' : `\u{1F525} ${count}-day streak${today ? '' : ' \u2014 train today to keep it'}`;
