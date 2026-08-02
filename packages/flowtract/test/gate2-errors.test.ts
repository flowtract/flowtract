import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import {
  AuthError,
  ConfigError,
  InterpolationError,
  RequestContractError,
  ResponseContractError,
  ResponseParseError,
  TransportError,
  apiKey,
  basicAuth,
  bearerToken,
  createFlowtract,
  defineConfig,
  defineOperation,
  type HttpTransport
} from '../src/index.js';
import { authFailure } from '../src/auth.js';
import { RequestBuilder, parseOperationResponse } from '../src/internal/http.js';
import { interpolateValue } from '../src/internal/interpolate.js';
import { Redactor } from '../src/internal/redaction.js';
import { ScenarioState, SecretTracker } from '../src/internal/state.js';

const Health = defineOperation({
  id: 'health',
  method: 'GET',
  path: '/health',
  responses: { 200: { body: z.object({ ok: z.boolean() }) } }
});

const noopTransport: HttpTransport = {
  async createSession() {
    return {
      async execute(request) {
        return {
          status: 200,
          headers: [['content-type', 'application/json']],
          body: new TextEncoder().encode('{"ok":true}'),
          url: request.url,
          durationMs: 1
        };
      },
      async dispose() {}
    };
  }
};

describe('Gate 2 configuration failures', () => {
  it.each([
    ['not-a-url', 'baseURL'],
    ['ftp://example.com', 'baseURL'],
    ['http://user:pass@example.com', 'baseURL'],
    ['http://example.com?a=1', 'baseURL'],
    ['http://example.com#x', 'baseURL']
  ])('rejects invalid URL %s', baseURL => {
    expect(() =>
      createFlowtract({ baseURL, operations: [Health], transport: noopTransport })
    ).toThrow(ConfigError);
  });

  it('rejects empty operations and invalid timeout/TLS settings', () => {
    expect(() =>
      createFlowtract({ baseURL: 'http://example.com', operations: [], transport: noopTransport })
    ).toThrow(ConfigError);
    expect(() =>
      createFlowtract({
        baseURL: 'http://example.com',
        operations: [Health],
        transport: noopTransport,
        timeoutMs: 0
      })
    ).toThrow(ConfigError);
    expect(() =>
      createFlowtract({
        baseURL: 'http://example.com',
        operations: [Health],
        transport: noopTransport,
        allowInsecureTls: 'yes' as never
      })
    ).toThrow(ConfigError);
  });

  it('rejects malformed and unknown auth profiles', () => {
    const Secured = defineOperation({
      id: 'secured',
      method: 'GET',
      path: '/secured',
      auth: 'missing',
      responses: { 200: { body: z.unknown() } }
    });
    expect(() =>
      createFlowtract({
        baseURL: 'http://example.com',
        operations: [Secured],
        transport: noopTransport
      })
    ).toThrow(ConfigError);
    expect(() =>
      createFlowtract({
        baseURL: 'http://example.com',
        operations: [Health],
        transport: noopTransport,
        defaultAuth: 'missing'
      })
    ).toThrow(ConfigError);
    expect(() =>
      createFlowtract({
        baseURL: 'http://example.com',
        operations: [Health],
        transport: noopTransport,
        auth: { ' bad ': bearerToken({ token: 'x' }) }
      })
    ).toThrow(ConfigError);
    expect(() =>
      createFlowtract({
        baseURL: 'http://example.com',
        operations: [Health],
        transport: noopTransport,
        auth: { bad: {} as never }
      })
    ).toThrow(ConfigError);
  });

  it('validates and freezes configuration containers', () => {
    const config = defineConfig({
      baseURL: 'http://example.com',
      operations: [Health],
      transport: noopTransport,
      auth: { bearer: bearerToken({ token: 'x' }) },
      redaction: { headers: ['x-secret'], jsonPaths: ['nested.*'] }
    });
    expect(Object.isFrozen(config)).toBe(true);
    expect(Object.isFrozen(config.operations)).toBe(true);
    expect(Object.isFrozen(config.auth)).toBe(true);
    expect(Object.isFrozen(config.redaction?.headers)).toBe(true);
  });

  it('snapshots mutable redaction input for the runtime', async () => {
    const headers = ['x-original'];
    const jsonPaths = ['nested.secret'];
    const redaction = { headers, jsonPaths, previewCharacters: 7 };
    const runtime = createFlowtract({
      baseURL: 'http://example.com',
      operations: [Health],
      transport: {
        async createSession() {
          return {
            async execute(request) {
              return {
                status: 200,
                headers: [['content-type', 'application/json']],
                body: new TextEncoder().encode('123456789 malformed'),
                url: request.url,
                durationMs: 1
              };
            },
            async dispose() {}
          };
        }
      },
      redaction
    });
    headers[0] = 'x-mutated';
    jsonPaths[0] = 'nested.public';
    redaction.previewCharacters = 0;

    const scenario = await runtime.createScenario();
    await expect(scenario.execute(Health)).rejects.toMatchObject({
      details: { preview: '1234567' }
    });
    await scenario.close();
    expect(headers).toEqual(['x-mutated']);
    expect(jsonPaths).toEqual(['nested.public']);
  });

  it('rejects invalid redaction configuration', () => {
    for (const previewCharacters of [-1, 8193, 1.5]) {
      expect(() =>
        createFlowtract({
          baseURL: 'http://example.com',
          operations: [Health],
          transport: noopTransport,
          redaction: { previewCharacters }
        })
      ).toThrow(ConfigError);
    }
    for (const path of ['', 'a..b', String.raw`a\.b`]) {
      expect(() =>
        createFlowtract({
          baseURL: 'http://example.com',
          operations: [Health],
          transport: noopTransport,
          redaction: { jsonPaths: [path] }
        })
      ).toThrow(ConfigError);
    }
  });
});

