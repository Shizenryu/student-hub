// The strings the practice page shows, as pure functions.
//
// Split out of Practice.tsx so they can be driven in node without a browser or a
// React root — which matters most for weekdayLabel, whose defect below is only
// visible under a timezone the browser suite cannot switch to.

export type StreakView = { readonly count: number; readonly today: boolean };

// `TODAY — Thursday 2 July`, in the reader's own locale, exactly as the page this
// replaces built it.
export const todayLabel = (now: Date): string =>
  `TODAY — ${now.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}`;

// KNOWN DEFECT, ported deliberately rather than fixed, and pinned in
// tests/unit/practice-labels.test.ts.
//
// `dayNumber` is a LOCAL calendar day (see localDayNumber in src/domain/store.ts),
// so multiplying it back out gives midnight UTC — and toLocaleDateString then
// formats that instant in the VIEWER's zone. At UTC+0/+1 that lands on the same
// date, which is why the club has never seen it. West of UTC it lands on the
// evening before, so every label in the week strip is a day out.
//
// Slice 8 owns the fix, one RED->GREEN commit, so that "we ported it" and "we
// changed it" never share a diff.
export const weekdayLabel = (dayNumber: number): string =>
  new Date(dayNumber * 86400000).toLocaleDateString(undefined, { weekday: 'short' });

export const statusLabel = (count: number): string =>
  count === 0
    ? 'Nothing yet — pick one thing. Even a stretch keeps the streak.'
    : `${count} thing${count === 1 ? '' : 's'} done today — streak kept ✓`;

// The wording differs from the home page's chip, which says "N-day training
// streak". That divergence is pre-existing; unifying the two is a content decision
// for the club, not a port decision.
export const streakLabel = (streak: StreakView): string => {
  if (streak.count < 1) return '';
  return streak.today ? `🔥 ${streak.count}-day streak` : `🔥 ${streak.count}-day streak — train today to keep it`;
};

export const summaryLabel = (weekHits: number, weekDays: number, monthHits: number, monthDays: number): string =>
  `Practised on ${weekHits} of the last ${weekDays} days · ${monthHits} of the last ${monthDays}.`;
