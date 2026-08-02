import { z } from 'zod';
import { describe, expect, it, vi } from 'vitest';
import {
  AuthError,
  CleanupError,
  ConfigError,
  FlowtractError,
  ResponseContractError,
  ResponseParseError,
  TransportError,
  createFlowtract,
  defineOperation,
  hasCleanupError,
  type AuthProvider,
  type HttpTransport,
  type TransportResponse
} from '../src/index.js';

const Operation = defineOperation({
  id: 'fault.operation',
  method: 'POST',
  path: '/fault',
  request: { body: z.object({ value: z.string() }) },
  responses: { 200: { body: z.object({ accepted: z.literal(true) }) } }
});

function response(body = '{"accepted":true}'): TransportResponse {
  return {
    status: 200,
    headers: [['content-type', 'application/json']],
    body: new TextEncoder().encode(body),
    url: 'https://example.test/final',
    durationMs: 1
  };
}

function transportWith(
  execute: () => TransportResponse | Promise<TransportResponse> = () => response(),
  dispose: () => void | Promise<void> = () => undefined
): HttpTransport {
  return {
    async createSession() {
      return { execute: async () => execute(), dispose: async () => dispose() };
    }
  };
}

function runtime(transport: HttpTransport, auth?: Readonly<Record<string, AuthProvider>>) {
  return createFlowtract({
    baseURL: 'https://example.test',
    operations: [Operation],
    transport,
    ...(auth === undefined ? {} : { auth, defaultAuth: 'fault' })
  });
}

