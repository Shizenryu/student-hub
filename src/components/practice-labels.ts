// The strings the practice page shows, as pure functions.
//
// Split out of Practice.tsx so they can be driven in node without a browser or a
// React root — which matters most for weekdayLabel, whose defect below is only
// visible under a timezone the browser suite cannot switch to.

// StreakView, NO_STREAK and streakLabel now live in ./streak-label, beside the
// component that renders them.

// The two windows the page reports on. Here rather than in the component, beside
// the sentence that names them, so summaryLabel cannot be handed a window that
// disagrees with the range its counts were taken over.
export const WEEK = 7;
export const MONTH = 30;

// `TODAY — Thursday 2 July`, in the reader's own locale.
//
// The locale is a parameter, defaulting to the reader's own, because this and
// weekdayLabel below are locale-DEPENDENT by design — so any test wanting an exact
// string has to say which locale it means. Leaving it implicit is how a suite
// passes on an en-GB laptop ("Thursday 2 July") and fails on an en-US CI runner
// ("Thursday, July 2"), which is exactly what happened.
export const todayLabel = (now: Date, locale?: string): string =>
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
export const weekdayLabel = (dayNumber: number, locale?: string): string =>
  new Date(dayNumber * 86400000).toLocaleDateString(locale, { weekday: 'short' });

export const statusLabel = (count: number): string =>
  count === 0
    ? 'Nothing yet — pick one thing. Even a stretch keeps the streak.'
    : `${count} thing${count === 1 ? '' : 's'} done today — streak kept ✓`;

export const summaryLabel = (weekHits: number, monthHits: number): string =>
  `Practised on ${weekHits} of the last ${WEEK} days · ${monthHits} of the last ${MONTH}.`;
