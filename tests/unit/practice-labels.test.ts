import { afterEach, describe, expect, it } from 'vitest';

import { statusLabel, summaryLabel, todayLabel, weekdayLabel } from '../../src/components/practice-labels';
import { streakLabel } from '../../src/components/streak-label';
import { JULY_2_DAY } from './store-fixtures';

// 2 July 2026 as a local calendar day number. Imported rather than restated: the
// hand derivation lives in tests/unit/store-day-number.test.ts, which is
// deliberately independent of the implementation's formula, and store-fixtures.ts
// is where the rest of the suite reads it from. 2 July 2026 is a Thursday.

// Every assertion below that involves a date names its locale. These functions
// format in the reader's own locale in production, which is the point of them —
// so an exact-string assertion that does not say which locale it means is really
// asserting "whatever this machine happens to be set to". That passed on an en-GB
// laptop and failed on the en-US CI runner.
const LOCALE = 'en-GB';

const at = (timezone: string, read: () => string): string => {
  const previous = process.env.TZ;
  process.env.TZ = timezone;
  try {
    return read();
  } finally {
    process.env.TZ = previous;
  }
};

afterEach(() => {
  process.env.TZ = 'Europe/London';
});

describe('what the student is told about today', () => {
  it('names the day in full', () => {
    expect(todayLabel(new Date('2026-07-02T12:00:00Z'), LOCALE)).toBe('TODAY — Thursday 2 July');
  });

  it('reads as a prompt when nothing has been ticked', () => {
    expect(statusLabel(0)).toBe('Nothing yet — pick one thing. Even a stretch keeps the streak.');
  });

  it('counts one thing in the singular and two in the plural', () => {
    expect([statusLabel(1), statusLabel(2)]).toEqual([
      '1 thing done today — streak kept ✓',
      '2 things done today — streak kept ✓',
    ]);
  });

  it('summarises both windows', () => {
    expect(summaryLabel(2, 5)).toBe('Practised on 2 of the last 7 days · 5 of the last 30.');
  });
});

describe('the streak chip', () => {
  it('says nothing at all below one day', () => {
    expect(streakLabel({ count: 0, today: false })).toBe('');
  });

  it('nudges when the streak is alive but today is not done', () => {
    expect(streakLabel({ count: 4, today: false })).toBe('🔥 4-day streak — train today to keep it');
  });

  it('drops the nudge once today counts', () => {
    // Not "training streak" — that is the home page's wording. The two pages have
    // said different things since before this migration; see the slice 4 plan.
    expect(streakLabel({ count: 5, today: true })).toBe('🔥 5-day streak');
  });
});

describe('the week strip labels a known defect, ported unchanged', () => {
  // These pin a BUG. They are here so slice 8 has something to turn red, and so
  // nobody "tidies" the arithmetic in the meantime believing it is correct.
  //
  // The day number is a local calendar day, so dayNumber * 86400000 is midnight
  // UTC. Formatting that instant in the viewer's zone lands on the previous
  // evening anywhere west of UTC.

  it('is correct in the club timezone, which is why nobody has noticed', () => {
    expect(at('Europe/London', () => weekdayLabel(JULY_2_DAY, LOCALE))).toBe('Thu');
  });

  it('is correct east of UTC too', () => {
    expect(at('Pacific/Auckland', () => weekdayLabel(JULY_2_DAY, LOCALE))).toBe('Thu');
  });

  it('is a day out west of UTC — 2 July 2026 is a Thursday, not a Wednesday', () => {
    expect(at('America/New_York', () => weekdayLabel(JULY_2_DAY, LOCALE))).toBe('Wed');
  });

  it('is a day out as far west as the site reaches', () => {
    expect(at('America/Los_Angeles', () => weekdayLabel(JULY_2_DAY, LOCALE))).toBe('Wed');
  });
});