describe('Gate 3 fault containment', () => {
  it('rejects hostile configuration accessors without invoking them', () => {
    let invoked = false;
    const config = {
      operations: [Operation],
      get baseURL() {
        invoked = true;
        return 'https://example.test';
      }
    };
    expect(() => createFlowtract(config)).toThrow(ConfigError);
    expect(invoked).toBe(false);
  });

  it.each([
    ['synchronous Error', () => new Error('synthetic transport secret')],
    ['primitive', () => 'synthetic transport secret'],
    [
      'non-extensible Error',
      () => Object.preventExtensions(new Error('synthetic transport secret'))
    ]
  ])('normalizes transport request failure: %s', async (_name, createFailure) => {
    const dispose = vi.fn();
    await expect(
      runtime(
        transportWith(() => {
          throw createFailure();
        }, dispose)
      ).runScenario(scenario => scenario.execute(Operation, { body: { value: 'x' } }))
    ).rejects.toMatchObject({ code: 'FLOWTRACT_TRANSPORT', details: { kind: 'unknown' } });
    expect(dispose).toHaveBeenCalledOnce();
  });

  it('preserves an existing transport error and abort kind', async () => {
    const existing = new TransportError('aborted', { details: { kind: 'abort' } });
    await expect(
      runtime(
        transportWith(() => {
          throw existing;
        })
      ).runScenario(scenario => scenario.execute(Operation, { body: { value: 'x' } }))
    ).rejects.toBe(existing);
  });

  it.each(['create', 'setup', 'apply'] as const)('normalizes auth %s failures', async phase => {
    const provider: AuthProvider = {
      create() {
        if (phase === 'create') throw 'synthetic auth secret';
        return {
          setup() {
            if (phase === 'setup') return Promise.reject('synthetic auth secret');
            return undefined;
          },
          apply() {
            if (phase === 'apply') {
              throw Object.preventExtensions(new Error('synthetic auth secret'));
            }
            return undefined;
          }
        };
      }
    };
    await expect(
      runtime(transportWith(), { fault: provider }).runScenario(scenario =>
        scenario.execute(Operation, { body: { value: 'x' } })
      )
    ).rejects.toMatchObject({
      code: 'FLOWTRACT_AUTH',
      details: { profile: 'fault', phase }
    });
  });

  it('aggregates auth and transport disposal failures without skipping either', async () => {
    const authDispose = vi.fn(() => Promise.reject('synthetic auth disposal secret'));
    const transportDispose = vi.fn(() =>
      Promise.reject(new Error('synthetic transport disposal secret'))
    );
    const provider: AuthProvider = {
      create: () => ({ apply: () => undefined, dispose: authDispose })
    };
    await expect(
      runtime(
        transportWith(() => response(), transportDispose),
        { fault: provider }
      ).runScenario(scenario => scenario.execute(Operation, { body: { value: 'x' } }))
    ).rejects.toMatchObject({
      code: 'FLOWTRACT_CLEANUP',
      details: {
        failures: [{ label: 'auth:fault' }, { label: 'transport' }]
      }
    });
    expect(authDispose).toHaveBeenCalledOnce();
    expect(transportDispose).toHaveBeenCalledOnce();
  });

  it('preserves a primary request-transform failure with cleanup evidence', async () => {
    const Transform = defineOperation({
      id: 'fault.transform',
      method: 'POST',
      path: '/transform',
      request: {
        body: z.string().transform(() => {
          throw Object.preventExtensions(new Error('synthetic transform secret'));
        })
      },
      responses: { 200: { body: z.unknown() } }
    });
    const candidate = createFlowtract({
      baseURL: 'https://example.test',
      operations: [Transform],
      transport: transportWith(
        () => response(),
        () => Promise.reject('dispose failure')
      )
    });
    let observed: unknown;
    try {
      await candidate.runScenario(scenario => scenario.execute(Transform, { body: 'x' }));
    } catch (error) {
      observed = error;
    }
    expect(observed).toBeInstanceOf(Error);
    expect(hasCleanupError(observed)).toBe(true);
  });

  it('contains malformed, invalid-contract, and hostile transport responses', async () => {
    await expect(
      runtime(transportWith(() => response('{malformed'))).runScenario(scenario =>
        scenario.execute(Operation, { body: { value: 'x' } })
      )
    ).rejects.toBeInstanceOf(ResponseParseError);
    await expect(
      runtime(transportWith(() => response('{"accepted":false}'))).runScenario(scenario =>
        scenario.execute(Operation, { body: { value: 'x' } })
      )
    ).rejects.toBeInstanceOf(ResponseContractError);

    let invoked = false;
    const hostile = {
      get status() {
        invoked = true;
        return 200;
      }
    } as never;
    await expect(
      runtime(transportWith(() => hostile)).runScenario(scenario =>
        scenario.execute(Operation, { body: { value: 'x' } })
      )
    ).rejects.toBeInstanceOf(TransportError);
    expect(invoked).toBe(false);
  });

  it('aggregates primitive, rejected, and cleanup-client failures in order', async () => {
    const candidate = runtime(transportWith());
    const scenario = await candidate.createScenario();
    scenario.registerCleanup('first', () => Promise.reject('first primitive'));
    scenario.registerCleanup('second', client => {
      void client.execute(Operation, { body: { value: 'x' } });
      throw Object.preventExtensions(new Error('second error'));
    });
    await expect(scenario.close()).rejects.toMatchObject({
      code: 'FLOWTRACT_CLEANUP',
      details: {
        failures: [{ label: 'second' }, { label: 'first' }]
      }
    });
  });

  it('keeps public error serialization bounded, frozen, JSON-safe, and cause-free', () => {
    const details: Record<string, unknown> = { text: 'x'.repeat(20_000) };
    details.self = details;
    Object.defineProperty(details, 'accessor', {
      enumerable: true,
      get() {
        throw new Error('synthetic serialization secret');
      }
    });
    const error = new FlowtractError('FLOWTRACT_REQUEST_CONTRACT', 'request failed', {
      details,
      cause: new Error('synthetic cause secret')
    });
    const json = error.toJSON();
    const serialized = JSON.stringify(json);
    expect(Object.isFrozen(error.details)).toBe(true);
    expect(Object.isFrozen(json)).toBe(true);
    expect(serialized.length).toBeLessThan(9_000);
    expect(serialized).not.toContain('synthetic');
    expect(serialized).not.toContain('cause');
  });

  it('rejects request accessors as a stable request contract failure', async () => {
    let invoked = false;
    const input = {};
    Object.defineProperty(input, 'body', {
      enumerable: true,
      get() {
        invoked = true;
        return { value: 'x' };
      }
    });
    await expect(
      runtime(transportWith()).runScenario(scenario => scenario.execute(Operation, input as never))
    ).rejects.toMatchObject({ code: 'FLOWTRACT_INTERPOLATION' });
    expect(invoked).toBe(false);
  });

  it('retains error codes and cleanup aggregation classes', () => {
    expect(new AuthError('x', { details: { phase: 'create' } })).toBeInstanceOf(FlowtractError);
    expect(new CleanupError('x', { details: { failures: [] } })).toBeInstanceOf(FlowtractError);
  });
});
