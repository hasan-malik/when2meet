/**
 * Renders every page once, for real, and fails on any crash.
 *
 * `vite build` happily compiles code that throws the instant React calls the
 * component — a use-before-declare, a bad hook order, a missing import. Those
 * reach production looking healthy, because probing the API never executes the
 * app. This does.
 */
import { renderToString } from 'react-dom/server';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { SystemProvider } from '../src/system/SystemProvider.jsx';
import { ScheduleGateway } from '../core/index.js';
import CreateEvent from '../src/pages/CreateEvent.jsx';
import EventPage from '../src/pages/EventPage.jsx';
import NotFound from '../src/pages/NotFound.jsx';

const EVENT = {
  id: 'abcdefghij',
  name: 'Dinner',
  mode: 'dates',
  dates: ['2026-08-15', '2026-08-16'],
  startMinute: 540,
  endMinute: 660,
  slotMinutes: 15,
  createdAt: 0,
};

class StubGateway extends ScheduleGateway {
  constructor(event) {
    super();
    this.event = event;
  }
  async createEvent() { return { event: this.event }; }
  async getEvent() { return { event: this.event, participants: [] }; }
  async signIn() { return { token: 't', participant: { id: 'p', name: 'A', slots: [] } }; }
  async joinAnonymously() { return { token: 't', participant: { id: 'p', name: 'Unnamed Panda', slots: [], anonymous: true } }; }
  async renameParticipant() { return { participant: { id: 'p', name: 'A', slots: [] } }; }
  async saveAvailability() { return { participant: { id: 'p', name: 'A', slots: [] } }; }
  saveOnUnload() {}
}

const sessionStore = { read: () => null, write() {}, clear() {} };

function render(label, element, path) {
  try {
    renderToString(
      <SystemProvider value={{ gateway: new StubGateway(EVENT), sessionStore }}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path={path} element={element} />
          </Routes>
        </MemoryRouter>
      </SystemProvider>,
    );
    console.log(`  ok    ${label}`);
    return true;
  } catch (error) {
    console.log(`  FAIL  ${label}\n        ${error.message}`);
    return false;
  }
}

const results = [
  render('create page', <CreateEvent />, '/'),
  render('event page', <EventPage />, '/e/abcdefghij'),
  render('not found', <NotFound />, '/nope'),
];

// A weekday event exercises a different projection and label path.
EVENT.mode = 'weekdays';
EVENT.dates = ['2024-01-01', '2024-01-03'];
results.push(render('event page (weekdays)', <EventPage />, '/e/abcdefghij'));

if (results.some((ok) => !ok)) process.exit(1);
console.log('\nevery page renders.');
