import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import { createFlowtract, defineOperation, emptyBody, sessionAuth } from 'flowtract';
import { z } from 'zod';

const credentials = { username: `user-${randomUUID()}`, password: randomUUID() };
const sessions = new Map();
const items = new Map();
const sockets = new Set();

function json(response, status, body, headers = {}) {
  response.writeHead(status, { 'content-type': 'application/json', ...headers });
  response.end(JSON.stringify(body));
}

async function body(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function session(request) {
  const id = /(?:^|; )sid=([^;]+)/u.exec(request.headers.cookie ?? '')?.[1];
  return id === undefined ? undefined : sessions.get(id);
}

const server = createServer(async (request, response) => {
  try {
    if (request.method === 'POST' && request.url === '/login') {
      const input = await body(request);
      if (input.username !== credentials.username || input.password !== credentials.password) {
        return json(response, 401, { message: 'denied' });
      }
      const id = randomUUID();
      const csrf = randomUUID();
      sessions.set(id, { id, csrf });
      return json(response, 200, { csrf }, { 'set-cookie': `sid=${id}; Path=/; HttpOnly` });
    }
    const current = session(request);
    if (current === undefined || request.headers['x-csrf-token'] !== current.csrf) {
      return json(response, 403, { message: 'denied' });
    }
    if (request.method === 'POST' && request.url === '/items') {
      const input = await body(request);
      const item = { id: randomUUID(), name: input.name, owner: current.id };
      items.set(item.id, item);
      return json(response, 201, { id: item.id, name: item.name });
    }
    const id = request.url?.split('/')[2];
    const item = id === undefined ? undefined : items.get(id);
    if (item === undefined || item.owner !== current.id)
      return json(response, 404, { message: 'missing' });
    if (request.method === 'GET') return json(response, 200, { id: item.id, name: item.name });
    if (request.method === 'DELETE') {
      items.delete(item.id);
      response.writeHead(204);
      return response.end();
    }
    return json(response, 404, { message: 'missing' });
  } catch {
    return json(response, 500, { message: 'request failed' });
  }
});
server.on('connection', socket => {
  sockets.add(socket);
  socket.on('close', () => sockets.delete(socket));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

const ErrorBody = z.object({ message: z.string() });
const Item = z.object({ id: z.string(), name: z.string() });
const Login = defineOperation({
  id: 'demo.login',
  method: 'POST',
  path: '/login',
  request: { body: z.object({ username: z.string(), password: z.string() }) },
  responses: { 200: { body: z.object({ csrf: z.string() }) }, 401: { body: ErrorBody } }
});
const Create = defineOperation({
  id: 'demo.create',
  method: 'POST',
  path: '/items',
  auth: 'session',
  request: { body: z.object({ name: z.string() }) },
  responses: { 201: { body: Item }, 403: { body: ErrorBody } }
});
const Get = defineOperation({
  id: 'demo.get',
  method: 'GET',
  path: '/items/{id}',
  auth: 'session',
  request: { pathParams: z.object({ id: z.string() }) },
  responses: { 200: { body: Item }, 404: { body: ErrorBody } }
});
const Delete = defineOperation({
  id: 'demo.delete',
  method: 'DELETE',
  path: '/items/{id}',
  auth: 'session',
  request: { pathParams: z.object({ id: z.string() }) },
  responses: { 204: { body: emptyBody() }, 404: { body: ErrorBody } }
});

const address = server.address();
if (address === null || typeof address === 'string') throw new Error('Demo server did not bind.');
const runtime = createFlowtract({
  baseURL: `http://127.0.0.1:${address.port}`,
  operations: [Login, Create, Get, Delete],
  auth: {
    session: sessionAuth({
      login: Login,
      input: state => ({
        body: {
          username: String(state.require('username')),
          password: String(state.require('password'))
        }
      }),
      afterLogin(result, state) {
        if (result.status === 200) state.setSecret('csrf', result.body.csrf);
      },
      csrf: { state: 'csrf', header: 'x-csrf-token' }
    })
  }
});

const scenarios = [await runtime.createScenario(), await runtime.createScenario()];
let closeFailures = 0;
try {
  for (const scenario of scenarios) {
    scenario.setSecret('username', credentials.username);
    scenario.setSecret('password', credentials.password);
  }
  const created = await Promise.all(
    scenarios.map((scenario, index) =>
      scenario.execute(Create, { body: { name: `item-${index}` } })
    )
  );
  for (const [index, result] of created.entries()) {
    if (result.status !== 201) throw new Error('Authenticated create failed.');
    scenarios[index].registerCleanup(`delete-${index}`, client =>
      client.execute(Delete, { pathParams: { id: result.body.id } }).then(() => undefined)
    );
  }
  const denied = await scenarios[0].execute(Get, { pathParams: { id: created[1].body.id } });
  if (denied.status !== 404 || new Set([...sessions.keys()]).size !== 2) {
    throw new Error('Scenario isolation proof failed.');
  }
  const diagnostics = JSON.stringify(scenarios.flatMap(scenario => scenario.diagnostics()));
  for (const secret of [credentials.username, credentials.password, ...sessions.keys()]) {
    if (diagnostics.includes(secret))
      throw new Error('A generated secret escaped into diagnostics.');
  }
} finally {
  const closed = await Promise.allSettled(scenarios.map(scenario => scenario.close()));
  closeFailures = closed.filter(result => result.status === 'rejected').length;
  const serverClosed = new Promise(resolve => server.close(resolve));
  server.closeAllConnections();
  await serverClosed;
  await new Promise(resolve => setImmediate(resolve));
}
const activeSockets = [...sockets].filter(socket => !socket.destroyed).length;
if (items.size !== 0 || activeSockets !== 0 || closeFailures !== 0) {
  throw new Error(
    `Authenticated demo leaked resources: items=${items.size}, sockets=${activeSockets}, closeFailures=${closeFailures}.`
  );
}
console.log('authenticated-workflow: passed');
