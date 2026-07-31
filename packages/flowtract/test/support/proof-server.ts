import { randomUUID } from 'node:crypto';
import {
  createServer as createHttpServer,
  type IncomingMessage,
  type ServerResponse
} from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import type { AddressInfo, Socket } from 'node:net';
import { generate } from 'selfsigned';

type Part = { id: string; name: string; count: number };
type Session = { id: string; csrf: string; parts: Map<string, Part> };

function send(response: ServerResponse, status: number, body?: unknown, headers = {}): void {
  response.writeHead(status, {
    ...(body === undefined ? {} : { 'content-type': 'application/json' }),
    ...headers
  });
  response.end(body === undefined ? undefined : JSON.stringify(body));
}

async function json(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) chunks.push(Buffer.from(chunk));
  return chunks.length === 0 ? undefined : JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function cookie(request: IncomingMessage, name: string): string | undefined {
  for (const entry of request.headers.cookie?.split(';') ?? []) {
    const [key, ...value] = entry.trim().split('=');
    if (key === name) return value.join('=');
  }
  return undefined;
}

export interface ProofServer {
  readonly baseURL: string;
  readonly secureURL: string;
  readonly internalFailureMarker: string;
  readonly credentials: {
    readonly username: string;
    readonly password: string;
    readonly bearer: string;
    readonly apiKey: string;
  };
  readonly stats: {
    readonly sessionIds: readonly string[];
    readonly csrfTokens: readonly string[];
    readonly partCount: number;
    readonly activeRequests: number;
    readonly activeSockets: number;
  };
  close(): Promise<void>;
}

