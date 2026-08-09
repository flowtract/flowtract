import { createFlowtract, defineOperation, emptyBody } from 'flowtract';
import { z } from 'zod';

const Create = defineOperation({
  id: 'lifecycle.create',
  method: 'POST',
  path: '/items',
  responses: { 201: { body: z.object({ id: z.string() }) } }
});
const Conflict = defineOperation({
  id: 'lifecycle.conflict',
  method: 'POST',
  path: '/conflict',
  responses: { 409: { body: z.object({ code: z.literal('duplicate') }) } }
});
const Delete = defineOperation({
  id: 'lifecycle.delete',
  method: 'DELETE',
  path: '/items/{id}',
  request: { pathParams: z.object({ id: z.string() }) },
  responses: { 204: { body: emptyBody() } }
});

const resources = new Set();
let sessions = 0;
let disposals = 0;
const transport = {
  async createSession() {
    sessions += 1;
    return {
      async execute(request) {
        if (request.url.endsWith('/items') && request.method === 'POST') {
          resources.add('item-1');
          return response(request, 201, { id: 'item-1' });
        }
        if (request.url.endsWith('/conflict')) return response(request, 409, { code: 'duplicate' });
        resources.delete('item-1');
        return {
          status: 204,
          headers: [],
          body: new Uint8Array(),
          url: request.url,
          durationMs: 0
        };
      },
      async dispose() {
        disposals += 1;
      }
    };
  }
};
function response(request, status, body) {
  return {
    status,
    headers: [['content-type', 'application/json']],
    body: new TextEncoder().encode(JSON.stringify(body)),
    url: request.url,
    durationMs: 0
  };
}

const primary = new Error('expected primary failure');
let caught;
try {
  await createFlowtract({
    baseURL: 'http://lifecycle.demo',
    operations: [Create, Conflict, Delete],
    transport
  }).runScenario(async scenario => {
    const created = await scenario.execute(Create);
    scenario.registerCleanup('delete-created-item', client =>
      client.execute(Delete, { pathParams: { id: created.body.id } }).then(() => undefined)
    );
    const conflict = await scenario.execute(Conflict);
    if (conflict.status !== 409 || conflict.body.code !== 'duplicate') {
      throw new Error('Declared failure contract was not preserved.');
    }
    throw primary;
  });
} catch (error) {
  caught = error;
}
if (caught !== primary || resources.size !== 0 || sessions !== 1 || disposals !== 1) {
  throw new Error('Lifecycle cleanup or primary-error preservation failed.');
}
console.log('lifecycle-workflow: passed');
