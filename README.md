# pickatime

Find a time that works for everyone. Create an event, share the link, drag to
paint when you're free. No accounts, no install.

Live at **https://pickatime.netlify.app**

## Running it

```bash
npm install
npm run dev          # http://localhost:8888
```

`netlify dev` serves the React app and the API function together, with a local
Netlify Blobs sandbox standing in for production storage.

```bash
npm run build        # production bundle into dist/
npm run deploy       # build + push to Netlify
```

## Architecture

The **system** and the **UI** are separate, and the dependency arrow only ever
points inward. You can replace either side without touching the other.

```
core/                     the system — no React, no DOM, no fetch, no SDKs
  domain/                 entities and rules; depends on nothing
    event.js              what times an event offers, and what makes one valid
    participant.js        identity, sessions, the public projection
    schedule.js           projects slots onto a (date x time) plane
    selection.js          drag-painting as pure set algebra
    availability.js       tallies, intensity, best windows
    slot.js               slot identity: wall-clock ids, pure arithmetic
    errors.js             ValidationError / AuthError / NotFoundError
  ports/                  the seams — interfaces, no implementations
    event-repository.js   what storage must provide
    crypto-provider.js    what hashing must provide
    schedule-gateway.js   the whole surface the UI may touch (4 methods)
    session-store.js      where a client keeps credentials
  services/
    schedule-service.js   every use case, depending only on ports
  adapters/               one vendor each, all swappable
    blob-event-repository.js    Netlify Blobs
    memory-event-repository.js  in-memory (tests, local)
    node-crypto-provider.js     scrypt + sha256
    http-schedule-gateway.js    REST, for the browser
    local-session-store.js      localStorage

netlify/functions/api.mjs   transport only: parse, call a use case, serialise
src/                        the UI — imports ports and pure functions, nothing else
  system/                   composition root + React context injecting the ports
  hooks/                    stateful glue (loading, polling, autosave, gestures)
  components/               presentation
  pages/
```

### Swapping the UI

A UI needs exactly one thing: something implementing
[`ScheduleGateway`](core/ports/schedule-gateway.js) — four methods.
`src/system/index.js` is the only file that names a concrete implementation.

Everything else the UI uses is a pure function you can call from anywhere:
`projectSchedule` for layout, `previewDrag` for selection, `tallyAvailability`
and `findBestWindows` for aggregation. None of them know what a component is.

### Swapping the backend

Implement [`EventRepository`](core/ports/event-repository.js) — six methods —
and pass it to `ScheduleService`. Supabase or Postgres would slot in beside
`BlobEventRepository` with no change anywhere else.

### Running the whole system with no network

Because `ScheduleService` implements the same `ScheduleGateway` the UI depends
on, you can hand it to the UI directly:

```js
const gateway = new ScheduleService({
  repository: new MemoryEventRepository(),
  crypto: new NodeCryptoProvider(),
});
<SystemProvider value={{ gateway, sessionStore }}>
```

That substitutability is the point of the port, and it is how the core is
tested — no HTTP, no browser, no Netlify.

## How it works

- There are **no timezones**. This is for people in the same place, so a slot
  is a wall-clock coordinate — one integer, `daysSinceEpoch * 1440 +
  minuteOfDay` — not an instant. Nothing ever converts between zones.
- The grid is fixed at **15 minute** cells, matching When2Meet. Not
  configurable; the server ignores any slot length a client sends.
- Each participant is a **separate storage key**, so two people saving at the
  same moment cannot overwrite each other.
- Identity is the normalised name, as on the original site. A password is
  optional and only guards editing your own row; it's hashed with scrypt.
- Edits save on pointer-release. The local selection stays authoritative while
  you drag, so a background refresh can't clobber a stroke in progress.
