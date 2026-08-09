import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { paintModeFor, previewDrag, sameCell } from '../../core/index.js';

/**
 * Translates pointer gestures into selections.
 *
 * The only thing this knows is how to find which cell is under a pointer; what
 * a drag *means* is decided by the core's selection algebra. That split is why
 * the rectangle behaviour is testable without a browser.
 *
 * Tracking happens on `window` rather than the grid, and deliberately without
 * `setPointerCapture`: capturing retargets every later event to the container,
 * which breaks hit-testing, and touch pointers are implicitly captured by the
 * element the gesture started on. Listening globally and asking the document
 * what is under the coordinates is the one approach that behaves the same for
 * mouse, pen and touch — including when the drag leaves the grid.
 */
export function useDragPaint({ projection, selection, onCommit, enabled = true }) {
  const containerRef = useRef(null);
  const [drag, setDrag] = useState(null);
  const isDragging = drag !== null;

  const preview = useMemo(
    () => (drag ? previewDrag(projection, selection, drag) : selection),
    [drag, projection, selection],
  );

  // Latest values for the window listeners, which are registered once per drag.
  const previewRef = useRef(preview);
  previewRef.current = preview;
  const commitRef = useRef(onCommit);
  commitRef.current = onCommit;

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
      // Stops text selection and the browser's native image drag.
      event.preventDefault();
      setDrag({
        anchor: cell,
        focus: cell,
        mode: paintModeFor(selection, projection.slotAt(cell.col, cell.row)),
      });
    },
    [enabled, cellAt, selection, projection],
  );

  useEffect(() => {
    if (!isDragging) return undefined;

    const onMove = (event) => {
      const cell = cellAt(event.clientX, event.clientY);
      if (!cell) return; // outside the grid: keep the last rectangle
      setDrag((current) =>
        current && !sameCell(current.focus, cell) ? { ...current, focus: cell } : current,
      );
    };

    const onEnd = () => {
      setDrag(null);
      commitRef.current?.(previewRef.current);
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onEnd);
    window.addEventListener('pointercancel', onEnd);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onEnd);
      window.removeEventListener('pointercancel', onEnd);
    };
  }, [isDragging, cellAt]);

  return {
    containerRef,
    preview,
    isDragging,
    handlers: enabled ? { onPointerDown } : {},
  };
}