describe('request normalization failures', () => {
  const Operation = defineOperation({
    id: 'normalize',
    method: 'POST',
    path: '/items/{id}',
    request: {
      headers: z.record(z.string(), z.unknown()),
      pathParams: z.object({ id: z.unknown() }),
      query: z.record(z.string(), z.unknown()),
      body: z.unknown()
    },
    responses: { 200: { body: z.unknown() } }
  });
  const secrets = new SecretTracker();

  function build(input: Readonly<Record<string, unknown>>): RequestBuilder {
    return new RequestBuilder(Operation, input, 'http://example.com', 10, undefined, secrets);
  }

  it.each([
    [{ pathParams: { id: null } }, 'pathParams'],
    [{ pathParams: { id: 'x' }, headers: { bad: [] } }, 'headers'],
    [{ pathParams: { id: 'x' }, headers: { bad: 'a\nb' } }, 'headers'],
    [{ pathParams: { id: 'x' }, headers: { 'bad name': 'x' } }, 'headers'],
    [{ pathParams: { id: 'x' }, query: { nested: {} } }, 'query'],
    [{ pathParams: { id: 'x' }, query: { number: Number.NaN } }, 'query']
  ])('rejects unsupported request shape %#', (input, _section) => {
    expect(() => build(input)).toThrow(RequestContractError);
  });

  it('rejects sparse/nested query arrays and non-JSON bodies', () => {
    const sparse = new Array(2);
    sparse[1] = 'x';
    expect(() => build({ pathParams: { id: 'x' }, query: { sparse } })).toThrow(
      RequestContractError
    );
    expect(() => build({ pathParams: { id: 'x' }, query: { nested: [['x']] } })).toThrow(
      RequestContractError
    );
    expect(() => build({ pathParams: { id: 'x' }, body: 1n })).toThrow(RequestContractError);
    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(() => build({ pathParams: { id: 'x' }, body: cycle })).toThrow(RequestContractError);
  });

  it('rejects incompatible JSON content type and auth collisions', () => {
    expect(() =>
      build({
        pathParams: { id: 'x' },
        headers: { 'content-type': 'text/plain' },
        body: { ok: true }
      })
    ).toThrow(RequestContractError);
  });

  it('rejects auth header/query collisions and invalid credentials', () => {
    const builder = build({
      pathParams: { id: 'x' },
      headers: { authorization: 'caller' },
      query: { api_key: 'caller' }
    });
    expect(() => builder.setHeader('Authorization', 'Bearer x')).toThrow(AuthError);
    expect(() => builder.setHeader('bad name', 'x')).toThrow(AuthError);
    expect(() => builder.setQuery('api_key', 'x')).toThrow(AuthError);
    expect(() => builder.setQuery('', 'x')).toThrow(AuthError);
  });
});

