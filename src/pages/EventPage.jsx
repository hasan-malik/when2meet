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
  const { session, signIn, joinAnonymously, rename, signOut } = useParticipantSession(eventId);

  const [hoveredSlot, setHoveredSlot] = useState(undefined);
  const [isEditing, setIsEditing] = useState(false);
  const [naming, setNaming] = useState(false);

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
    ensureSession: joinAnonymously,
  });

  const commit = useCallback(
    (next) => {
      setIsEditing(true);
      draft.commit(next);
    },
    [draft],
  );

  // Naming yourself means renaming the row your painting already created, or
  // signing in properly if you have not painted anything yet.
  const handleClaimName = useCallback(
    async (name, password) => {
      if (session?.anonymous) {
        await rename(name);
      } else {
        const participant = await signIn(name, password);
        draft.reset(participant.slots);
      }
      setNaming(false);
      reload();
    },
    [session, rename, signIn, draft, reload],
  );

  const handleSignOut = useCallback(() => {
    signOut();
    draft.reset([]);
    setIsEditing(false);
    setNaming(false);
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

      <div className="event-layout">
        <section>
          <div className="panel-head">
            <h2 className="panel-title">Your availability</h2>
            <SaveBadge state={draft.saveState} />
          </div>
          <div className="panel-body">
            <p className="panel-hint">
              {session
                ? `Saving as ${session.name}.`
                : "Drag to paint when you're free. No sign-in needed — it saves as you go."}
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
              {session && !session.anonymous ? (
                <button
                  className="btn btn-sm btn-destructive"
                  style={{ marginLeft: 'auto' }}
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              ) : (
                <button
                  className="btn btn-sm"
                  style={{ marginLeft: 'auto' }}
                  onClick={() => setNaming((open) => !open)}
                >
                  {naming ? 'Cancel' : 'Add your name'}
                </button>
              )}
            </div>

            {naming && (
              <div className="name-form">
                <SignInForm onSubmit={handleClaimName} submitLabel="Save name" />
              </div>
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
            {!session && (
              <p className="panel-hint">
                This is everyone's answers, and is read only. Add your name on the left to
                fill in your own.
              </p>
            )}
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
              onHoverSlot={setHoveredSlot}
              weekdaysOnly={weekdaysOnly}
            />
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