export async function startProofServer(): Promise<ProofServer> {
  const internalFailureMarker = `internal-failure-${randomUUID()}`;
  const credentials = Object.freeze({
    username: `user-${randomUUID()}`,
    password: `password-${randomUUID()}`,
    bearer: `bearer-${randomUUID()}`,
    apiKey: `key-${randomUUID()}`
  });
  const sessions = new Map<string, Session>();
  const sockets = new Set<Socket>();
  let activeRequests = 0;

  const handler = async (request: IncomingMessage, response: ServerResponse): Promise<void> => {
    activeRequests += 1;
    try {
      const url = new URL(request.url ?? '/', 'http://proof.local');
      if (request.method === 'POST' && url.pathname === '/auth/session') {
        const input = (await json(request)) as { username?: string; password?: string };
        if (input?.username !== credentials.username || input.password !== credentials.password) {
          send(response, 401, { message: 'invalid credentials' });
          return;
        }
        const id = randomUUID();
        const csrf = `csrf-${randomUUID()}`;
        sessions.set(id, { id, csrf, parts: new Map() });
        send(response, 200, { csrf }, { 'set-cookie': `session=${id}; HttpOnly; Path=/` });
        return;
      }
      if (url.pathname === '/auth/bearer') {
        send(
          response,
          request.headers.authorization === `Bearer ${credentials.bearer}` ? 200 : 401,
          { ok: request.headers.authorization === `Bearer ${credentials.bearer}` }
        );
        return;
      }
      if (url.pathname === '/auth/api-key') {
        const valid =
          request.headers['x-api-key'] === credentials.apiKey ||
          url.searchParams.get('api_key') === credentials.apiKey;
        send(response, valid ? 200 : 401, { ok: valid });
        return;
      }
      if (url.pathname === '/auth/basic') {
        const expected = `Basic ${Buffer.from(
          `${credentials.username}:${credentials.password}`
        ).toString('base64')}`;
        const valid = request.headers.authorization === expected;
        send(response, valid ? 200 : 401, { ok: valid });
        return;
      }
      if (url.pathname === '/responses/text') {
        response.writeHead(200, { 'content-type': 'text/plain; charset=utf-8' });
        response.end('hello');
        return;
      }
      if (url.pathname === '/responses/empty') {
        response.writeHead(204);
        response.end();
        return;
      }
      if (url.pathname === '/responses/bad-json') {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end('{bad');
        return;
      }
      if (url.pathname === '/responses/delay') {
        await new Promise(resolve => setTimeout(resolve, 150));
        send(response, 200, { ok: true });
        return;
      }
      if (url.pathname === '/responses/internal-error') {
        throw new Error(internalFailureMarker);
      }

      const session = sessions.get(cookie(request, 'session') ?? '');
      if (session === undefined) {
        send(response, 401, { message: 'unauthenticated' });
        return;
      }
      const partMatch = /^\/parts\/([^/]+)$/u.exec(url.pathname);
      const csrfValid = request.headers['x-csrf-token'] === session.csrf;
      if (request.method === 'POST' && url.pathname === '/parts') {
        if (!csrfValid) {
          send(response, 403, { message: 'invalid csrf' });
          return;
        }
        const input = (await json(request)) as { name: string; count: number };
        const part = { id: randomUUID(), name: input.name, count: input.count };
        session.parts.set(part.id, part);
        send(response, 201, part);
        return;
      }
      if (partMatch !== null && request.method === 'GET') {
        const part = session.parts.get(partMatch[1] ?? '');
        send(response, part === undefined ? 404 : 200, part ?? { message: 'not found' });
        return;
      }
      if (partMatch !== null && request.method === 'PATCH') {
        if (!csrfValid) {
          send(response, 403, { message: 'invalid csrf' });
          return;
        }
        const existing = session.parts.get(partMatch[1] ?? '');
        if (existing === undefined) {
          send(response, 404, { message: 'not found' });
          return;
        }
        const input = (await json(request)) as Partial<Pick<Part, 'name' | 'count'>>;
        const updated = { ...existing, ...input };
        session.parts.set(existing.id, updated);
        send(response, 200, updated);
        return;
      }
      if (partMatch !== null && request.method === 'DELETE') {
        if (!csrfValid) {
          send(response, 403, { message: 'invalid csrf' });
          return;
        }
        const deleted = session.parts.delete(partMatch[1] ?? '');
        send(response, deleted ? 204 : 404, deleted ? undefined : { message: 'not found' });
        return;
      }
      send(response, 404, { message: 'not found' });
    } catch {
      send(response, 500, { message: 'server error' });
    } finally {
      activeRequests -= 1;
    }
  };

  const certificate = await generate([{ name: 'commonName', value: 'localhost' }], {
    keySize: 2048,
    algorithm: 'sha256',
    extensions: [
      { name: 'basicConstraints', cA: false },
      { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' }
        ]
      }
    ]
  });
  const http = createHttpServer((request, response) => void handler(request, response));
  const https = createHttpsServer(
    { key: certificate.private, cert: certificate.cert },
    (request, response) => void handler(request, response)
  );
  for (const server of [http, https]) {
    server.on('connection', socket => {
      sockets.add(socket);
      socket.once('close', () => sockets.delete(socket));
    });
  }
  await Promise.all([
    new Promise<void>((resolve, reject) => {
      http.once('error', reject);
      http.listen(0, '127.0.0.1', resolve);
    }),
    new Promise<void>((resolve, reject) => {
      https.once('error', reject);
      https.listen(0, '127.0.0.1', resolve);
    })
  ]);
  const httpAddress = http.address() as AddressInfo;
  const httpsAddress = https.address() as AddressInfo;

  return {
    baseURL: `http://127.0.0.1:${httpAddress.port}`,
    secureURL: `https://127.0.0.1:${httpsAddress.port}`,
    internalFailureMarker,
    credentials,
    get stats() {
      return {
        sessionIds: Object.freeze([...sessions.keys()]),
        csrfTokens: Object.freeze([...sessions.values()].map(session => session.csrf)),
        partCount: [...sessions.values()].reduce((sum, session) => sum + session.parts.size, 0),
        activeRequests,
        activeSockets: sockets.size
      };
    },
    async close() {
      const deadline = Date.now() + 2000;
      while (activeRequests !== 0 && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      await Promise.all([
        new Promise<void>((resolve, reject) =>
          http.close(error => (error === undefined ? resolve() : reject(error)))
        ),
        new Promise<void>((resolve, reject) =>
          https.close(error => (error === undefined ? resolve() : reject(error)))
        )
      ]);
      while (sockets.size !== 0 && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      if (activeRequests !== 0 || sockets.size !== 0) {
        throw new Error(
          `Proof server leaked ${activeRequests} request(s) and ${sockets.size} socket(s).`
        );
      }
    }
  };
}
