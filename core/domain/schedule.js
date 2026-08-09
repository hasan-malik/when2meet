import { eventSlots, slotStep } from './event.js';
import { makeSlotId } from './slot.js';

/**
 * Projects an event onto a (date column x time row) plane.
 *
 * With no timezones in play this is close to trivial — every day offers the
 * same rows — but it stays a separate concept because it is what a renderer
 * consumes. A table, a canvas, or a native view can all read this unchanged.
 */

/**
 * @typedef {object} Projection
 * @property {number[]} slots      every slot, ascending
 * @property {string[]} columns    date keys, ascending
 * @property {number[]} rows       minutes-of-day, ascending
 * @property {(col:number,row:number)=>number|undefined} slotAt
 * @property {(slotId:number)=>{col:number,row:number}|undefined} positionOf
 */

/** @returns {Projection} */
export function projectSchedule(event) {
  const step = slotStep(event);
  const columns = [...event.dates].sort();

  const rows = [];
  for (let m = event.startMinute; m < event.endMinute; m += step) rows.push(m);

  const columnIndex = new Map(columns.map((d, i) => [d, i]));
  const rowIndex = new Map(rows.map((m, i) => [m, i]));

  return Object.freeze({
    slots: eventSlots(event),
    columns,
    rows,
    slotAt: (col, row) => {
      const dateKey = columns[col];
      const minute = rows[row];
      if (dateKey === undefined || minute === undefined) return undefined;
      return makeSlotId(dateKey, minute);
    },
    positionOf: (slotId) => {
      const col = columnIndex.get(dateKeyOfSlot(slotId));
      const row = rowIndex.get(minuteOfSlot(slotId));
      return col === undefined || row === undefined ? undefined : { col, row };
    },
  });
}

// Local helpers keep the import surface small.
import { slotDateKey, slotMinuteOfDay } from './slot.js';
const dateKeyOfSlot = slotDateKey;
const minuteOfSlot = slotMinuteOfDay;
