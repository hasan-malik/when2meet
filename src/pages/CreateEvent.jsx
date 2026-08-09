import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Calendar from '../components/Calendar.jsx';
import { useSystem } from '../system/SystemProvider.jsx';
import { SLOT_SIZES } from '../../core/index.js';
import {
  allTimeZones,
  formatMinuteOfDay,
  localTimeZone,
  prettyZone,
} from '../format.js';

const TIME_OPTIONS = Array.from({ length: 49 }, (_, i) => i * 30);
const TIMEZONES = allTimeZones();

export default function CreateEvent() {
  const navigate = useNavigate();
  const { gateway } = useSystem();

  const [name, setName] = useState('');
  const [dates, setDates] = useState(() => new Set());
  const [startMinute, setStartMinute] = useState(9 * 60);
  const [endMinute, setEndMinute] = useState(17 * 60);
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [timezone, setTimezone] = useState(localTimeZone);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const sortedDates = useMemo(() => [...dates].sort(), [dates]);
  const canSubmit = Boolean(name.trim()) && sortedDates.length > 0 && endMinute > startMinute;

  async function submit(e) {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    setError('');
    try {
      const { event } = await gateway.createEvent({
        name,
        dates: sortedDates,
        startMinute,
        endMinute,
        slotMinutes,
        timezone,
      });
      navigate(`/e/${event.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <div className="navbar">
        <span className="brand">
          <span className="brand-mark" aria-hidden="true" />
          <span className="navbar-title">When2Meet</span>
        </span>
      </div>

      <h1 className="large-title">New event</h1>
      <p className="subtitle">Pick your dates, share the link, see when everyone is free.</p>

      <form onSubmit={submit}>
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

        <div className="group">
          <div className="group-header">Dates</div>
          <div className="group-body">
            <Calendar selected={dates} onChange={setDates} />
          </div>
          <div className="group-footer">
            {sortedDates.length
              ? `${sortedDates.length} day${sortedDates.length === 1 ? '' : 's'} selected.`
              : 'Tap days, or drag across several at once.'}
          </div>
        </div>

        <div className="group">
          <div className="group-header">Time range</div>
          <div className="group-body">
            <div className="row">
              <span className="row-label">From</span>
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
              <span className="row-label">To</span>
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

            <div className="row">
              <span className="row-label">Slots</span>
              <div className="segmented">
                {SLOT_SIZES.map((size) => (
                  <button
                    type="button"
                    key={size}
                    aria-pressed={slotMinutes === size}
                    onClick={() => setSlotMinutes(size)}
                  >
                    {size === 60 ? '1 hr' : `${size} min`}
                  </button>
                ))}
              </div>
            </div>

            <div className="row">
              <span className="row-label">Timezone</span>
              <select
                className="row-select"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {prettyZone(tz)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="group-footer">
            Everyone sees these times in their own timezone.
          </div>
        </div>

        {error && <p className="error-text">{error}</p>}

        <button className="btn btn-filled btn-block" disabled={!canSubmit || busy}>
          {busy ? 'Creating…' : 'Create event'}
        </button>
        <p className="group-footer" style={{ textAlign: 'center', paddingTop: 12 }}>
          No account needed — anyone with the link can add their availability.
        </p>
      </form>
    </div>
  );
}
