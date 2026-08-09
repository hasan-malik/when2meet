import { useCallback, useMemo, useRef, useState } from 'react';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const keyOf = (y, m, d) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function monthMatrix(year, month) {
  const lead = new Date(Date.UTC(year, month, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const cells = Array(lead).fill(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** iOS Calendar-style month picker with click-and-drag multi-date selection. */
export default function Calendar({ selected, onChange }) {
  const today = useMemo(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth(), d: n.getDate() };
  }, []);
  const [cursor, setCursor] = useState({ y: today.y, m: today.m });
  const drag = useRef(null);
  const todayKey = keyOf(today.y, today.m, today.d);

  const paint = useCallback(
    (key) => {
      const d = drag.current;
      if (!d) return;
      d.touched.add(key);
      const next = new Set(d.base);
      for (const k of d.touched) {
        if (d.mode === 'add') next.add(k);
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

  const shift = (delta) =>
    setCursor(({ y, m }) => {
      const total = y * 12 + m + delta;
      return { y: Math.floor(total / 12), m: ((total % 12) + 12) % 12 };
    });

  const monthLabel = new Date(Date.UTC(cursor.y, cursor.m, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });

  const endDrag = () => {
    drag.current = null;
  };

  return (
    <div className="calendar" onPointerUp={endDrag} onPointerCancel={endDrag}>
      <div className="calendar-head">
        <span className="calendar-title">{monthLabel}</span>
        <div className="calendar-nav">
          <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Previous month">
            ‹
          </button>
          <button type="button" className="icon-btn" onClick={() => shift(1)} aria-label="Next month">
            ›
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {WEEKDAYS.map((w, i) => (
          <div className="calendar-weekday" key={i}>
            {w}
          </div>
        ))}
        {monthMatrix(cursor.y, cursor.m).map((d, i) => {
          if (d === null) return <div key={i} className="calendar-day empty" />;
          const key = keyOf(cursor.y, cursor.m, d);
          return (
            <button
              type="button"
              key={i}
              aria-pressed={selected.has(key)}
              className={[
                'calendar-day',
                selected.has(key) ? 'selected' : '',
                key === todayKey ? 'today' : '',
                key < todayKey ? 'past' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onPointerDown={(e) => {
                e.preventDefault();
                start(key);
              }}
              onPointerEnter={() => drag.current && paint(key)}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}
