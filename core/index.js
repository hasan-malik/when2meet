/**
 * The system, in one import.
 *
 * Nothing under `core/` imports React, the DOM, `fetch`, or any storage SDK.
 * Everything a different UI would need is exported here; everything a
 * different backend would need is a port with an adapter beside it.
 *
 *   Layer        Depends on              Swap it by
 *   ─────────────────────────────────────────────────────────────────────
 *   domain/      nothing                 (rules — you probably shouldn't)
 *   ports/       domain                  writing a new adapter
 *   services/    domain + ports          —
 *   adapters/    ports (+ one vendor)    implementing the same port
 *   ui           ports only              writing a new UI
 */

// Entities and rules
export {
  SLOT_SIZES,
  EventMode,
  WEEKDAY_ANCHOR,
  MAX_DATES,
  MAX_EVENT_NAME,
  MINUTES_PER_DAY,
  makeEvent,
  eventSlots,
  keepValidSlots,
  slotDurationMs,
} from './domain/event.js';

export {
  MAX_PARTICIPANT_NAME,
  normalizeName,
  identityKey,
  makeParticipant,
  publicParticipant,
  grantSession,
  hasSession,
  MAX_SESSIONS,
} from './domain/participant.js';

// Layout projection
export { projectSchedule } from './domain/schedule.js';

// Selection algebra
export {
  PaintMode,
  paintModeFor,
  slotsInRectangle,
  applyPaint,
  previewDrag,
  sameCell,
} from './domain/selection.js';

// Aggregation
export {
  tallyAvailability,
  countAt,
  intensityAt,
  attendanceAt,
  findBestWindows,
} from './domain/availability.js';

// Time primitives
export {
  isValidTimeZone,
  tzOffsetMs,
  zonedWallToUtc,
  instantToWall,
  isDateKey,
} from './domain/time.js';

// Errors
export {
  DomainError,
  ValidationError,
  NotFoundError,
  AuthError,
  ERROR_STATUS,
} from './domain/errors.js';

// Ports (implement these to extend the system)
export { EventRepository } from './ports/event-repository.js';
export { CryptoProvider } from './ports/crypto-provider.js';
export { ScheduleGateway } from './ports/schedule-gateway.js';
export { SessionStore } from './ports/session-store.js';

// Use cases
export { ScheduleService } from './services/schedule-service.js';

// Adapters
export { MemoryEventRepository } from './adapters/memory-event-repository.js';
export { HttpScheduleGateway } from './adapters/http-schedule-gateway.js';
export { LocalSessionStore } from './adapters/local-session-store.js';
// Server-only adapters are imported directly, so the browser bundle never
// pulls in `node:crypto` or the Netlify SDK:
//   core/adapters/node-crypto-provider.js
//   core/adapters/blob-event-repository.js
