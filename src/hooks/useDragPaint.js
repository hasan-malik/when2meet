import { useCallback, useMemo, useRef, useState } from 'react';
import { paintModeFor, previewDrag, sameCell } from '../../core/index.js';

/**
 * Translates pointer gestures into selections.
 *
 * The only thing this knows is how to find which cell is under a pointer; what
 * a drag *means* is decided by the core's selection algebra. That split is why
 * the rectangle behaviour is testable without a browser.
 */
export function useDragPaint({ projection, selection, onCommit, enabled = true }) {
  const containerRef = useRef(null);
  const [drag, setDrag] = useState(null);

  const preview = useMemo(
    () => (drag ? previewDrag(projection, selection, drag) : selection),
    [drag, projection, selection],
  );

  const cellAt = useCallback((x, y) => {
    const element = document.elementFromPoint(x, y)?.closest('[data-cell]');
    if (!element || !containerRef.current?.contains(element)) return null;
    return { col: Number(element.dataset.col), row: Number(element.dataset.row) };
  }, []);

  const onPointerDown = useCallback(
    (event) => {
      if (!enabled || event.button === 2) return;
      const cell = cellAt(event.clientX, event.clientY);
      if (!cell) return;
      event.preventDefault();
      // Capture so the drag survives leaving the grid.
      containerRef.current?.setPointerCapture?.(event.pointerId);
      setDrag({
        anchor: cell,
        focus: cell,
        mode: paintModeFor(selection, projection.slotAt(cell.col, cell.row)),
      });
    },
    [enabled, cellAt, selection, projection],
  );

  const onPointerMove = useCallback(
    (event) => {
      if (!drag) return;
      const cell = cellAt(event.clientX, event.clientY);
      if (!cell) return;
      setDrag((d) => (d && !sameCell(d.focus, cell) ? { ...d, focus: cell } : d));
    },
    [drag, cellAt],
  );

  const endDrag = useCallback(() => {
    if (!drag) return;
    setDrag(null);
    onCommit?.(preview);
  }, [drag, preview, onCommit]);

  return {
    containerRef,
    preview,
    isDragging: Boolean(drag),
    cellAt,
    handlers: enabled
      ? {
          onPointerDown,
          onPointerMove,
          onPointerUp: endDrag,
          onPointerCancel: endDrag,
        }
      : {},
  };
}
