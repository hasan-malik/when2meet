import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '../components/Alert.jsx';
import Calendar from '../components/Calendar.jsx';
import WeekdayPicker from '../components/WeekdayPicker.jsx';
import { useSystem } from '../system/SystemProvider.jsx';
import { EventMode } from '../../core/index.js';
import { formatMinuteOfDay } from '../format.js';

// Hour-spaced bounds, as When2Meet does it. Half-hour steps meant a 48 item
// menu that ran off the bottom of the screen, and the grid inside the range is
// 15-minute regardless.
const START_OPTIONS = Array.from({ length: 24 }, (_, i) => i * 60);
const END_OPTIONS = Array.from({ length: 24 }, (_, i) => (i + 1) * 60);

export default function CreateEvent() {
  const navigate = useNavigate();
  const { gateway } = useSystem();

  const [name, setName] = useState('');
  const [mode, setMode] = useState(EventMode.DATES);
  // Each mode keeps its own selection, so toggling back and forth is lossless.
  const [dates, setDates] = useState(() => new Set());
  const [weekdays, setWeekdays] = useState(() => new Set());
  const [startMinute, setStartMinute] = useState(9 * 60);
  const [endMinute, setEndMinute] = useState(17 * 60);
  const [busy, setBusy] = useState(false);
  const [alert, setAlert] = useState('');

  const weekly = mode === EventMode.WEEKDAYS;
  const chosen = weekly ? weekdays : dates;
  const sorted = useMemo(() => [...chosen].sort(), [chosen]);

  /** The first thing standing in the way, or null when nothing is. */
  function whatIsMissing() {
    if (sorted.length === 0) {
      return weekly
        ? 'You must select at least one day.'
        : 'You must select at least one date.';
    }
    if (endMinute <= startMinute) return 'The end time must be after the start time.';
    return null;
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;

    const missing = whatIsMissing();
    if (missing) {
      setAlert(missing);
      return;
    }

    setBusy(true);
    try {
      const { event } = await gateway.createEvent({
        name,
        mode,
        dates: sorted,
        startMinute,
        endMinute,
      });
      navigate(`/e/${event.id}`);
    } catch (err) {
      setAlert(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="page page-create">
      <form className="create-layout" onSubmit={submit}>
        <div className="create-col">
          <div className="group">
            <div className="group-body">
              <div className="row">
                <input
                  className="row-input row-input-title"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="New Event Name"
                  maxLength={120}
                  autoFocus
                />
              </div>
            </div>
          </div>

          <div className="group">
            <div className="group-header group-header-row">
              <span>What days might work?</span>
              <div className="segmented">
                <button
                  type="button"
                  aria-pressed={!weekly}
                  onClick={() => setMode(EventMode.DATES)}
                >
                  Dates
                </button>
                <button
                  type="button"
                  aria-pressed={weekly}
                  onClick={() => setMode(EventMode.WEEKDAYS)}
                >
                  Days of week
                </button>
              </div>
            </div>

            <div className="group-body">
              {weekly ? (
                <WeekdayPicker selected={weekdays} onChange={setWeekdays} />
              ) : (
                <Calendar selected={dates} onChange={setDates} />
              )}
            </div>

            <div className="group-footer">
              {sorted.length
                ? `${sorted.length} ${weekly ? 'day' : 'date'}${sorted.length === 1 ? '' : 's'} selected.`
                : weekly
                  ? 'Tap the days this should repeat on.'
                  : 'Tap days, or drag across several at once.'}
            </div>
          </div>
        </div>

        <div className="create-col">
          <div className="group">
            <div className="group-body">
              <div className="row">
                <span className="row-label">No earlier than</span>
                <select
                  className="row-select"
                  value={startMinute}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setStartMinute(value);
                    if (value >= endMinute) setEndMinute(value + 60);
                  }}
                >
                  {START_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      {formatMinuteOfDay(m)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="row">
                <span className="row-label">No later than</span>
                <select
                  className="row-select"
                  value={endMinute}
                  onChange={(e) => setEndMinute(Number(e.target.value))}
                >
                  {END_OPTIONS.filter((m) => m > startMinute).map((m) => (
                    <option key={m} value={m}>
                      {m === 1440 ? 'Midnight' : formatMinuteOfDay(m)}
                    </option>
                  ))}
                </select>
              </div>

            </div>
          </div>

          <div className="create-actions">
            <button className="btn btn-filled btn-block" disabled={busy}>
              {busy ? 'Creating…' : 'Create event'}
            </button>
            <p className="group-footer create-note">No account needed.</p>
          </div>
        </div>
      </form>

      {alert && <Alert message={alert} onClose={() => setAlert('')} />}
    </div>
  );
}
