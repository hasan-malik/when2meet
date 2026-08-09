import { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AvailabilityEditor from '../components/AvailabilityEditor.jsx';
import GroupHeatmap from '../components/GroupHeatmap.jsx';
import ShareBar from '../components/ShareBar.jsx';
import SignInForm from '../components/SignInForm.jsx';
import { useEventData } from '../hooks/useEventData.js';
import { useParticipantSession } from '../hooks/useParticipantSession.js';
import { SaveState, useAvailabilityDraft } from '../hooks/useAvailabilityDraft.js';
import {
  attendanceAt,
  EventMode,
  findBestWindows,
  projectSchedule,
  slotMinuteOfDay,
  slotStep,
  tallyAvailability,
} from '../../core/index.js';
import { formatWindow, pluralize } from '../format.js';

// Shown in place of a name the organiser chose not to give.
const UNTITLED = 'Untitled event';

export default function EventPage() {
  const { eventId } = useParams();
  const { session, signIn, signOut } = useParticipantSession(eventId);

  const [hoveredSlot, setHoveredSlot] = useState(undefined);
  const [focusedPerson, setFocusedPerson] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  const { status, event, participants, error, reload } = useEventData(eventId, {
    paused: isEditing,
  });

  const remoteSlots = useMemo(
    () => participants.find((p) => p.id === session?.participantId)?.slots,
    [participants, session],
  );

  const draft = useAvailabilityDraft({
    eventId,
    session,
    remoteSlots,
    onAuthLost: signOut,
  });

  const commit = useCallback(
    (next) => {
      setIsEditing(true);
      draft.commit(next);
    },
    [draft],
  );

  const handleSignIn = useCallback(
    async (name, password) => {
      const participant = await signIn(name, password);
      draft.reset(participant.slots);
      reload();
    },
    [signIn, draft, reload],
  );

  const handleSignOut = useCallback(() => {
    signOut();
    draft.reset([]);
    setIsEditing(false);
    setFocusedPerson(null);
  }, [signOut, draft]);

  // Everyone's answers, with our own unsaved edits layered on top.
  const people = useMemo(() => {
    if (!session) return participants;
    const mine = [...draft.slots];
    const merged = participants.map((p) =>
      p.id === session.participantId ? { ...p, slots: mine } : p,
    );
    if (!merged.some((p) => p.id === session.participantId)) {
      merged.push({ id: session.participantId, name: session.name, slots: mine });
    }
    return merged;
  }, [participants, session, draft.slots]);

  const weekdaysOnly = event?.mode === EventMode.WEEKDAYS;
  const projection = useMemo(() => (event ? projectSchedule(event) : null), [event]);
  const tally = useMemo(() => tallyAvailability(people), [people]);
  const best = useMemo(
    () => (projection ? findBestWindows(projection.slots, tally, slotStep(event)) : null),
    [projection, tally, event],
  );

  const focusedSlots = useMemo(() => {
    const person = focusedPerson && people.find((p) => p.id === focusedPerson);
    return person ? new Set(person.slots) : null;
  }, [focusedPerson, people]);

  const hovered = useMemo(
    () => (hoveredSlot === undefined ? null : attendanceAt(tally, hoveredSlot, people)),
    [hoveredSlot, tally, people],
  );

  if (status === 'loading') {
    return (
      <div className="page">
        <div className="centered">
          <div className="spinner" aria-label="Loading" />
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="page">
        <div className="centered">
          <h1 className="large-title">Event not found</h1>
          <p className="muted">{error?.message}</p>
          <Link className="btn btn-filled" to="/">
            Create an event
          </Link>
        </div>
      </div>
    );
  }

  const total = people.length;

  return (
    <div className="page page-wide">
      <div className="navbar">
        <Link to="/" className="back-link">
          New
        </Link>
        <span className="navbar-title">Freetime</span>
      </div>

      <h1 className="event-title">{event.name || UNTITLED}</h1>
      <p className="subtitle">
        {total === 0 ? 'No responses yet' : `${pluralize(total, 'person', 'people')} responded`}
      </p>

      <ShareBar />

      <div className="panels">
        <section>
          <div className="panel-head">
            <h2 className="panel-title">You</h2>
            {session && <SaveBadge state={draft.saveState} />}
          </div>
          <div className="panel-body">
            {session ? (
              <>
                <p className="panel-hint">
                  Drag to paint when you're free — it saves as you go.
                </p>
                <AvailabilityEditor
                  projection={projection}
                  selection={draft.slots}
                  onCommit={commit}
                  weekdaysOnly={weekdaysOnly}
                />
                <div className="toolbar">
                  <button className="btn btn-sm" onClick={() => commit(new Set(projection.slots))}>
                    Select all
                  </button>
                  <button className="btn btn-sm" onClick={() => commit(new Set())}>
                    Clear
                  </button>
                  <button
                    className="btn btn-sm btn-destructive"
                    style={{ marginLeft: 'auto' }}
                    onClick={handleSignOut}
                  >
                    Sign out
                  </button>
                </div>
              </>
            ) : (
              <SignInForm onSubmit={handleSignIn} />
            )}
          </div>
        </section>

        <section>
          <div className="panel-head">
            <h2 className="panel-title">Everyone</h2>
            <div className="legend">
              <span>0</span>
              <span className="legend-ramp" aria-hidden="true" />
              <span>{total}</span>
            </div>
          </div>
          <div className="panel-body">
            <div className="hover-readout">
              {hovered ? (
                <>
                  <div className="readout-time">
                    {formatWindow(
                      hoveredSlot,
                      slotMinuteOfDay(hoveredSlot) + slotStep(event),
                      { weekdaysOnly },
                    )}
                  </div>
                  <div className="readout-row">
                    <span className="readout-tag available">
                      Free {hovered.available.length}
                    </span>
                    <span className="readout-names">
                      {hovered.available.map((p) => p.name).join(', ') || '—'}
                    </span>
                  </div>
                  <div className="readout-row">
                    <span className="readout-tag">Busy {hovered.unavailable.length}</span>
                    <span className="readout-names muted">
                      {hovered.unavailable.map((p) => p.name).join(', ') || '—'}
                    </span>
                  </div>
                </>
              ) : (
                <span className="muted">
                  {total
                    ? 'Hover a square to see who can make it.'
                    : 'Share the link above to start collecting answers.'}
                </span>
              )}
            </div>

            <GroupHeatmap
              projection={projection}
              tally={tally}
              total={total}
              focusedSlots={focusedSlots}
              onHoverSlot={setHoveredSlot}
              weekdaysOnly={weekdaysOnly}
            />
          </div>
        </section>
      </div>

      <div className="panels" style={{ marginTop: 22 }}>
        <section>
          <div className="panel-head">
            <h2 className="panel-title">Respondents</h2>
          </div>
          <div className="panel-body">
            {people.length ? (
              <ul className="people">
                {people.map((person) => (
                  <li key={person.id}>
                    <button
                      className={`person${focusedPerson === person.id ? ' active' : ''}`}
                      onMouseEnter={() => setFocusedPerson(person.id)}
                      onMouseLeave={() => setFocusedPerson(null)}
                      onClick={() =>
                        setFocusedPerson((c) => (c === person.id ? null : person.id))
                      }
                    >
                      <span className="person-name">
                        {person.name}
                        {session?.participantId === person.id && <em> · you</em>}
                      </span>
                      <span className="person-count">{person.slots.length}</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">Nobody has filled this in yet.</p>
            )}
          </div>
        </section>

        <section>
          <div className="panel-head">
            <h2 className="panel-title">Best times</h2>
          </div>
          <div className="panel-body">
            {best && best.best > 0 ? (
              <ol className="best-list">
                {best.windows.map((window, index) => (
                  <li key={window.start}>
                    <span className="best-rank">{index + 1}</span>
                    <span>
                      <span className="best-when">
                        {formatWindow(
                          window.start,
                          slotMinuteOfDay(window.end) + best.step,
                          { weekdaysOnly },
                        )}
                      </span>
                      <span className="best-who">
                        {window.count} of {total} available
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">Best times appear once people respond.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function SaveBadge({ state }) {
  if (state === SaveState.IDLE) return null;
  const label = {
    [SaveState.SAVING]: 'Saving',
    [SaveState.SAVED]: 'Saved',
    [SaveState.FAILED]: 'Not saved',
  }[state];
  return (
    <span className={`save-badge ${state}`}>
      <span className="save-dot" aria-hidden="true" />
      {label}
    </span>
  );
}
