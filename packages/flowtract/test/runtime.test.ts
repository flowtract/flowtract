import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import {
  CleanupError,
  ConfigError,
  RequestContractError,
  ResponseParseError,
  TransportError,
  UndeclaredStatusError,
  bearerToken,
  createFlowtract,
  defineOperation,
  hasCleanupError,
  sessionAuth,
  type HttpTransport,
  type TransportRequest,
  type TransportResponse
} from '../src/index.js';

function jsonResponse(
  status: number,
  body: unknown,
  headers: readonly (readonly [string, string])[] = []
): TransportResponse {
  return {
    status,
    headers: [['content-type', 'application/json'], ...headers],
    body: new TextEncoder().encode(JSON.stringify(body)),
    url: 'http://service.local/final',
    durationMs: 4
  };
}

class RecordingTransport implements HttpTransport {
  readonly requests: TransportRequest[] = [];
  sessions = 0;
  disposals = 0;

  constructor(
    readonly responder: (request: TransportRequest, index: number) => Promise<TransportResponse>
  ) {}

  async createSession() {
    this.sessions += 1;
    return {
      execute: async (request: TransportRequest) => {
        this.requests.push(request);
        return this.responder(request, this.requests.length - 1);
      },
      dispose: async () => {
        this.disposals += 1;
      }
    };
  }
}

const Execute = defineOperation({
  id: 'items.execute',
  method: 'POST',
  path: '/items/{id}',
  request: {
    headers: z.object({ 'x-count': z.coerce.string().optional() }).default({}),
    pathParams: z.object({ id: z.coerce.string() }),
    query: z
      .object({
        page: z.coerce.number().transform(value => value + 1),
        tags: z.array(z.string()).optional()
      })
      .default({ page: 0 }),
    body: z.object({ count: z.coerce.number().transform(value => value * 2) })
  },
  responses: {
    201: {
      body: z.object({ id: z.string(), count: z.number() }).transform(value => ({
        ...value,
        accepted: true as const
      })),
      headers: z.object({ etag: z.string() })
    },
    default: { body: z.object({ message: z.string() }) }
  }
});

