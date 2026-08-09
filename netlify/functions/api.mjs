import { getStore } from '@netlify/blobs';
import { ScheduleService } from '../../core/services/schedule-service.js';
import { BlobEventRepository } from '../../core/adapters/blob-event-repository.js';
import { NodeCryptoProvider } from '../../core/adapters/node-crypto-provider.js';
import { DomainError, ERROR_STATUS } from '../../core/domain/errors.js';

/**
 * Transport only.
 *
 * Parses requests, calls a use case, serialises the result. No business rules
 * live here — swapping Netlify for Express or Lambda means rewriting this file
 * and nothing else.
 */

export const config = { path: '/api/*' };

let service;
function getService() {
  if (!service) {
    // Composition root for the server side.
    service = new ScheduleService({
      repository: new BlobEventRepository(
        getStore({ name: 'when2meet', consistency: 'strong' }),
      ),
      crypto: new NodeCryptoProvider(),
    });
  }
  return service;
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const readBody = async (req) => (await req.json().catch(() => null)) ?? {};

export default async function handler(req) {
  const segments = new URL(req.url).pathname
    .replace(/^\/api\/?/, '')
    .split('/')
    .filter(Boolean);

  try {
    return await route(req, segments);
  } catch (error) {
    if (error instanceof DomainError) {
      return json({ error: error.message }, ERROR_STATUS[error.code] ?? 400);
    }
    console.error('Unhandled API error:', error);
    return json({ error: 'Something went wrong.' }, 500);
  }
}

async function route(req, [resource, eventId, action]) {
  if (resource !== 'events') return json({ error: 'Not found.' }, 404);
  const api = getService();

  // /api/events
  if (!eventId) {
    if (req.method !== 'POST') return methodNotAllowed();
    return json(await api.createEvent(await readBody(req)), 201);
  }

  // /api/events/:id
  if (!action) {
    if (req.method !== 'GET') return methodNotAllowed();
    return json(await api.getEvent(eventId));
  }

  // /api/events/:id/:action
  const body = await readBody(req);
  switch (`${req.method} ${action}`) {
    case 'POST signin':
      return json(await api.signIn(eventId, body));
    case 'POST join':
      return json(await api.joinAnonymously(eventId));
    case 'POST rename':
      return json(await api.renameParticipant(eventId, body, body.name));
    // POST as well as PUT: sendBeacon can only issue POST.
    case 'PUT availability':
    case 'POST availability':
      return json(await api.saveAvailability(eventId, body, body.slots));
    case 'POST leave':
      return json(await api.leaveEvent(eventId, body));
    default:
      return methodNotAllowed();
  }
}

const methodNotAllowed = () => json({ error: 'Method not allowed.' }, 405);
