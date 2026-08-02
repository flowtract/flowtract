import { performance } from 'node:perf_hooks';
import { createFlowtract, defineOperation } from 'flowtract';
import { z } from 'zod';

const Benchmark = defineOperation({
  id: 'benchmark.read',
  method: 'GET',
  path: '/benchmark',
  responses: { 200: { body: z.object({ ok: z.literal(true) }) } }
});

const responseBody = new TextEncoder().encode('{"ok":true}');
const counters = { sessions: 0, requests: 0, disposals: 0 };
const runtime = createFlowtract({
  baseURL: 'https://benchmark.invalid',
  operations: [Benchmark],
  transport: {
    async createSession() {
      counters.sessions += 1;
      return {
        async execute(request) {
          counters.requests += 1;
          return {
            status: 200,
            headers: [['content-type', 'application/json']],
            body: responseBody,
            url: request.url,
            durationMs: 0
          };
        },
        async dispose() {
          counters.disposals += 1;
        }
      };
    }
  }
});

async function executeBatch(operations) {
  const scenario = await runtime.createScenario();
  const startedAt = performance.now();
  for (let index = 0; index < operations; index += 1) {
    const result = await scenario.execute(Benchmark);
    if (result.status !== 200 || result.body.ok !== true) {
      throw new Error(`Incorrect benchmark result at operation ${index}.`);
    }
  }
  const durationMs = performance.now() - startedAt;
  await scenario.close();
  return durationMs;
}

await executeBatch(1_000);
const durationsMs = [];
for (let batch = 0; batch < 5; batch += 1) durationsMs.push(await executeBatch(10_000));
const sorted = [...durationsMs].sort((left, right) => left - right);
const medianMs = sorted[Math.floor(sorted.length / 2)];

console.log(
  `FLOWTRACT_BENCHMARK ${JSON.stringify({
    warmupOperations: 1_000,
    batches: 5,
    operationsPerBatch: 10_000,
    durationsMs,
    medianMs,
    counters
  })}`
);