describe('Gate 2 runtime execution', () => {
  it('sends parsed output and returns transformed exact response output', async () => {
    const transport = new RecordingTransport(async () =>
      jsonResponse(201, { id: 'part-1', count: 8 }, [['etag', 'v1']])
    );
    const runtime = createFlowtract({
      baseURL: 'http://service.local/api/',
      operations: [Execute],
      transport
    });

    const result = await runtime.runScenario(scenario =>
      scenario.execute(
        Execute,
        {
          headers: {},
          pathParams: { id: 42 },
          query: { page: '2', tags: ['a', 'b'] },
          body: { count: '4' }
        },
        { headers: { 'X-Count': 3 } }
      )
    );

    expect(result).toMatchObject({
      status: 201,
      contractStatus: 201,
      body: { id: 'part-1', count: 8, accepted: true },
      headers: { etag: 'v1' }
    });
    expect(transport.requests[0]?.url).toBe(
      'http://service.local/api/items/42?page=3&tags=a&tags=b'
    );
    expect(Object.fromEntries(transport.requests[0]?.headers ?? [])).toMatchObject({
      'content-type': 'application/json',
      'x-count': '3'
    });
    expect(JSON.parse(new TextDecoder().decode(transport.requests[0]?.body))).toEqual({
      count: 8
    });
    expect(transport.disposals).toBe(1);
  });

  it('returns a redacted dry-run without sending the target request', async () => {
    const transport = new RecordingTransport(async () => jsonResponse(201, {}));
    const runtime = createFlowtract({
      baseURL: 'http://service.local',
      operations: [Execute],
      transport,
      allowInsecureTls: true
    });
    const scenario = await runtime.createScenario();
    scenario.setSecret('itemId', 'secret-id');
    const result = await scenario.execute(
      Execute,
      {
        headers: {},
        pathParams: { id: '{{itemId}}' },
        query: { page: 1 },
        body: { count: 2 }
      },
      { dryRun: true }
    );
    expect(result.dryRun).toBe(true);
    expect(result.url).not.toContain('secret-id');
    expect(result.warnings).toContain('TLS verification is disabled.');
    expect(transport.requests).toHaveLength(0);
    await scenario.close();
  });

  it('selects default contracts and rejects undeclared or malformed responses', async () => {
    const defaultTransport = new RecordingTransport(async () =>
      jsonResponse(422, { message: 'invalid' })
    );
    const result = await createFlowtract({
      baseURL: 'http://service.local',
      operations: [Execute],
      transport: defaultTransport
    }).runScenario(scenario =>
      scenario.execute(Execute, {
        headers: {},
        pathParams: { id: 'a' },
        query: { page: 1 },
        body: { count: 1 }
      })
    );
    expect(result).toMatchObject({ status: 422, contractStatus: 'default' });

    const Only = defineOperation({
      id: 'only',
      method: 'GET',
      path: '/only',
      responses: { 200: { body: z.object({ ok: z.boolean() }) } }
    });
    const undeclared = new RecordingTransport(async () => jsonResponse(404, {}));
    await expect(
      createFlowtract({
        baseURL: 'http://service.local',
        operations: [Only],
        transport: undeclared
      }).runScenario(scenario => scenario.execute(Only))
    ).rejects.toBeInstanceOf(UndeclaredStatusError);

    const malformed = new RecordingTransport(async () => ({
      status: 200,
      headers: [['content-type', 'application/json']],
      body: new TextEncoder().encode('{bad'),
      url: 'http://service.local/only',
      durationMs: 1
    }));
    await expect(
      createFlowtract({
        baseURL: 'http://service.local',
        operations: [Only],
        transport: malformed
      }).runScenario(scenario => scenario.execute(Only))
    ).rejects.toBeInstanceOf(ResponseParseError);
  });

  it('rejects unregistered objects, invalid option headers, and concurrent calls', async () => {
    let release!: () => void;
    const wait = new Promise<void>(resolve => {
      release = resolve;
    });
    const Get = defineOperation({
      id: 'get',
      method: 'GET',
      path: '/get',
      responses: { 200: { body: z.object({ ok: z.boolean() }) } }
    });
    const transport = new RecordingTransport(async () => {
      await wait;
      return jsonResponse(200, { ok: true });
    });
    const scenario = await createFlowtract({
      baseURL: 'http://service.local',
      operations: [Get],
      transport
    }).createScenario();
    const first = scenario.execute(Get);
    await expect(scenario.execute(Get)).rejects.toBeInstanceOf(ConfigError);
    release();
    await first;
    await expect(
      scenario.execute(Get, undefined, { headers: { trace: 'x' } })
    ).rejects.toBeInstanceOf(RequestContractError);
    const impostor = defineOperation({
      id: 'get',
      method: 'GET',
      path: '/other',
      responses: { 200: { body: z.unknown() } }
    });
    await expect(scenario.execute(impostor)).rejects.toBeInstanceOf(ConfigError);
    await scenario.close();
  });
});

