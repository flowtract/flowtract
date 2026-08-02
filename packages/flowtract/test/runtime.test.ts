import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import {
  AuthError,
  CleanupError,
  ConfigError,
  RequestContractError,
  ResponseParseError,
  TransportError,
  UndeclaredStatusError,
  basicAuth,
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

  it('does not invoke a custom transport for an already-aborted request', async () => {
    const Get = defineOperation({
      id: 'aborted.get',
      method: 'GET',
      path: '/aborted',
      responses: { 200: { body: z.object({ ok: z.boolean() }) } }
    });
    const transport = new RecordingTransport(async () => jsonResponse(200, { ok: true }));
    const scenario = await createFlowtract({
      baseURL: 'http://service.local',
      operations: [Get],
      transport
    }).createScenario();
    const controller = new AbortController();
    controller.abort(new Error('caller stopped'));

    await expect(
      scenario.execute(Get, undefined, { signal: controller.signal })
    ).rejects.toMatchObject({
      code: 'FLOWTRACT_TRANSPORT',
      details: { kind: 'abort' }
    });
    expect(transport.requests).toHaveLength(0);
    expect(scenario.diagnostics().at(-1)?.phase).toBe('transport');
    await scenario.close();
  });

  it('redacts tainted Zod messages and transformed secret response previews', async () => {
    const rawSecret = 'raw-secret-value';
    const transformedSecret = `derived:${rawSecret}`;
    const Reject = defineOperation({
      id: 'secret.reject',
      method: 'POST',
      path: '/secret',
      request: {
        body: z.object({
          value: z
            .string()
            .transform(value => `derived:${value}`)
            .superRefine((value, context) => {
              context.addIssue({ code: 'custom', message: `rejected ${value}` });
            })
        })
      },
      responses: { 200: { body: z.unknown() } }
    });
    const Transform = defineOperation({
      id: 'secret.transform',
      method: 'POST',
      path: '/secret',
      request: { body: z.object({ value: z.string().transform(value => `derived:${value}`) }) },
      responses: { 200: { body: z.unknown() } }
    });
    const transport = new RecordingTransport(async () => ({
      status: 200,
      headers: [['content-type', 'application/json']],
      body: new TextEncoder().encode(`{"leak":"${transformedSecret}"`),
      url: 'http://service.local/secret',
      durationMs: 1
    }));
    const scenario = await createFlowtract({
      baseURL: 'http://service.local',
      operations: [Reject, Transform],
      transport
    }).createScenario();
    scenario.setSecret('credential', rawSecret);

    let requestFailure: unknown;
    try {
      await scenario.execute(Reject, { body: { value: '{{credential}}' } });
    } catch (error) {
      requestFailure = error;
    }
    expect(JSON.stringify(requestFailure)).not.toContain(rawSecret);
    expect(JSON.stringify(requestFailure)).not.toContain(transformedSecret);
    expect(JSON.stringify(requestFailure)).toContain('[REDACTED]');

    let responseFailure: unknown;
    try {
      await scenario.execute(Transform, { body: { value: '{{credential}}' } });
    } catch (error) {
      responseFailure = error;
    }
    expect(responseFailure).toBeInstanceOf(ResponseParseError);
    expect(JSON.stringify(responseFailure)).not.toContain(rawSecret);
    expect(JSON.stringify(responseFailure)).not.toContain(transformedSecret);
    await scenario.close();
  });

  it('keeps unsafe request bypass bounded by declared sections and serializable shapes', async () => {
    const Unsafe = defineOperation({
      id: 'unsafe.execute',
      method: 'POST',
      path: '/unsafe',
      request: { body: z.object({ count: z.number() }) },
      responses: { 200: { body: z.object({ accepted: z.boolean() }) } }
    });
    const transport = new RecordingTransport(async () => jsonResponse(200, { accepted: true }));
    const scenario = await createFlowtract({
      baseURL: 'http://service.local',
      operations: [Unsafe],
      transport
    }).createScenario();

    await scenario.execute(Unsafe, { body: { count: 'unparsed' } } as never, {
      unsafe: { skipRequestValidation: true }
    });
    expect(JSON.parse(new TextDecoder().decode(transport.requests[0]?.body))).toEqual({
      count: 'unparsed'
    });
    await expect(
      scenario.execute(Unsafe, { body: { count: 1 }, query: { undeclared: true } } as never, {
        unsafe: { skipRequestValidation: true }
      })
    ).rejects.toBeInstanceOf(RequestContractError);
    await expect(
      scenario.execute(Unsafe, { body: { count: 1n } } as never, {
        unsafe: { skipRequestValidation: true }
      })
    ).rejects.toBeInstanceOf(RequestContractError);
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

  const credentialField = ['pass', 'word'].join('');
  const sourceBasicCredential = ['source', 'basic', 'credential'].join('-');

  it.each([
    ['bearer', bearerToken({ token: 'source-bearer-token' }), 'source-bearer-token'],
    [
      'basic',
      basicAuth({
        username: 'source-basic-user',
        [credentialField]: sourceBasicCredential
      } as { username: string; password: string }),
      sourceBasicCredential
    ]
  ])('redacts %s source credentials from response previews', async (profile, provider, secret) => {
    const Get = defineOperation({
      id: `secured.${profile}`,
      method: 'GET',
      path: '/secured',
      auth: profile,
      responses: { 200: { body: z.unknown() } }
    });
    const transport = new RecordingTransport(async () => ({
      status: 200,
      headers: [['content-type', 'application/json']],
      body: new TextEncoder().encode(`{"leak":"${secret}"`),
      url: 'http://service.local/secured',
      durationMs: 1
    }));
    const scenario = await createFlowtract({
      baseURL: 'http://service.local',
      operations: [Get],
      transport,
      auth: { [profile]: provider }
    }).createScenario();

    let failure: unknown;
    try {
      await scenario.execute(Get);
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(ResponseParseError);
    expect(JSON.stringify(failure)).not.toContain(secret);
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

  it('forces auth setup operations to auth false and prevents setup recursion', async () => {
    const Setup = defineOperation({
      id: 'auth.setup-operation',
      method: 'POST',
      path: '/setup',
      auth: 'recursive',
      responses: { 200: { body: z.object({ ready: z.literal(true) }) } }
    });
    const Secured = defineOperation({
      id: 'auth.secured-operation',
      method: 'GET',
      path: '/secured',
      auth: 'recursive',
      responses: { 200: { body: z.object({ ok: z.literal(true) }) } }
    });
    let creates = 0;
    let setups = 0;
    const transport = new RecordingTransport(async (_request, index) =>
      index === 0 ? jsonResponse(200, { ready: true }) : jsonResponse(200, { ok: true })
    );
    const scenario = await createFlowtract({
      baseURL: 'http://service.local',
      operations: [Setup, Secured],
      transport,
      auth: {
        recursive: {
          create: () => {
            creates += 1;
            return {
              setup: async context => {
                setups += 1;
                await context.execute(Setup);
              },
              apply: () => undefined
            };
          }
        }
      }
    }).createScenario();
    await expect(scenario.execute(Secured)).resolves.toMatchObject({ status: 200 });
    expect({ creates, setups }).toEqual({ creates: 1, setups: 1 });
    expect(scenario.history().map(item => item.phase)).toEqual(['auth', 'operation']);
    await scenario.close();
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

  it('waits for cleanup I/O even when the cleanup action throws immediately', async () => {
    const Delete = defineOperation({
      id: 'cleanup.delete',
      method: 'DELETE',
      path: '/items/1',
      responses: { 204: { body: z.undefined() } }
    });
    const events: string[] = [];
    let release!: () => void;
    const pending = new Promise<void>(resolve => {
      release = resolve;
    });
    const transport: HttpTransport = {
      async createSession() {
        return {
          async execute(request) {
            events.push('execute-start');
            await pending;
            events.push('execute-end');
            return {
              status: 204,
              headers: [],
              body: new Uint8Array(),
              url: request.url,
              durationMs: 1
            };
          },
          async dispose() {
            events.push('dispose');
          }
        };
      }
    };
    const scenario = await createFlowtract({
      baseURL: 'http://service.local',
      operations: [Delete],
      transport
    }).createScenario();
    scenario.registerCleanup('delete', client => {
      void client.execute(Delete);
      throw new Error('action failed');
    });

    const close = scenario.close();
    await vi.waitFor(() => expect(events).toContain('execute-start'));
    expect(events).not.toContain('dispose');
    release();
    await expect(close).rejects.toBeInstanceOf(CleanupError);
    expect(events).toEqual(['execute-start', 'execute-end', 'dispose']);
  });

  it('shares close calls, waits for an in-flight operation, and rejects new external calls', async () => {
    const Get = defineOperation({
      id: 'closing.get',
      method: 'GET',
      path: '/get',
      responses: { 200: { body: z.object({ ok: z.boolean() }) } }
    });
    let release!: () => void;
    const pending = new Promise<void>(resolve => {
      release = resolve;
    });
    const transport = new RecordingTransport(async () => {
      await pending;
      return jsonResponse(200, { ok: true });
    });
    const scenario = await createFlowtract({
      baseURL: 'http://service.local',
      operations: [Get],
      transport
    }).createScenario();
    const operation = scenario.execute(Get);
    const firstClose = scenario.close();
    expect(scenario.close()).toBe(firstClose);
    await expect(scenario.execute(Get)).rejects.toBeInstanceOf(ConfigError);
    expect(transport.disposals).toBe(0);
    release();
    await operation;
    await firstClose;
    expect(transport.disposals).toBe(1);
    expect(scenario.closed).toBe(true);
  });

  it('disposes initialized auth profiles in reverse order', async () => {
    const events: string[] = [];
    const First = defineOperation({
      id: 'auth.first',
      method: 'GET',
      path: '/first',
      auth: 'first',
      responses: { 200: { body: z.object({ ok: z.boolean() }) } }
    });
    const Second = defineOperation({
      id: 'auth.second',
      method: 'GET',
      path: '/second',
      auth: 'second',
      responses: { 200: { body: z.object({ ok: z.boolean() }) } }
    });
    const provider = (name: string) => ({
      create: async () => ({
        apply: () => undefined,
        dispose: () => {
          events.push(name);
        }
      })
    });
    const scenario = await createFlowtract({
      baseURL: 'http://service.local',
      operations: [First, Second],
      transport: new RecordingTransport(async () => jsonResponse(200, { ok: true })),
      auth: { first: provider('first'), second: provider('second') }
    }).createScenario();
    await scenario.execute(First);
    await scenario.execute(Second);
    await scenario.close();
    expect(events).toEqual(['second', 'first']);
  });

  it('normalizes an invalid provider instance to the create auth phase', async () => {
    const Get = defineOperation({
      id: 'invalid-auth.get',
      method: 'GET',
      path: '/get',
      auth: 'invalid',
      responses: { 200: { body: z.unknown() } }
    });
    const scenario = await createFlowtract({
      baseURL: 'http://service.local',
      operations: [Get],
      transport: new RecordingTransport(async () => jsonResponse(200, {})),
      auth: { invalid: { create: async () => null as never } }
    }).createScenario();
    await expect(scenario.execute(Get)).rejects.toMatchObject({
      code: 'FLOWTRACT_AUTH',
      details: { profile: 'invalid', phase: 'create' }
    } satisfies Partial<AuthError>);
    await scenario.close();
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

  it('wraps a non-extensible primary error only to retain cleanup evidence', async () => {
    const operation = defineOperation({
      id: 'nonextensible.unused',
      method: 'GET',
      path: '/unused',
      responses: { 200: { body: z.unknown() } }
    });
    const primary = Object.preventExtensions(new Error('fixed primary'));
    let observed: unknown;
    try {
      await createFlowtract({
        baseURL: 'http://service.local',
        operations: [operation],
        transport: new RecordingTransport(async () => jsonResponse(200, {}))
      }).runScenario(async scenario => {
        scenario.registerCleanup('failure', () => {
          throw new Error('cleanup failed');
        });
        throw primary;
      });
    } catch (error) {
      observed = error;
    }
    expect(observed).not.toBe(primary);
    expect(observed).toMatchObject({ message: 'fixed primary', cause: primary });
    expect(hasCleanupError(observed)).toBe(true);
    expect(Object.keys(observed as object)).not.toContain('cleanupError');
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
