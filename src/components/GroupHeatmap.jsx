import { useCallback, useRef } from 'react';
import ScheduleGrid from './ScheduleGrid.jsx';
import { intensityAt } from '../../core/index.js';

/** Everyone's answers as one heatmap. Darker means more people free. */
export default function GroupHeatmap({
  projection,
  tally,
  total,
  onHoverSlot,
  weekdaysOnly,
  tapToSelect = false,
}) {
  const containerRef = useRef(null);

  const cellProps = useCallback(
    (ts) => {
      const intensity = intensityAt(tally, ts, total);
      if (intensity === 0) return {};
      // Floor keeps a single response visible against the empty-cell fill.
      const alpha = 0.16 + 0.84 * intensity;
      return { style: { background: `rgba(var(--heat), ${alpha.toFixed(3)})` } };
    },
    [tally, total],
  );

  const handleMove = useCallback(
    (event) => {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      const cell = element?.closest('[data-cell]');
      if (!cell || !containerRef.current?.contains(cell)) return onHoverSlot(undefined);
      const ts = projection.slotAt(Number(cell.dataset.col), Number(cell.dataset.row));
      onHoverSlot(ts);
    },
    [projection, onHoverSlot],
  );

  // Touch has no hover, so on a phone a tap picks the square and it stays
  // picked until another one is tapped.
  const pointing = tapToSelect
    ? { onPointerDown: handleMove }
    : { onPointerMove: handleMove, onPointerLeave: () => onHoverSlot(undefined) };

  return (
    <ScheduleGrid
      ref={containerRef}
      projection={projection}
      cellProps={cellProps}
      weekdaysOnly={weekdaysOnly}
      {...pointing}
    />
  );
}
