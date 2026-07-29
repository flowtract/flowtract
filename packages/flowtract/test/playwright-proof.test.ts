import { z } from 'zod';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  ResponseParseError,
  apiKey,
  basicAuth,
  bearerToken,
  createFlowtract,
  defineOperation,
  emptyBody,
  sessionAuth
} from '../src/index.js';
import { startProofServer, type ProofServer } from './support/proof-server.js';

const ErrorBody = z.object({ message: z.string() });
const Part = z.object({ id: z.string(), name: z.string(), count: z.number() });
const Login = defineOperation({
  id: 'proof.login',
  method: 'POST',
  path: '/auth/session',
  request: { body: z.object({ username: z.string(), password: z.string() }) },
  responses: {
    200: { body: z.object({ csrf: z.string() }) },
    401: { body: ErrorBody }
  }
});
const Create = defineOperation({
  id: 'proof.create',
  method: 'POST',
  path: '/parts',
  auth: 'session',
  request: { body: z.object({ name: z.string(), count: z.number() }) },
  responses: { 201: { body: Part }, 403: { body: ErrorBody } }
});
const Get = defineOperation({
  id: 'proof.get',
  method: 'GET',
  path: '/parts/{id}',
  auth: 'session',
  request: { pathParams: z.object({ id: z.string() }) },
  responses: { 200: { body: Part }, 404: { body: ErrorBody } }
});
const Update = defineOperation({
  id: 'proof.update',
  method: 'PATCH',
  path: '/parts/{id}',
  auth: 'session',
  request: {
    pathParams: z.object({ id: z.string() }),
    body: z.object({ count: z.number() })
  },
  responses: { 200: { body: Part }, 404: { body: ErrorBody } }
});
const Delete = defineOperation({
  id: 'proof.delete',
  method: 'DELETE',
  path: '/parts/{id}',
  auth: 'session',
  request: { pathParams: z.object({ id: z.string() }) },
  responses: { 204: { body: emptyBody() }, 404: { body: ErrorBody } }
});

let server: ProofServer;

beforeAll(async () => {
  server = await startProofServer();
});

afterAll(async () => {
  await server.close();
});

