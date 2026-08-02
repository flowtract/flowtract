import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ConfigError, defineOperation, emptyBody } from '../src/index.js';
import { renderOperationPath } from '../src/internal/render-path.js';

function minimalOperation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'health.get',
    method: 'GET',
    path: '/health',
    responses: {
      200: { body: z.object({ ok: z.boolean() }) }
    },
    ...overrides
  };
}

describe('defineOperation', () => {
  it('preserves literals and freezes Flowtract-owned wrappers only', () => {
    const body = z.object({ name: z.string() });
    const contentTypes = ['application/json'];
    const operation = defineOperation({
      id: 'parts.create',
      method: 'POST',
      path: '/parts',
      request: { body },
      responses: {
        201: { body, contentType: contentTypes }
      }
    });

    expect(operation.id).toBe('parts.create');
    expect(operation.method).toBe('POST');
    expect(Object.isFrozen(operation)).toBe(true);
    expect(Object.isFrozen(operation.request)).toBe(true);
    expect(Object.isFrozen(operation.responses)).toBe(true);
    expect(Object.isFrozen(operation.responses[201])).toBe(true);
    expect(Object.isFrozen(operation.responses[201]?.contentType)).toBe(true);
    expect(Object.isFrozen(body)).toBe(false);
    expect(Object.isFrozen(contentTypes)).toBe(false);
  });

  it('accepts repeated valid placeholders backed by one schema key', () => {
    const operation = defineOperation({
      id: 'parts.compare',
      method: 'GET',
      path: '/parts/{partId}/related/{partId}',
      request: { pathParams: z.object({ partId: z.string() }) },
      responses: { 200: { body: z.string() } }
    });

    expect(operation.path).toBe('/parts/{partId}/related/{partId}');
  });

  it.each([
    ['empty id', { id: ' ' }, 'Operation id must not be empty.'],
    ['id whitespace', { id: ' health.get' }, 'must not contain leading or trailing whitespace'],
    ['relative path', { path: 'health' }, 'Operation path must start with'],
    ['query in path', { path: '/health?q=1' }, 'must not contain a query'],
    ['fragment in path', { path: '/health#top' }, 'must not contain a query'],
    ['invalid timeout', { timeoutMs: 0 }, 'positive integer'],
    ['empty auth', { auth: ' ' }, 'must not be an empty string'],
    ['no responses', { responses: {} }, 'At least one response'],
    ['malformed path', { path: '/parts/{id' }, 'malformed parameter'],
    ['invalid placeholder', { path: '/parts/{part-id}' }, 'not a valid identifier']
  ])('rejects %s', (_name, override, message) => {
    expect(() => defineOperation(minimalOperation(override) as never)).toThrowError(message);
  });

  it('rejects unsupported runtime methods and response keys', () => {
    expect(() => defineOperation(minimalOperation({ method: 'TRACE' }) as never)).toThrowError(
      'Unsupported HTTP method'
    );
    expect(() =>
      defineOperation(
        minimalOperation({
          responses: { 99: { body: z.string() } }
        }) as never
      )
    ).toThrowError('must be an HTTP status');
    expect(() =>
      defineOperation(
        minimalOperation({
          responses: { unexpected: { body: z.string() } }
        }) as never
      )
    ).toThrowError('must be an HTTP status');
  });

  it('contains hostile registration values without invoking accessors or coercion hooks', () => {
    let getterCalls = 0;
    const hostileDefinition = {
      get id() {
        getterCalls += 1;
        throw new Error('registration getter executed');
      },
      method: 'GET',
      path: '/health',
      responses: { 200: { body: z.unknown() } }
    };

    expect(() => defineOperation(hostileDefinition as never)).toThrowError(ConfigError);
    expect(getterCalls).toBe(0);

    const revoked = Proxy.revocable({ 200: { body: z.unknown() } }, {});
    revoked.revoke();
    expect(() =>
      defineOperation(minimalOperation({ responses: revoked.proxy }) as never)
    ).toThrowError(ConfigError);

    let coercions = 0;
    expect(() =>
      defineOperation(
        minimalOperation({
          method: {
            toString() {
              coercions += 1;
              return 'GET';
            }
          }
        }) as never
      )
    ).toThrowError(ConfigError);
    expect(coercions).toBe(0);
  });

  it('rejects missing and unused path parameter keys', () => {
    expect(() =>
      defineOperation({
        id: 'parts.get',
        method: 'GET',
        path: '/parts/{partId}',
        request: { pathParams: z.object({}) },
        responses: { 200: { body: z.string() } }
      })
    ).toThrowError(ConfigError);

    expect(() =>
      defineOperation({
        id: 'parts.list',
        method: 'GET',
        path: '/parts',
        request: { pathParams: z.object({ partId: z.string() }) },
        responses: { 200: { body: z.string() } }
      })
    ).toThrowError('pathParams schema keys must match');
  });

  it('requires a Zod object path schema and a Zod response body', () => {
    expect(() =>
      defineOperation({
        id: 'parts.get',
        method: 'GET',
        path: '/parts/{partId}',
        request: { pathParams: z.string() as never },
        responses: { 200: { body: z.string() } }
      })
    ).toThrowError('Zod object pathParams schema');

    expect(() =>
      defineOperation(
        minimalOperation({
          responses: { 200: { body: 'not-a-schema' } }
        }) as never
      )
    ).toThrowError('must define a Zod body schema');
  });

  it('creates an explicit undefined schema for empty responses', () => {
    const schema = emptyBody();
    expect(schema.parse(undefined)).toBeUndefined();
    expect(() => schema.parse('')).toThrow();
  });

  it('renders parsed path parameters with exactly one component encoding pass', () => {
    const operation = defineOperation({
      id: 'parts.get',
      method: 'GET',
      path: '/parts/{partId}/revisions/{revision}',
      request: {
        pathParams: z.object({
          partId: z.string(),
          revision: z.coerce.number()
        })
      },
      responses: { 200: { body: z.string() } }
    });

    expect(
      renderOperationPath(operation, {
        partId: 'assembly/a%2Fb',
        revision: 4
      })
    ).toBe('/parts/assembly%2Fa%252Fb/revisions/4');
    expect(() =>
      renderOperationPath(operation, {
        partId: { invalid: true },
        revision: 4
      })
    ).toThrowError('must parse to a string, finite number, boolean, or bigint');
    expect(() =>
      renderOperationPath(operation, {
        partId: 'part-1',
        revision: Number.POSITIVE_INFINITY
      })
    ).toThrowError('must parse to a string, finite number, boolean, or bigint');
  });
});
