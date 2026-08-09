import { HttpScheduleGateway, LocalSessionStore } from '../../core/index.js';

/**
 * Composition root for the browser.
 *
 * The one file that chooses concrete implementations. Every other UI module
 * receives them through `SystemProvider` and sees only the port's interface —
 * so pointing the app at a different backend, or at an in-process
 * `ScheduleService` with a `MemoryEventRepository`, is a change here alone.
 */
export function createSystem(overrides = {}) {
  return {
    gateway: overrides.gateway ?? new HttpScheduleGateway({ baseUrl: '/api' }),
    sessionStore: overrides.sessionStore ?? new LocalSessionStore(),
  };
}
