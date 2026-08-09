/**
 * Selection algebra for drag-painting.
 *
 * Pure set operations over slot timestamps: no pointer events, no elements.
 * A UI translates gestures into an anchor and a focus cell; this decides what
 * the resulting selection is. Test it without a browser.
 */

export const PaintMode = Object.freeze({
  ADD: 'add',
  REMOVE: 'remove',
});

/** The mode a drag should use, given the cell it started on. */
export const paintModeFor = (selection, ts) =>
  ts !== undefined && selection.has(ts) ? PaintMode.REMOVE : PaintMode.ADD;

/** Slots inside the rectangle spanned by two cells, in projection order. */
export function slotsInRectangle(projection, anchor, focus) {
  const colFrom = Math.min(anchor.col, focus.col);
  const colTo = Math.max(anchor.col, focus.col);
  const rowFrom = Math.min(anchor.row, focus.row);
  const rowTo = Math.max(anchor.row, focus.row);

  const out = [];
  for (let col = colFrom; col <= colTo; col++) {
    for (let row = rowFrom; row <= rowTo; row++) {
      const ts = projection.slotAt(col, row);
      if (ts !== undefined) out.push(ts);
    }
  }
  return out;
}

/** Apply a paint stroke to a base selection, returning a new Set. */
export function applyPaint(base, slots, mode) {
  const next = new Set(base);
  for (const ts of slots) {
    if (mode === PaintMode.ADD) next.add(ts);
    else next.delete(ts);
  }
  return next;
}

/** Convenience: the selection a rectangular drag would produce. */
export function previewDrag(projection, base, { anchor, focus, mode }) {
  return applyPaint(base, slotsInRectangle(projection, anchor, focus), mode);
}

export const sameCell = (a, b) => !!a && !!b && a.col === b.col && a.row === b.row;
