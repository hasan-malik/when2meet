import { Fragment, forwardRef } from 'react';
import { formatDateKey, formatMinuteOfDay } from '../format.js';

/**
 * Presentational grid. Renders a `Projection` and nothing more — no selection
 * state, no gestures, no data fetching. Behaviour is layered on by whoever
 * uses it (see AvailabilityEditor and GroupHeatmap).
 *
 * Without timezones every column offers exactly the same rows, so the grid is
 * a plain rectangle: no gaps, no missing cells.
 */
const ScheduleGrid = forwardRef(function ScheduleGrid(
  {
    projection,
    cellProps,
    interactive = false,
    use24h = false,
    weekdaysOnly = false,
    ...containerProps
  },
  ref,
) {
  const { columns, rows, slotAt } = projection;
  const lastRow = rows.length - 1;

  return (
    <div className="grid-scroll">
      <div
        ref={ref}
        className={`grid${interactive ? ' grid-editable' : ''}`}
        style={{ '--col-count': columns.length }}
        {...containerProps}
      >
        <div className="grid-corner" />
        {columns.map((dateKey) => {
          const { weekday, month, day } = formatDateKey(dateKey);
          // A weekday event has no real dates, so only the day name is meaningful.
          return (
            <div className="grid-colhead" key={dateKey}>
              {weekdaysOnly ? (
                <span className="colhead-date">{weekday}</span>
              ) : (
                <>
                  <span className="colhead-weekday">{weekday}</span>
                  <span className="colhead-date">
                    {month} {day}
                  </span>
                </>
              )}
            </div>
          );
        })}

        {rows.map((minuteOfDay, row) => {
          const onTheHour = minuteOfDay % 60 === 0;
          return (
            <Fragment key={minuteOfDay}>
              <div className="grid-rowlabel">
                {onTheHour || row === 0 ? formatMinuteOfDay(minuteOfDay, use24h) : ''}
              </div>

              {columns.map((dateKey, col) => {
                const slotId = slotAt(col, row);
                const { className = '', style } = cellProps?.(slotId) ?? {};
                return (
                  <div
                    key={dateKey}
                    data-cell=""
                    data-col={col}
                    data-row={row}
                    style={style}
                    className={[
                      'grid-cell',
                      onTheHour ? 'hour-start' : '',
                      row === 0 ? 'first-row' : '',
                      row === lastRow ? 'last-row' : '',
                      className,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  />
                );
              })}
            </Fragment>
          );
        })}
      </div>
    </div>
  );
});

export default ScheduleGrid;
