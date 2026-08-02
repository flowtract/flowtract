import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import { createFlowtract, defineOperation, type HttpTransport } from '../src/index.js';

const Stress = defineOperation({
  id: 'stress.read',
  method: 'GET',
  path: '/stress',
  responses: { 200: { body: z.object({ ok: z.literal(true) }) } }
});

describe('Gate 3 bounded stress proof', () => {
  it('balances 1,000 sequential create, execute, and close cycles', async () => {
    const counters = { sessions: 0, requests: 0, disposals: 0, active: 0 };
    const transport: HttpTransport = {
      async createSession() {
        counters.sessions += 1;
        counters.active += 1;
        let disposed = false;
        return {
          async execute(request) {
            counters.requests += 1;
            return {
              status: 200,
              headers: [['content-type', 'application/json']],
              body: new TextEncoder().encode('{"ok":true}'),
              url: request.url,
              durationMs: 0
            };
          },
          async dispose() {
            if (!disposed) {
              disposed = true;
              counters.disposals += 1;
              counters.active -= 1;
            }
          }
        };
      }
    };
    const runtime = createFlowtract({
      baseURL: 'https://example.test',
      operations: [Stress],
      transport
    });

    for (let cycle = 0; cycle < 1_000; cycle += 1) {
      const result = await runtime.runScenario(scenario => scenario.execute(Stress), {
        id: `stress-${cycle}`
      });
      expect(result.status).toBe(200);
    }

    expect(counters).toEqual({ sessions: 1_000, requests: 1_000, disposals: 1_000, active: 0 });
  });
});
