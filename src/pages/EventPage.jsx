import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import AvailabilityEditor from '../components/AvailabilityEditor.jsx';
import GroupHeatmap from '../components/GroupHeatmap.jsx';
import ShareBar from '../components/ShareBar.jsx';
import SignInForm from '../components/SignInForm.jsx';
import { useEventData } from '../hooks/useEventData.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
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
import { formatWindow } from '../format.js';

// Shown in place of a name the organiser chose not to give.
const UNTITLED = 'Untitled event';


export default function EventPage() {
  const { eventId } = useParams();
  const { session, signIn, joinAnonymously, rename, signOut } = useParticipantSession(eventId);

  const [hoveredSlot, setHoveredSlot] = useState(undefined);
  const [naming, setNaming] = useState(false);
  const isMobile = useIsMobile();
  // A phone shows one grid at a time: no room for two, and no hover either.
  const [mobileView, setMobileView] = useState('you');

  // Mirrors the draft's save state. It lives up here because useEventData
  // below reads it, and the draft itself cannot be created until that fetch
  // has returned the participants it needs.
  const [draftState, setDraftState] = useState(SaveState.IDLE);

  // Pausing has to be tied to something that clears itself. An "is editing"
  // flag latched on and never came back, which silently killed live updates
  // from a person's first stroke onwards.
  const saving =
    draftState === SaveState.SAVING || draftState === SaveState.RETRYING;
  const { status, event, participants, error, reload } = useEventData(eventId, {
    paused: saving,
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

  // Mirrored into state the poll can read without the draft and the fetch
  // hook having to know about each other.
  useEffect(() => setDraftState(draft.saveState), [draft.saveState]);

  const commit = draft.commit;


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

  const youPanel = (
        <section>
          <div className="panel-head">
            <h2 className="panel-title">Your availability</h2>
            <div className="panel-head-actions">
              <button className="btn btn-sm" onClick={() => commit(new Set(projection.slots))}>
                Select all
              </button>
              <button
                className="btn btn-sm btn-destructive"
                onClick={() => commit(new Set())}
              >
                Clear
              </button>
              <SaveBadge state={draft.saveState} />
            </div>
          </div>
          <div className="panel-body">
            <div className="panel-note">
              {session
                ? `Saving as ${session.name}. Click and Drag to Toggle; Saved Immediately`
                : 'Click and Drag to Toggle; Saved Immediately'}
            </div>

            {hovered && !isMobile && (
              <div className="hover-panel">
                <div className="hover-panel-time">
                  {formatWindow(
                    hoveredSlot,
                    slotMinuteOfDay(hoveredSlot) + slotStep(event),
                    { weekdaysOnly },
                  )}
                </div>
                <div className="hover-panel-lists">
                  <div className="hover-panel-list">
                    <span className="readout-tag available">
                      Free {hovered.available.length}
                    </span>
                    <ul>
                      {hovered.available.length ? (
                        hovered.available.map((p) => <li key={p.id}>{p.name}</li>)
                      ) : (
                        <li className="muted">Nobody</li>
                      )}
                    </ul>
                  </div>
                  <div className="hover-panel-list">
                    <span className="readout-tag">Busy {hovered.unavailable.length}</span>
                    <ul>
                      {hovered.unavailable.length ? (
                        hovered.unavailable.map((p) => <li key={p.id}>{p.name}</li>)
                      ) : (
                        <li className="muted">Nobody</li>
                      )}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            <AvailabilityEditor
              projection={projection}
              selection={draft.slots}
              onCommit={commit}
              weekdaysOnly={weekdaysOnly}
            />

          </div>

          <div className="panel-actions">
            {(!session || session.anonymous) && (
              <button
                className={`btn btn-sm${naming ? ' btn-destructive' : ''}`}
                onClick={() => setNaming((open) => !open)}
              >
                {naming ? 'Cancel' : 'Add your name'}
              </button>
            )}
            {session && !session.anonymous && (
              <button className="btn btn-sm btn-destructive" onClick={handleSignOut}>
                Sign out
              </button>
            )}
          </div>

          {naming && (
            <div className="name-form">
              <SignInForm onSubmit={handleClaimName} submitLabel="Save name" />
            </div>
          )}
        </section>
  );

  const everyonePanel = (
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
            <div className="panel-note">
              {isMobile
                ? 'Tap a square to see who can make it'
                : "Mouseover the Calendar to see who's available"}
            </div>

            {isMobile && (
              <div className="tap-readout">
                {hovered ? (
                  <>
                    <div className="tap-readout-time">
                      {formatWindow(
                        hoveredSlot,
                        slotMinuteOfDay(hoveredSlot) + slotStep(event),
                        { weekdaysOnly },
                      )}
                    </div>
                    <div className="tap-readout-line">
                      <span className="readout-tag available">
                        Free {hovered.available.length}
                      </span>
                      <span>{hovered.available.map((p) => p.name).join(', ') || 'Nobody'}</span>
                    </div>
                    <div className="tap-readout-line">
                      <span className="readout-tag">Busy {hovered.unavailable.length}</span>
                      <span className="muted">
                        {hovered.unavailable.map((p) => p.name).join(', ') || 'Nobody'}
                      </span>
                    </div>
                  </>
                ) : (
                  <span className="muted">No square selected</span>
                )}
              </div>
            )}

            <GroupHeatmap
              projection={projection}
              tally={tally}
              total={total}
              onHoverSlot={setHoveredSlot}
              weekdaysOnly={weekdaysOnly}
              tapToSelect={isMobile}
            />
          </div>
        </section>
  );

  return (
    <div className="page page-wide">
      <div className="navbar">
        <Link to="/" className="back-link">
          <svg className="back-chevron" viewBox="0 0 12 20" aria-hidden="true">
            <path
              d="M10.5 1.75 2.25 10l8.25 8.25"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          New
        </Link>
        <h1 className="navbar-heading">{event.name || UNTITLED}</h1>
        <span className="navbar-title">pickatime</span>
      </div>

      <ShareBar />

      {isMobile ? (
        <>
          <div className="segmented mobile-switch">
            <button
              type="button"
              aria-pressed={mobileView === 'you'}
              onClick={() => setMobileView('you')}
            >
              You
            </button>
            <button
              type="button"
              aria-pressed={mobileView === 'everyone'}
              onClick={() => setMobileView('everyone')}
            >
              Everyone
            </button>
          </div>
          {mobileView === 'you' ? youPanel : everyonePanel}
        </>
      ) : (
        <div className="event-layout">
          {youPanel}
          {everyonePanel}
        </div>
      )}

    </div>
  );
}

function SaveBadge({ state }) {
  if (state === SaveState.IDLE) return null;
  const label = {
    [SaveState.SAVING]: 'Saving',
    [SaveState.RETRYING]: 'Reconnecting',
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
