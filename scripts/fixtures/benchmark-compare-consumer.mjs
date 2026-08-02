import { createRequire } from 'node:module';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const [candidateRoot, baselineRoot] = process.argv.slice(2);
if (candidateRoot === undefined || baselineRoot === undefined) {
  throw new Error('Candidate and baseline consumer roots are required.');
}

function load(root) {
  const require = createRequire(path.join(root, 'benchmark-entry.cjs'));
  return { flowtract: require('flowtract'), z: require('zod').z };
}

function harness({ flowtract, z }) {
  const operation = flowtract.defineOperation({
    id: 'benchmark.read',
    method: 'GET',
    path: '/benchmark',
    responses: { 200: { body: z.object({ ok: z.literal(true) }) } }
  });
  const responseBody = new TextEncoder().encode('{"ok":true}');
  const counters = { sessions: 0, requests: 0, disposals: 0 };
  const runtime = flowtract.createFlowtract({
    baseURL: 'https://benchmark.invalid',
    operations: [operation],
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

  return {
    counters,
    async executeBatch(operations) {
      const scenario = await runtime.createScenario();
      const startedAt = performance.now();
      for (let index = 0; index < operations; index += 1) {
        const result = await scenario.execute(operation);
        if (result.status !== 200 || result.body.ok !== true) {
          throw new Error(`Incorrect benchmark result at operation ${index}.`);
        }
      }
      const durationMs = performance.now() - startedAt;
      await scenario.close();
      return durationMs;
    }
  };
}

const candidate = harness(load(candidateRoot));
const baseline = harness(load(baselineRoot));
await candidate.executeBatch(1_000);
await baseline.executeBatch(1_000);

const durations = { candidate: [], baseline: [] };
for (let batch = 0; batch < 5; batch += 1) {
  const order = batch % 2 === 0 ? ['candidate', 'baseline'] : ['baseline', 'candidate'];
  for (const name of order)
    durations[name].push(await { candidate, baseline }[name].executeBatch(10_000));
}

function result(name, target) {
  const durationsMs = durations[name];
  const sorted = [...durationsMs].sort((left, right) => left - right);
  return {
    warmupOperations: 1_000,
    batches: 5,
    operationsPerBatch: 10_000,
    durationsMs,
    medianMs: sorted[Math.floor(sorted.length / 2)],
    counters: target.counters
  };
}

console.log(
  `FLOWTRACT_BENCHMARK_COMPARE ${JSON.stringify({
    candidate: result('candidate', candidate),
    baseline: result('baseline', baseline)
  })}`
);
