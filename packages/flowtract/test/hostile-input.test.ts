import fc from 'fast-check';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import {
  FlowtractError,
  InterpolationError,
  RequestContractError,
  defineOperation
} from '../src/index.js';
import { parseOperationResponse, RequestBuilder } from '../src/internal/http.js';
import { interpolateWithTaint, interpolateValue } from '../src/internal/interpolate.js';
import { Redactor } from '../src/internal/redaction.js';
import { safeErrorMessage, safeErrorText, safeSnapshot } from '../src/internal/safe-inspection.js';
import { ScenarioState, SecretTracker } from '../src/internal/state.js';
import { checkProperty } from './support/property-proof.js';

const RequestOperation = defineOperation({
  id: 'property.request',
  method: 'POST',
  path: '/items/{id}',
  request: {
    pathParams: z.object({ id: z.string() }),
    headers: z.record(z.string(), z.string()).default({}),
    query: z.record(z.string(), z.union([z.string(), z.array(z.string())])).default({}),
    body: z.unknown()
  },
  responses: { 200: { body: z.unknown() } }
});

const ResponseOperation = defineOperation({
  id: 'property.response',
  method: 'GET',
  path: '/response',
  responses: {
    200: { body: z.object({ accepted: z.boolean() }) },
    default: { body: z.unknown() }
  }
});

const safeSecret = fc
  .string({ minLength: 3, maxLength: 32 })
  .filter(value => !value.includes('{{') && !value.includes('}}'));

describe('Gate 3 hostile input properties', () => {
  it('runs 2,500 interpolation, state, and taint cases', () => {
    checkProperty(
      'interpolation-state-taint',
      fc.property(safeSecret, fc.integer(), (secret, count) => {
        const secrets = new SecretTracker();
        const state = new ScenarioState(secrets);
        state.setSecret('credential', secret);
        state.set('count', count);
        const whole = interpolateWithTaint('{{credential}}', state);
        const embedded = interpolateWithTaint('value={{credential}}/{{count}}', state);
        const redactor = new Redactor(undefined, secrets);
        return (
          whole.value === secret &&
          whole.taintedPaths.length === 1 &&
          String(embedded.value).includes(String(count)) &&
          !redactor.text(String(embedded.value)).includes(secret)
        );
      }),
      2_500
    );
  });

  it('runs 3,000 redaction, error, and diagnostic-shape cases', () => {
    checkProperty(
      'redaction-errors-diagnostics',
      fc.property(safeSecret, fc.jsonValue({ maxDepth: 3 }), (secret, value) => {
        const secrets = new SecretTracker();
        secrets.add(secret);
        const redactor = new Redactor({ previewCharacters: 128 }, secrets);
        const details = redactor.value({ password: secret, value, nested: { token: secret } });
        const error = new FlowtractError('FLOWTRACT_CONFIG', 'bounded failure', { details });
        const serialized = JSON.stringify(error.toJSON());
        return (
          serialized.length <= 8_192 &&
          !serialized.includes(secret) &&
          Object.isFrozen(error.details) &&
          Object.isFrozen(error.toJSON())
        );
      }),
      3_000
    );
  });

  it('runs 2,500 request, header, and URL normalization cases', () => {
    checkProperty(
      'request-header-url',
      fc.property(
        fc.stringMatching(/^[A-Za-z][A-Za-z0-9-]{0,15}$/u),
        fc.string({ maxLength: 24 }).filter(value => !/[\r\n]/u.test(value)),
        fc.string({ maxLength: 24 }),
        (headerName, headerValue, id) => {
          const request = new RequestBuilder(
            RequestOperation,
            {
              pathParams: { id },
              headers: { [headerName]: headerValue },
              query: { repeated: ['a', 'b'] },
              body: { accepted: true }
            },
            'https://example.test/base',
            100,
            undefined,
            new SecretTracker()
          );
          const transported = request.transportRequest();
          return (
            new URL(transported.url).pathname.startsWith('/base/items/') &&
            transported.headers.every(([, value]) => !/[\r\n]/u.test(value)) &&
            transported.url.includes('repeated=a') &&
            transported.url.includes('repeated=b')
          );
        }
      ),
      2_500
    );
  });

  it('runs 2,000 response and transport tuple cases', () => {
    checkProperty(
      'response-transport-tuples',
      fc.property(fc.boolean(), fc.integer({ min: 201, max: 299 }), (accepted, status) => {
        const response = parseOperationResponse(
          ResponseOperation,
          {
            status,
            headers: [['content-type', 'application/json']],
            body: new TextEncoder().encode(JSON.stringify({ accepted })),
            url: 'https://example.test/final',
            durationMs: 1
          },
          new Redactor(undefined, new SecretTracker())
        );
        return response.status === status && response.contractStatus === 'default';
      }),
      2_000
    );
  });
});

describe('Gate 3 hostile descriptor and proxy containment', () => {
  it.each(['getPrototypeOf', 'ownKeys', 'getOwnPropertyDescriptor'] as const)(
    'contains a proxy that throws from %s',
    trap => {
      const target = { value: true };
      const hostile = new Proxy(target, {
        [trap]() {
          throw new Error('synthetic trap secret');
        }
      });
      const redactor = new Redactor(undefined, new SecretTracker());
      expect(() => redactor.value(hostile)).not.toThrow();
      expect(redactor.value(hostile)).toBe('[Object]');
      expect(() => new SecretTracker().add(hostile)).not.toThrow();
      expect(() => interpolateValue(hostile, new ScenarioState(new SecretTracker()))).toThrow(
        InterpolationError
      );
    }
  );

  it('never invokes getters, toJSON, custom toString, or prototype mutation keys', () => {
    let invocations = 0;
    const hostile: Record<string, unknown> = {};
    for (const key of ['getter', 'toJSON', 'toString']) {
      Object.defineProperty(hostile, key, {
        enumerable: true,
        get() {
          invocations += 1;
          return () => 'synthetic secret';
        }
      });
    }
    Object.defineProperty(hostile, '__proto__', {
      enumerable: true,
      value: { polluted: true }
    });
    const snapshot = safeSnapshot(hostile) as Record<string, unknown>;
    expect(invocations).toBe(0);
    expect(snapshot.getter).toBe('[Accessor]');
    expect(Object.prototype).not.toHaveProperty('polluted');
    expect(Object.hasOwn(snapshot, '__proto__')).toBe(true);
  });

  it('does not reflect hostile error accessors or unbounded causes', () => {
    let invoked = false;
    const hostile = Object.create(Error.prototype) as Error;
    Object.defineProperty(hostile, 'message', {
      get() {
        invoked = true;
        return 'synthetic secret';
      }
    });
    expect(safeErrorMessage(hostile)).toBe('Unknown failure');
    expect(safeErrorText(hostile)).not.toContain('synthetic secret');
    expect(invoked).toBe(false);
  });

  it('rejects bodies with accessors or toJSON without invoking them', () => {
    let invoked = false;
    const body = {
      get secret() {
        invoked = true;
        return 'synthetic secret';
      },
      toJSON() {
        invoked = true;
        return { accepted: true };
      }
    };
    expect(
      () =>
        new RequestBuilder(
          RequestOperation,
          { pathParams: { id: 'x' }, headers: {}, query: {}, body },
          'https://example.test',
          100,
          undefined,
          new SecretTracker()
        )
    ).toThrow(RequestContractError);
    expect(invoked).toBe(false);
  });
});
