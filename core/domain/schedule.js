import { eventSlots } from './event.js';
import { instantToWall } from './time.js';

/**
 * Projects an event's absolute slots onto a (date column x time row) plane for
 * a chosen display timezone.
 *
 * This is the whole layout model, and it is pure data — no DOM, no framework.
 * A table, a canvas renderer, or a native view can all consume it unchanged.
 */

/**
 * @typedef {object} Projection
 * @property {number[]} slots      every slot, ascending
 * @property {string[]} columns    local date keys, ascending
 * @property {number[]} rows       local minutes-of-day, ascending
 * @property {(col:number,row:number)=>number|undefined} slotAt
 * @property {(ts:number)=>{col:number,row:number}|undefined} positionOf
 * @property {Set<number>} rowBreaks row indices where continuity is broken
 */

/** @returns {Projection} */
export function projectSchedule(event, timeZone) {
  const slots = eventSlots(event);
  const byCell = new Map();
  const columnSet = new Set();
  const rowSet = new Set();

  for (const ts of slots) {
    const { dateKey, minuteOfDay } = instantToWall(ts, timeZone);
    columnSet.add(dateKey);
    rowSet.add(minuteOfDay);
    byCell.set(cellKey(dateKey, minuteOfDay), ts);
  }

  const columns = [...columnSet].sort();
  const rows = [...rowSet].sort((a, b) => a - b);

  const columnIndex = new Map(columns.map((d, i) => [d, i]));
  const rowIndex = new Map(rows.map((m, i) => [m, i]));

  const positions = new Map();
  for (const [key, ts] of byCell) {
    const [dateKey, minute] = key.split('|');
    positions.set(ts, {
      col: columnIndex.get(dateKey),
      row: rowIndex.get(Number(minute)),
    });
  }

  return Object.freeze({
    slots,
    columns,
    rows,
    slotAt: (col, row) => byCell.get(cellKey(columns[col], rows[row])),
    positionOf: (ts) => positions.get(ts),
    rowBreaks: findRowBreaks(rows, event.slotMinutes),
  });
}

const cellKey = (dateKey, minuteOfDay) => `${dateKey}|${minuteOfDay}`;

/**
 * Row indices whose predecessor is not contiguous. Happens when a viewer's
 * timezone splits the event across a day boundary — a renderer should show a
 * visual gap there rather than implying the times run together.
 */
function findRowBreaks(rows, slotMinutes) {
  const breaks = new Set();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i] - rows[i - 1] !== slotMinutes) breaks.add(i);
  }
  return breaks;
}
