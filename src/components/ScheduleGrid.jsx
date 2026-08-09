import { Fragment, forwardRef } from 'react';
import { formatDateKey, formatMinuteOfDay } from '../format.js';

/**
 * Presentational grid. Renders a `Projection` and nothing more — no selection
 * state, no gestures, no data fetching. Behaviour is layered on by whoever
 * uses it (see AvailabilityEditor and GroupHeatmap).
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
  const { columns, rows, slotAt, rowBreaks } = projection;
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
          const breaksHere = rowBreaks.has(row);
          const onTheHour = minuteOfDay % 60 === 0;
          return (
            <Fragment key={minuteOfDay}>
              <div className={`grid-rowlabel${breaksHere ? ' row-break' : ''}`}>
                {onTheHour || row === 0 ? formatMinuteOfDay(minuteOfDay, use24h) : ''}
              </div>

              {columns.map((dateKey, col) => {
                const ts = slotAt(col, row);
                if (ts === undefined) {
                  return (
                    <div
                      key={dateKey}
                      className={`grid-cell cell-void${breaksHere ? ' row-break' : ''}`}
                    />
                  );
                }
                const { className = '', style } = cellProps?.(ts) ?? {};
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
                      breaksHere ? 'row-break first-row' : '',
                      row === 0 ? 'first-row' : '',
                      rowBreaks.has(row + 1) || row === lastRow ? 'last-row' : '',
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