describe('response and transport failures', () => {
  const Response = defineOperation({
    id: 'response',
    method: 'GET',
    path: '/response',
    responses: {
      200: {
        body: z.object({ ok: z.literal(true) }),
        headers: z.object({ etag: z.string() }),
        contentType: 'application/json'
      }
    }
  });
  const redactor = new Redactor(undefined, new SecretTracker());

  function parse(overrides: Partial<Parameters<typeof parseOperationResponse>[1]> = {}) {
    return parseOperationResponse(
      Response,
      {
        status: 200,
        headers: [
          ['content-type', 'application/json'],
          ['etag', 'v1']
        ],
        body: new TextEncoder().encode('{"ok":true}'),
        url: 'http://example.com/response',
        durationMs: 1,
        ...overrides
      },
      redactor
    );
  }

  it.each([
    { status: 99 },
    { durationMs: -1 },
    { body: 'bad' as never },
    { headers: null as never },
    { url: 'not-a-url' }
  ])('rejects invalid transport output %#', overrides => {
    expect(() => parse(overrides)).toThrow(TransportError);
  });

  it.each([
    [[['bad name', 'value']]],
    [[['x-valid', 'line\nbreak']]],
    [[['x-valid'] as never]],
    [[['x-valid', 1] as never]]
  ])('rejects malformed transport header tuples %#', headers => {
    expect(() => parse({ headers: headers as never })).toThrow(TransportError);
  });

  it('rejects content type, header, body, encoding, and unsupported media failures', () => {
    expect(() => parse({ headers: [['content-type', 'text/plain']] })).toThrow(
      ResponseContractError
    );
    expect(() => parse({ headers: [['content-type', 'application/json']] })).toThrow(
      ResponseContractError
    );
    expect(() => parse({ body: new TextEncoder().encode('{"ok":false}') })).toThrow(
      ResponseContractError
    );
    expect(() => parse({ body: new Uint8Array([0xff]) })).toThrow(ResponseParseError);

    const Text = defineOperation({
      id: 'unsupported',
      method: 'GET',
      path: '/unsupported',
      responses: { 200: { body: z.unknown() } }
    });
    expect(() =>
      parseOperationResponse(
        Text,
        {
          status: 200,
          headers: [['content-type', 'application/octet-stream']],
          body: new Uint8Array([1]),
          url: 'http://example.com',
          durationMs: 1
        },
        redactor
      )
    ).toThrow(ResponseParseError);
  });
});

describe('auth and state failure paths', () => {
  it('rejects empty built-in values and preserves existing auth errors', async () => {
    const state = new ScenarioState(new SecretTracker());
    const request = { setHeader: vi.fn(), setQuery: vi.fn() };
    for (const provider of [
      bearerToken({ token: '' }),
      apiKey({ in: 'header', name: 'x-key', value: '' }),
      basicAuth({ username: '', password: 'x' })
    ]) {
      const instance = await provider.create({ profile: 'p', scenarioId: 's' });
      await expect(instance.apply({ operationId: 'x', state, request })).rejects.toThrow();
    }
    expect(() => apiKey({ in: 'header', name: '', value: 'x' })).toThrow();
    const existing = new AuthError('existing', {
      details: { profile: 'p', phase: 'apply' }
    });
    expect(authFailure('p', 'apply', existing)).toBe(existing);
  });

  it('exercises state classification, recursive secret collection, and clear', () => {
    const secrets = new SecretTracker();
    const state = new ScenarioState(secrets);
    state.set('ordinary', 1);
    expect(() => state.setSecret('ordinary', 'x')).toThrow(InterpolationError);
    state.setSecret('complex', {
      text: 'secret-text',
      number: 42,
      nested: ['nested-secret']
    });
    expect(secrets.strings()).toEqual(
      expect.arrayContaining(['secret-text', '42', 'nested-secret'])
    );
    state.clear();
    expect(state.has('ordinary')).toBe(false);
    expect(secrets.strings()).toEqual([]);
  });

  it('rejects invalid state names and interpolation object cycles/accessors', () => {
    const state = new ScenarioState(new SecretTracker());
    expect(() => state.set(' ', 1)).toThrow(InterpolationError);
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    expect(() => interpolateValue(cyclic, state)).toThrow(InterpolationError);
    const accessor = {};
    Object.defineProperty(accessor, 'value', { enumerable: true, get: () => 'x' });
    expect(() => interpolateValue(accessor, state)).toThrow(InterpolationError);
  });
});