describe('Gate 2 authentication and lifecycle', () => {
  it('applies bearer auth and redacts generated credentials', async () => {
    const token = 'generated-token-value';
    const Get = defineOperation({
      id: 'secured.get',
      method: 'GET',
      path: '/secured',
      auth: 'bearer',
      responses: { 200: { body: z.object({ ok: z.boolean() }) } }
    });
    const transport = new RecordingTransport(async () => jsonResponse(200, { ok: true }));
    const scenario = await createFlowtract({
      baseURL: 'http://service.local',
      operations: [Get],
      transport,
      auth: { bearer: bearerToken({ token }) }
    }).createScenario();
    await scenario.execute(Get);
    expect(Object.fromEntries(transport.requests[0]?.headers ?? [])).toMatchObject({
      authorization: `Bearer ${token}`
    });
    expect(JSON.stringify(scenario.diagnostics())).not.toContain(token);
    await scenario.close();
  });

  it('runs session setup once and applies extracted CSRF state', async () => {
    const loginSecret = ['synthetic', 'login', 'secret'].join('-');
    const Login = defineOperation({
      id: 'login',
      method: 'POST',
      path: '/login',
      request: { body: z.object({ password: z.string() }) },
      responses: { 200: { body: z.object({ csrf: z.string() }) } }
    });
    const Get = defineOperation({
      id: 'session.get',
      method: 'GET',
      path: '/secured',
      auth: 'session',
      responses: { 200: { body: z.object({ ok: z.boolean() }) } }
    });
    const transport = new RecordingTransport(async (_request, index) =>
      index === 0 ? jsonResponse(200, { csrf: 'csrf-secret' }) : jsonResponse(200, { ok: true })
    );
    const runtime = createFlowtract({
      baseURL: 'http://service.local',
      operations: [Login, Get],
      transport,
      auth: {
        session: sessionAuth({
          login: Login,
          input: { body: { password: loginSecret } },
          afterLogin: (result, state) => {
            if (result.status === 200) state.setSecret('csrf', result.body.csrf);
          },
          csrf: { state: 'csrf', header: 'x-csrf-token' }
        })
      }
    });
    await runtime.runScenario(async scenario => {
      await scenario.execute(Get);
      await scenario.execute(Get);
      expect(scenario.history().map(item => item.phase)).toEqual([
        'auth',
        'operation',
        'operation'
      ]);
    });
    expect(transport.requests).toHaveLength(3);
    expect(Object.fromEntries(transport.requests[1]?.headers ?? [])).toMatchObject({
      'x-csrf-token': 'csrf-secret'
    });
  });

  it('executes LIFO cleanup through the restricted client', async () => {
    const Delete = defineOperation({
      id: 'delete',
      method: 'DELETE',
      path: '/items/{id}',
      request: { pathParams: z.object({ id: z.string() }) },
      responses: { 204: { body: z.undefined() } }
    });
    const transport = new RecordingTransport(async () => ({
      status: 204,
      headers: [],
      body: new Uint8Array(),
      url: 'http://service.local/items/1',
      durationMs: 1
    }));
    const scenario = await createFlowtract({
      baseURL: 'http://service.local',
      operations: [Delete],
      transport
    }).createScenario();
    const order: string[] = [];
    scenario.registerCleanup('second', async client => {
      order.push('second');
      await client.execute(Delete, { pathParams: { id: '2' } });
    });
    scenario.registerCleanup('first', async client => {
      order.push('first');
      await client.execute(Delete, { pathParams: { id: '1' } });
    });
    await scenario.close();
    expect(order).toEqual(['first', 'second']);
    expect(scenario.history().map(item => item.phase)).toEqual(['cleanup', 'cleanup']);
    expect(transport.disposals).toBe(1);
  });

  it('retains a callback failure and attaches aggregated cleanup evidence', async () => {
    const transport = new RecordingTransport(async () => jsonResponse(200, {}));
    const runtime = createFlowtract({
      baseURL: 'http://service.local',
      operations: [
        defineOperation({
          id: 'unused',
          method: 'GET',
          path: '/unused',
          responses: { 200: { body: z.unknown() } }
        })
      ],
      transport
    });
    const primary = new Error('primary');
    let observed: unknown;
    try {
      await runtime.runScenario(async scenario => {
        scenario.registerCleanup('one', () => {
          throw new Error('cleanup one');
        });
        scenario.registerCleanup('two', () => {
          throw new Error('cleanup two');
        });
        throw primary;
      });
    } catch (error) {
      observed = error;
    }
    expect(observed).toBe(primary);
    expect(hasCleanupError(observed)).toBe(true);
    if (hasCleanupError(observed)) {
      expect(observed.cleanupError).toBeInstanceOf(CleanupError);
      expect(observed.cleanupError.details?.failures.map(item => item.label)).toEqual([
        'two',
        'one'
      ]);
    }
  });

  it('maps transport session creation failure', async () => {
    const operation = defineOperation({
      id: 'x',
      method: 'GET',
      path: '/x',
      responses: { 200: { body: z.unknown() } }
    });
    await expect(
      createFlowtract({
        baseURL: 'http://service.local',
        operations: [operation],
        transport: {
          createSession: vi.fn(async () => {
            throw new Error('broken');
          })
        }
      }).createScenario()
    ).rejects.toBeInstanceOf(TransportError);
  });
});
