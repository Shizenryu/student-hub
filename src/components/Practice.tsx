import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { PracticeActivity } from '../data';
import { statusLabel, streakLabel, summaryLabel, todayLabel, weekdayLabel } from './practice-labels';
import { browserStore } from '../domain/store';
import type { Store } from '../domain/store';

// The daily practice tracker, ported from the hand-written public/practice.html
// that this route replaced.
//
// It is an island rather than a static route because everything except the tile
// list is a fact about one student's own browser: what they ticked today, which of
// the last thirty days they trained, and whether their streak is alive. None of
// that can be known at build time.

type Props = { readonly activities: readonly PracticeActivity[] };

const WEEK = 7;
const MONTH = 30;

type Day = { readonly dayNumber: number; readonly count: number };

type View = {
  readonly done: readonly string[];
  readonly week: readonly Day[];
  readonly weekHits: number;
  readonly monthHits: number;
  readonly streak: { readonly count: number; readonly today: boolean };
};

function readView(store: Store): View {
  const today = store.today();
  const practisedDaysAgo = (offset: number) => store.practiceOn(today - offset).length;

  return {
    done: store.todayPractice(),
    week: Array.from({ length: WEEK }, (_, index) => {
      const dayNumber = today - (WEEK - 1 - index);
      return { dayNumber, count: store.practiceOn(dayNumber).length };
    }),
    weekHits: Array.from({ length: WEEK }, (_, offset) => practisedDaysAgo(offset)).filter((n) => n > 0).length,
    monthHits: Array.from({ length: MONTH }, (_, offset) => practisedDaysAgo(offset)).filter((n) => n > 0).length,
    streak: store.streakInfo(),
  };
}

export default function Practice({ activities }: Props) {
  // The store is built in an effect, never during render. Astro renders this
  // component in Node at build time, where there is no localStorage, and a store
  // constructed there would fail its probe, fall back to memory, and be reused
  // after hydration — so nothing would ever persist, the build would not fail, and
  // no test here would catch it.
  const store = useRef<Store | null>(null);
  const [view, setView] = useState<View | null>(null);
  const [label, setLabel] = useState('');

  // The chip belongs inside <header>, above this island's own markup, because that
  // is where the page it replaces puts it. It has to be rendered by THIS component
  // rather than a second island: ticking the first activity of the day changes it,
  // so it shares this component's state. A portal is how one root reaches an
  // element outside its own subtree.
  const [chipTarget, setChipTarget] = useState<Element | null>(null);

  useEffect(() => {
    const opened = browserStore();
    store.current = opened;
    setView(readView(opened));
    setLabel(todayLabel(new Date()));
    setChipTarget(document.getElementById('streakChip'));
  }, []);

  const toggle = useCallback((id: string) => {
    const opened = store.current;
    if (opened === null) return;

    if (opened.todayPractice().includes(id)) {
      opened.unlogPractice(id);
    } else {
      opened.logPractice(id);
      // Any single activity keeps the streak, and only the ticking path marks it.
      // Nothing on the un-tick path reduces it — though as it happens that
      // asymmetry is unobservable, because markTrained is idempotent within a day
      // and an un-tick can only follow a tick that already marked today.
      opened.markTrained();
    }
    setView(readView(opened));
  }, []);

  const done = view?.done ?? [];

  return (
    <>
      <div className="today">{label}</div>
      <div className={done.length === 0 ? 'status none' : 'status done'}>
        {view === null ? '' : statusLabel(done.length)}
      </div>

      <div className="acts">
        {activities.map((activity) => {
          const ticked = done.includes(activity.id);
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
        {(view?.week ?? []).map((day, index) => (
          <div key={day.dayNumber} className={`day${day.count > 0 ? ' hit' : ''}${index === WEEK - 1 ? ' today' : ''}`}>
            <div className="dot">{day.count > 0 ? day.count : '·'}</div>
            <div className="lbl">{weekdayLabel(day.dayNumber)}</div>
          </div>
        ))}
      </div>
      <div className="summary">
        {view === null ? '' : summaryLabel(view.weekHits, WEEK, view.monthHits, MONTH)}
      </div>

      <div className="mind">
        A stretch counts. One kata counts. Anything you want to remain in your life must be cultivated — a little,
        often, beats a lot, rarely.
      </div>

      {chipTarget !== null && view !== null ? createPortal(streakLabel(view.streak), chipTarget) : null}
    </>
  );
}
