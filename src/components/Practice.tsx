import { useCallback, useState } from 'react';

import type { PracticeActivity } from '../data';
import type { Store } from '../domain/store';
import StreakChip from './StreakChip';
import { MONTH, WEEK, statusLabel, summaryLabel, todayLabel, weekdayLabel } from './practice-labels';
import { NO_STREAK } from './streak-label';
import type { StreakView } from './streak-label';
import { useBrowserStore } from './use-browser-store';

// The daily practice tracker, ported from the hand-written public/practice.html
// that this route replaced.
//
// It is an island rather than a static route because everything except the tile
// list is a fact about one student's own browser: what they ticked today, which of
// the last thirty days they trained, and whether their streak is alive. None of
// that can be known at build time.

type Props = { readonly activities: readonly PracticeActivity[] };

type Day = { readonly count: number; readonly label: string };

// What the page shows, rather than what the store holds. Every field is rendered
// as it stands, so the JSX below computes and formats nothing.
type View = {
  readonly done: readonly string[];
  readonly week: readonly Day[];
  readonly today: string;
  readonly status: string;
  readonly summary: string;
  readonly streak: StreakView;
};

// What the server renders, and what the browser shows for the moment before the
// store has been read.
//
// The seven week cells are here rather than empty because their SHAPE is known
// without reading anything — seven dots, the last one ringed — so shipping them
// means the card below does not jump when the real counts arrive. Their text is
// blank on purpose: guessing "Nothing yet" would flash the wrong sentence at a
// student who has ticked three things.
const BEFORE_MOUNT: View = {
  done: [],
  week: Array.from({ length: WEEK }, () => ({ count: 0, label: '' })),
  today: '',
  status: '',
  summary: '',
  streak: NO_STREAK,
};

function readView(store: Store, now: Date): View {
  const today = store.today();

  // One pass over the thirty days the page reports on. The week is its tail and
  // both hit counts fall out of it. Reading the seven days for the strip, then the
  // same seven again for the week count, then all thirty for the month count meant
  // 44 store reads per render — each one a getItem, a JSON.parse and a full walk of
  // a log that can hold sixty days.
  const days: readonly Day[] = Array.from({ length: MONTH }, (_, index) => {
    const dayNumber = today - (MONTH - 1 - index);
    return { count: store.practiceOn(dayNumber).length, label: weekdayLabel(dayNumber) };
  });
  const week = days.slice(-WEEK);
  const practised = (over: readonly Day[]) => over.filter((day) => day.count > 0).length;
  const done = store.todayPractice();

  return {
    done,
    week,
    today: todayLabel(now),
    status: statusLabel(done.length),
    summary: summaryLabel(practised(week), practised(days)),
    streak: store.streakInfo(),
  };
}

export default function Practice({ activities }: Props) {
  const store = useBrowserStore();
  const [view, setView] = useState<View | null>(null);
  const shown = view ?? BEFORE_MOUNT;

  // The store arrives on mount, one render after the first. Setting state during
  // render is React's documented way to derive from a changed input without a
  // second effect and a second paint.
  if (store !== null && view === null) {
    setView(readView(store, new Date()));
  }

  const toggle = useCallback(
    (id: string) => {
      if (store === null) return;

      if (store.todayPractice().includes(id)) {
        store.unlogPractice(id);
      } else {
        store.logPractice(id);
        // Any single activity keeps the streak, and only the ticking path marks it.
        // Nothing on the un-tick path reduces it — though as it happens that
        // asymmetry is unobservable, because markTrained is idempotent within a day
        // and an un-tick can only follow a tick that already marked today.
        store.markTrained();
      }
      setView(readView(store, new Date()));
    },
    [store],
  );

  return (
    <>
      <div className="today">{shown.today}</div>
      <div className={shown.done.length === 0 ? 'status none' : 'status done'}>{shown.status}</div>

      <div className="acts">
        {activities.map((activity) => {
          const ticked = shown.done.includes(activity.id);
          return (
            <button
              key={activity.id}
              type="button"
              className={ticked ? 'act on' : 'act'}
              aria-pressed={ticked}
              onClick={() => toggle(activity.id)}
            >
              <div className="n">{activity.name}</div>
              <div className="h">{activity.hint}</div>
            </button>
          );
        })}
      </div>

      <h2>This week</h2>
      <div className="week">
        {shown.week.map((day, index) => (
          <div key={index} className={`day${day.count > 0 ? ' hit' : ''}${index === WEEK - 1 ? ' today' : ''}`}>
            <div className="dot">{day.count > 0 ? day.count : '·'}</div>
            <div className="lbl">{day.label}</div>
          </div>
        ))}
      </div>
      <div className="summary">{shown.summary}</div>

      <div className="mind">
        A stretch counts. One kata counts. Anything you want to remain in your life must be cultivated — a little,
        often, beats a lot, rarely.
      </div>

      <StreakChip streak={shown.streak} />
    </>
  );
}
