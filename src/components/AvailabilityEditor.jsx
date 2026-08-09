import { useCallback } from 'react';
import ScheduleGrid from './ScheduleGrid.jsx';
import { useDragPaint } from '../hooks/useDragPaint.js';

/** Your own grid: drag to paint the times you're free. */
export default function AvailabilityEditor({ projection, selection, onCommit }) {
  const { containerRef, preview, handlers } = useDragPaint({
    projection,
    selection,
    onCommit,
  });

  const cellProps = useCallback(
    (ts) => ({ className: preview.has(ts) ? 'cell-on' : '' }),
    [preview],
  );

  return (
    <ScheduleGrid
      ref={containerRef}
      projection={projection}
      cellProps={cellProps}
      interactive
      onContextMenu={(e) => e.preventDefault()}
      {...handlers}
    />
  );
}
