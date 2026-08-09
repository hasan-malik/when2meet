/**
 * Port: the entire surface the UI is allowed to touch.
 *
 * Four methods, nothing else. A UI written against this contract works
 * unchanged whether it is talking to an HTTP API, an in-process service with
 * an in-memory store, or a mock in a test.
 *
 * `ScheduleService` (server side) and `HttpScheduleGateway` (browser side)
 * both satisfy it, which is what makes the two interchangeable.
 */
export class ScheduleGateway {
  /**
   * @param {object} input name, dates, startMinute, endMinute, slotMinutes, timezone
   * @returns {Promise<{event: object}>}
   */
  async createEvent(input) {
    throw notImplemented('createEvent');
  }

  /** @returns {Promise<{event: object, participants: object[]}>} */
  async getEvent(eventId) {
    throw notImplemented('getEvent');
  }

  /**
   * Claim a name on an event. Creates the participant on first use; afterwards
   * the password (if one was set) must match.
   * @returns {Promise<{token: string, participant: object}>}
   */
  async signIn(eventId, { name, password }) {
    throw notImplemented('signIn');
  }

  /**
   * Join with no name at all, taking the next free animal label.
   * @returns {Promise<{token: string, participant: object}>}
   */
  async joinAnonymously(eventId) {
    throw notImplemented('joinAnonymously');
  }

  /** Put a name to an anonymous row. @returns {Promise<{participant: object}>} */
  async renameParticipant(eventId, { participantId, token }, name) {
    throw notImplemented('renameParticipant');
  }

  /** @returns {Promise<{participant: object}>} */
  async saveAvailability(eventId, { participantId, token }, slots) {
    throw notImplemented('saveAvailability');
  }

  /**
   * Save while the page is being torn down. Implementations must hand the
   * write to something that outlives the document — a normal request is
   * routinely cancelled on navigation. Fire-and-forget: no result is available
   * to report, because nothing will be around to read it.
   */
  saveOnUnload(eventId, { participantId, token }, slots) {
    throw notImplemented('saveOnUnload');
  }
}

const notImplemented = (method) =>
  new Error(`ScheduleGateway.${method}() is not implemented by this adapter.`);
