import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import {
  createFlowtract,
  defineOperation,
  type AuthProvider,
  type HttpTransport,
  type TransportRequest
} from '../src/index.js';

const Resource = defineOperation({
  id: 'resource.read',
  method: 'GET',
  path: '/resource',
  auth: 'counted',
  responses: { 200: { body: z.object({ scenario: z.string() }) } }
});

describe('Gate 3 resource conformance', () => {
  it('balances 64 concurrent isolated custom sessions and auth instances', async () => {
    const counters = {
      sessions: 0,
      activeSessions: 0,
      requests: 0,
      activeRequests: 0,
      auth: 0,
      activeAuth: 0
    };
    const seen = new Set<string>();
    const transport: HttpTransport = {
      async createSession(options) {
        counters.sessions += 1;
        counters.activeSessions += 1;
        let disposed = false;
        return {
          async execute(request: TransportRequest) {
            counters.requests += 1;
            counters.activeRequests += 1;
            try {
              const scenario = request.headers.find(([name]) => name === 'x-scenario')?.[1];
              if (scenario === undefined || seen.has(scenario)) {
                throw new Error('Scenario identity was missing or reused.');
              }
              seen.add(scenario);
              return {
                status: 200,
                headers: [['content-type', 'application/json']],
                body: new TextEncoder().encode(JSON.stringify({ scenario })),
                url: `${options.baseURL}/resource`,
                durationMs: 1
              };
            } finally {
              counters.activeRequests -= 1;
            }
          },
          async dispose() {
            if (!disposed) {
              disposed = true;
              counters.activeSessions -= 1;
            }
          }
        };
      }
    };
    const auth: AuthProvider = {
      create({ scenarioId }) {
        counters.auth += 1;
        counters.activeAuth += 1;
        let disposed = false;
        return {
          apply({ request }) {
            request.setHeader('x-scenario', scenarioId);
          },
          dispose() {
            if (!disposed) {
              disposed = true;
              counters.activeAuth -= 1;
            }
          }
        };
      }
    };
    const runtime = createFlowtract({
      baseURL: 'https://example.test',
      operations: [Resource],
      transport,
      auth: { counted: auth }
    });

    const results = await Promise.all(
      Array.from({ length: 64 }, (_, index) =>
        runtime.runScenario(scenario => scenario.execute(Resource), { id: `resource-${index}` })
      )
    );

    expect(new Set(results.map(result => result.body.scenario)).size).toBe(64);
    expect(counters).toEqual({
      sessions: 64,
      activeSessions: 0,
      requests: 64,
      activeRequests: 0,
      auth: 64,
      activeAuth: 0
    });
  });

  it('attempts every disposal after request and cleanup failures', async () => {
    const order: string[] = [];
    const runtime = createFlowtract({
      baseURL: 'https://example.test',
      operations: [Resource],
      transport: {
        async createSession() {
          return {
            async execute() {
              order.push('request');
              throw new Error('synthetic request failure');
            },
            async dispose() {
              order.push('transport');
            }
          };
        }
      },
      auth: {
        counted: {
          create: () => ({
            apply: () => undefined,
            dispose: () => {
              order.push('auth');
            }
          })
        }
      }
    });
    await expect(runtime.runScenario(scenario => scenario.execute(Resource))).rejects.toMatchObject(
      {
        code: 'FLOWTRACT_TRANSPORT'
      }
    );
    expect(order).toEqual(['request', 'auth', 'transport']);
  });
});
