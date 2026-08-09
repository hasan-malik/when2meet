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

  /** @returns {Promise<{participant: object}>} */
  async saveAvailability(eventId, { participantId, token }, slots) {
    throw notImplemented('saveAvailability');
  }
}

const notImplemented = (method) =>
  new Error(`ScheduleGateway.${method}() is not implemented by this adapter.`);