describe('Playwright Gate 2 proof', () => {
  it('executes eight isolated session/CSRF CRUD scenarios in parallel', async () => {
    const runtime = createFlowtract({
      baseURL: server.baseURL,
      operations: [Login, Create, Get, Update, Delete],
      auth: {
        session: sessionAuth({
          login: Login,
          input: state => ({
            body: {
              username: String(state.require('username')),
              password: String(state.require('password'))
            }
          }),
          afterLogin: (result, state) => {
            if (result.status === 200) state.setSecret('csrf', result.body.csrf);
          },
          csrf: { state: 'csrf', header: 'x-csrf-token' }
        })
      }
    });
    const count = 8;
    const ids: string[] = [];
    let release!: () => void;
    const allCreated = new Promise<void>(resolve => {
      release = resolve;
    });
    const diagnostics: string[] = [];

    await Promise.all(
      Array.from({ length: count }, (_, index) =>
        runtime.runScenario(async scenario => {
          scenario.setSecret('username', server.credentials.username);
          scenario.setSecret('password', server.credentials.password);
          const created = await scenario.execute(Create, {
            body: { name: `part-${index}`, count: index }
          });
          if (created.status !== 201) throw new Error('Create failed.');
          ids[index] = created.body.id;
          scenario.registerCleanup(`delete-${index}`, client =>
            client.execute(Delete, { pathParams: { id: created.body.id } }).then(() => undefined)
          );
          if (ids.filter(Boolean).length === count) release();
          await allCreated;

          const other = ids[(index + 1) % count];
          if (other === undefined) throw new Error('Missing parallel part id.');
          const denied = await scenario.execute(Get, { pathParams: { id: other } });
          expect(denied.status).toBe(404);
          const own = await scenario.execute(Get, { pathParams: { id: created.body.id } });
          expect(own.status).toBe(200);
          const updated = await scenario.execute(Update, {
            pathParams: { id: created.body.id },
            body: { count: index + 100 }
          });
          expect(updated.status).toBe(200);
          if (updated.status === 200) expect(updated.body.count).toBe(index + 100);
          diagnostics.push(JSON.stringify(scenario.diagnostics()));
        })
      )
    );

    expect(new Set(server.stats.sessionIds).size).toBe(count);
    expect(new Set(server.stats.csrfTokens).size).toBe(count);
    expect(server.stats.partCount).toBe(0);
    const captured = diagnostics.join('\n');
    for (const secret of [
      server.credentials.username,
      server.credentials.password,
      ...server.stats.sessionIds,
      ...server.stats.csrfTokens
    ]) {
      expect(captured).not.toContain(secret);
    }
  });

  it('proves bearer, API key, and basic providers', async () => {
    const Bearer = defineOperation({
      id: 'proof.bearer',
      method: 'GET',
      path: '/auth/bearer',
      auth: 'bearer',
      responses: { 200: { body: z.object({ ok: z.literal(true) }) } }
    });
    const HeaderKey = defineOperation({
      id: 'proof.header-key',
      method: 'GET',
      path: '/auth/api-key',
      auth: 'headerKey',
      responses: { 200: { body: z.object({ ok: z.literal(true) }) } }
    });
    const QueryKey = defineOperation({
      id: 'proof.query-key',
      method: 'GET',
      path: '/auth/api-key',
      auth: 'queryKey',
      responses: { 200: { body: z.object({ ok: z.literal(true) }) } }
    });
    const Basic = defineOperation({
      id: 'proof.basic',
      method: 'GET',
      path: '/auth/basic',
      auth: 'basic',
      responses: { 200: { body: z.object({ ok: z.literal(true) }) } }
    });
    const runtime = createFlowtract({
      baseURL: server.baseURL,
      operations: [Bearer, HeaderKey, QueryKey, Basic],
      auth: {
        bearer: bearerToken({ token: server.credentials.bearer }),
        headerKey: apiKey({
          in: 'header',
          name: 'x-api-key',
          value: server.credentials.apiKey
        }),
        queryKey: apiKey({
          in: 'query',
          name: 'api_key',
          value: server.credentials.apiKey
        }),
        basic: basicAuth({
          username: server.credentials.username,
          password: server.credentials.password
        })
      }
    });
    await runtime.runScenario(async scenario => {
      await expect(scenario.execute(Bearer)).resolves.toMatchObject({ status: 200 });
      await expect(scenario.execute(HeaderKey)).resolves.toMatchObject({ status: 200 });
      await expect(scenario.execute(QueryKey)).resolves.toMatchObject({ status: 200 });
      await expect(scenario.execute(Basic)).resolves.toMatchObject({ status: 200 });
    });
  });

  it('handles text, empty, malformed JSON, timeout, and caller abort', async () => {
    const Text = defineOperation({
      id: 'proof.text',
      method: 'GET',
      path: '/responses/text',
      responses: { 200: { body: z.literal('hello') } }
    });
    const Empty = defineOperation({
      id: 'proof.empty',
      method: 'GET',
      path: '/responses/empty',
      responses: { 204: { body: emptyBody() } }
    });
    const Bad = defineOperation({
      id: 'proof.bad',
      method: 'GET',
      path: '/responses/bad-json',
      responses: { 200: { body: z.unknown() } }
    });
    const Delay = defineOperation({
      id: 'proof.delay',
      method: 'GET',
      path: '/responses/delay',
      responses: { 200: { body: z.object({ ok: z.boolean() }) } }
    });
    const runtime = createFlowtract({
      baseURL: server.baseURL,
      operations: [Text, Empty, Bad, Delay]
    });
    await runtime.runScenario(async scenario => {
      await expect(scenario.execute(Text)).resolves.toMatchObject({ body: 'hello' });
      await expect(scenario.execute(Empty)).resolves.toMatchObject({ body: undefined });
      await expect(scenario.execute(Bad)).rejects.toBeInstanceOf(ResponseParseError);
      await expect(scenario.execute(Delay, undefined, { timeoutMs: 10 })).rejects.toMatchObject({
        details: { kind: 'timeout' }
      });
      const controller = new AbortController();
      controller.abort();
      await expect(
        scenario.execute(Delay, undefined, { signal: controller.signal })
      ).rejects.toMatchObject({ details: { kind: 'abort' } });
    });
  });

  it('keeps TLS verification secure by default and allows explicit opt-out', async () => {
    const Text = defineOperation({
      id: 'proof.tls',
      method: 'GET',
      path: '/responses/text',
      responses: { 200: { body: z.literal('hello') } }
    });
    const secure = createFlowtract({
      baseURL: server.secureURL,
      operations: [Text]
    });
    await expect(secure.runScenario(scenario => scenario.execute(Text))).rejects.toMatchObject({
      code: 'FLOWTRACT_TRANSPORT',
      details: { kind: 'tls' }
    });

    const insecure = createFlowtract({
      baseURL: server.secureURL,
      operations: [Text],
      allowInsecureTls: true
    });
    await expect(insecure.runScenario(scenario => scenario.execute(Text))).resolves.toMatchObject({
      status: 200
    });
  });
});
