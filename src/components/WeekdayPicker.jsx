import { useCallback, useRef } from 'react';
import { WEEKDAY_ANCHOR } from '../../core/index.js';
import { formatDateKey } from '../format.js';

const LABELS = WEEKDAY_ANCHOR.map((key) => formatDateKey(key).weekday);

/**
 * "Days of the week" picker. Selection is still a set of date keys — the
 * anchor week's — so everything downstream treats it like any other event.
 */
export default function WeekdayPicker({ selected, onChange }) {
  const drag = useRef(null);

  const paint = useCallback(
    (key) => {
      const state = drag.current;
      if (!state) return;
      state.touched.add(key);
      const next = new Set(state.base);
      for (const k of state.touched) {
        if (state.mode === 'add') next.add(k);
        else next.delete(k);
      }
      onChange(next);
    },
    [onChange],
  );

  const start = useCallback(
    (key) => {
      drag.current = {
        base: new Set(selected),
        mode: selected.has(key) ? 'remove' : 'add',
        touched: new Set(),
      };
      paint(key);
    },
    [selected, paint],
  );

  const end = () => {
    drag.current = null;
  };

  return (
    <div className="weekday-picker" onPointerUp={end} onPointerCancel={end} onPointerLeave={end}>
      {WEEKDAY_ANCHOR.map((key, i) => (
        <button
          type="button"
          key={key}
          aria-pressed={selected.has(key)}
          className={`weekday-chip${selected.has(key) ? ' selected' : ''}`}
          onPointerDown={(e) => {
            e.preventDefault();
            start(key);
          }}
          onPointerEnter={() => drag.current && paint(key)}
        >
          {LABELS[i]}
        </button>
      ))}
    </div>
  );
}
