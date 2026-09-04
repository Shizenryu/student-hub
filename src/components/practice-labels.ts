// The strings the practice page shows, as pure functions.
//
// Split out of Practice.tsx so they can be driven in node without a browser or a
// React root — which matters most for weekdayLabel, whose defect below is only
// visible under a timezone the browser suite cannot switch to.

export type StreakView = { readonly count: number; readonly today: boolean };

// Both date functions below take an optional locale. It defaults to undefined,
// which is what production wants — the reader's own, exactly as the page this
// replaces used. It is a parameter because these functions are locale-DEPENDENT by
// design, so any test wanting an exact string has to say which locale it means.
// Leaving it implicit is how a suite passes on an en-GB laptop ("Thursday 2 July")
// and fails on an en-US CI runner ("Thursday, July 2"), which is precisely what
// happened.
type Locale = string | undefined;

// `TODAY — Thursday 2 July`, in the reader's own locale.
export const todayLabel = (now: Date, locale?: Locale): string =>
  `TODAY — ${now.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}`;

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
export const weekdayLabel = (dayNumber: number, locale?: Locale): string =>
  new Date(dayNumber * 86400000).toLocaleDateString(locale, { weekday: 'short' });

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
