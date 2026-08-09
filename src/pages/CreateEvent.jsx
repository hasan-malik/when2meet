import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from '../components/Calendar.jsx';
import WeekdayPicker from '../components/WeekdayPicker.jsx';
import { useSystem } from '../system/SystemProvider.jsx';
import { EventMode } from '../../core/index.js';
import { formatMinuteOfDay } from '../format.js';

// Half-hour bounds are plenty for choosing a range; the grid itself is
// 15-minute, matching When2Meet.
const TIME_OPTIONS = Array.from({ length: 49 }, (_, i) => i * 30);

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
  const [error, setError] = useState('');

  const weekly = mode === EventMode.WEEKDAYS;
  const chosen = weekly ? weekdays : dates;
  const sorted = useMemo(() => [...chosen].sort(), [chosen]);
  const canSubmit = Boolean(name.trim()) && sorted.length > 0 && endMinute > startMinute;

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError('');
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
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="page page-create">
      <div className="navbar">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="navbar-title">When2Meet</span>
        </span>
      </div>

      <div className="create-head">
        <h1 className="large-title">New event</h1>
        <p className="subtitle">Pick your dates, share the link, see when everyone is free.</p>
      </div>

      <form className="create-layout" onSubmit={submit}>
        <div className="create-col">
          <div className="group">
            <div className="group-body">
              <div className="row">
                <span className="row-label">Name</span>
                <input
                  className="row-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Team sync"
                  maxLength={120}
                  autoFocus
                />
              </div>
            </div>
          </div>

          <div className="group group-grow">
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

            <div className="group-body group-body-grow">
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
            <div className="group-header">What times might work?</div>
            <div className="group-body">
              <div className="row">
                <span className="row-label">No earlier than</span>
                <select
                  className="row-select"
                  value={startMinute}
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    setStartMinute(value);
                    if (value >= endMinute) setEndMinute(Math.min(1440, value + 60));
                  }}
                >
                  {TIME_OPTIONS.slice(0, 48).map((m) => (
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
                  {TIME_OPTIONS.filter((m) => m > startMinute).map((m) => (
                    <option key={m} value={m}>
                      {m === 1440 ? 'Midnight' : formatMinuteOfDay(m)}
                    </option>
                  ))}
                </select>
              </div>

            </div>
            <div className="group-footer">
              The grid runs in 15 minute steps.
            </div>
          </div>

          <div className="create-actions">
            {error && <p className="error-text">{error}</p>}
            <button className="btn btn-filled btn-block" disabled={!canSubmit || busy}>
              {busy ? 'Creating…' : 'Create event'}
            </button>
            <p className="group-footer create-note">
              No account needed — anyone with the link can add their availability.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}
