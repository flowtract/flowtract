import { randomUUID } from 'node:crypto';
import { createServer } from 'node:http';
import os from 'node:os';
import { CleanupError, TransportError, createFlowtract, defineOperation } from 'flowtract';
import { z } from 'zod';

const profile = process.env.FLOWTRACT_SOAK_PROFILE === 'smoke' ? 'smoke' : 'acceptance';
const durationTargetMs = profile === 'smoke' ? 5_000 : 15 * 60_000;
const operationTarget = profile === 'smoke' ? 100 : 10_000;
const sampleIntervalMs = profile === 'smoke' ? 1_000 : 60_000;
const seed = 0x464c4f57;
const secret = `soak-${randomUUID()}`;
const counters = {
  operations: 0,
  successful: 0,
  declaredErrors: 0,
  expectedTimeouts: 0,
  expectedAborts: 0,
  expectedCleanupFailures: 0,
  unexpectedFailures: 0,
  customSessions: 0,
  activeCustomSessions: 0,
  customDisposals: 0,
  authInstances: 0,
  activeAuthInstances: 0,
  authDisposals: 0,
  serverRequests: 0,
  activeServerRequests: 0
};

const sockets = new Set();
const server = createServer((request, response) => {
  counters.serverRequests += 1;
  counters.activeServerRequests += 1;
  response.once('finish', () => {
    counters.activeServerRequests -= 1;
  });
  if (request.url === '/declared') {
    response.writeHead(503, { 'content-type': 'application/json' });
    response.end('{"message":"expected"}');
    return;
  }
  response.writeHead(200, { 'content-type': 'application/json' });
  response.end('{"ok":true}');
});
server.on('connection', socket => {
  sockets.add(socket);
  socket.once('close', () => sockets.delete(socket));
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});
const address = server.address();
if (address === null || typeof address === 'string') throw new Error('Soak server did not bind.');
const baseURL = `http://127.0.0.1:${address.port}`;

const CustomSuccess = defineOperation({
  id: 'soak.custom.success',
  method: 'GET',
  path: '/success',
  auth: 'lazy',
  responses: { 200: { body: z.object({ ok: z.literal(true) }) } }
});
const CustomDeclared = defineOperation({
  id: 'soak.custom.declared',
  method: 'GET',
  path: '/declared',
  responses: { 503: { body: z.object({ message: z.literal('expected') }) } }
});
const CustomTimeout = defineOperation({
  id: 'soak.custom.timeout',
  method: 'GET',
  path: '/timeout',
  responses: { 200: { body: z.unknown() } }
});
const CustomAbort = defineOperation({
  id: 'soak.custom.abort',
  method: 'GET',
  path: '/abort',
  responses: { 200: { body: z.unknown() } }
});
const HttpSuccess = defineOperation({
  id: 'soak.http.success',
  method: 'GET',
  path: '/success',
  responses: { 200: { body: z.object({ ok: z.literal(true) }) } }
});

const customRuntime = createFlowtract({
  baseURL,
  operations: [CustomSuccess, CustomDeclared, CustomTimeout, CustomAbort],
  auth: {
    lazy: {
      create() {
        counters.authInstances += 1;
        counters.activeAuthInstances += 1;
        let disposed = false;
        return {
          apply({ request }) {
            request.setHeader('authorization', `Bearer ${secret}`);
          },
          dispose() {
            if (!disposed) {
              disposed = true;
              counters.authDisposals += 1;
              counters.activeAuthInstances -= 1;
            }
          }
        };
      }
    }
  },
  transport: {
    async createSession() {
      counters.customSessions += 1;
      counters.activeCustomSessions += 1;
      let disposed = false;
      return {
        async execute(request) {
          if (request.operationId === CustomTimeout.id) {
            throw new TransportError('expected timeout', {
              operationId: request.operationId,
              details: { kind: 'timeout' }
            });
          }
          const declared = request.operationId === CustomDeclared.id;
          return {
            status: declared ? 503 : 200,
            headers: [['content-type', 'application/json']],
            body: new TextEncoder().encode(declared ? '{"message":"expected"}' : '{"ok":true}'),
            url: request.url,
            durationMs: 0
          };
        },
        async dispose() {
          if (!disposed) {
            disposed = true;
            counters.customDisposals += 1;
            counters.activeCustomSessions -= 1;
          }
        }
      };
    }
  }
});
const httpRuntime = createFlowtract({ baseURL, operations: [HttpSuccess] });

const heapSamples = [];
function sampleHeap(elapsedMs) {
  if (typeof globalThis.gc !== 'function') throw new Error('Soak proof requires --expose-gc.');
  globalThis.gc();
  heapSamples.push({ elapsedMs, heapUsed: process.memoryUsage().heapUsed });
}

let scenarioIndex = 0;
const startedAt = Date.now();
let nextSampleAt = startedAt;
sampleHeap(0);

while (Date.now() - startedAt < durationTargetMs || counters.operations < operationTarget) {
  const batchSize = counters.operations < operationTarget ? 100 : 1;
  try {
    await customRuntime.runScenario(async scenario => {
      scenario.setSecret('proof-secret', secret);
      if (scenarioIndex % 100 === 0) {
        scenario.registerCleanup('expected-failure', () => {
          throw new Error('expected cleanup failure');
        });
      } else {
        scenario.registerCleanup('success', () => undefined);
      }
      for (let index = 0; index < batchSize; index += 1) {
        const selector = counters.operations % 100;
        counters.operations += 1;
        if (selector === 0) {
          const declared = await scenario.execute(CustomDeclared);
          if (declared.status !== 503) throw new Error('Incorrect declared-error result.');
          counters.declaredErrors += 1;
        } else if (selector === 1) {
          await scenario.execute(CustomTimeout).then(
            () => {
              throw new Error('Expected timeout succeeded.');
            },
            error => {
              if (!(error instanceof TransportError) || error.details?.kind !== 'timeout')
                throw error;
            }
          );
          counters.expectedTimeouts += 1;
        } else if (selector === 2) {
          const controller = new AbortController();
          controller.abort();
          await scenario.execute(CustomAbort, undefined, { signal: controller.signal }).then(
            () => {
              throw new Error('Expected abort succeeded.');
            },
            error => {
              if (!(error instanceof TransportError) || error.details?.kind !== 'abort')
                throw error;
            }
          );
          counters.expectedAborts += 1;
        } else {
          const result = await scenario.execute(CustomSuccess);
          if (result.body.ok !== true) throw new Error('Incorrect successful result.');
          counters.successful += 1;
        }
      }
    });
  } catch (error) {
    if (error instanceof CleanupError && scenarioIndex % 100 === 0) {
      counters.expectedCleanupFailures += 1;
    } else {
      counters.unexpectedFailures += 1;
      throw error;
    }
  }

  if (scenarioIndex % 20 === 0) {
    await httpRuntime.runScenario(async scenario => {
      const result = await scenario.execute(HttpSuccess);
      if (result.body.ok !== true) throw new Error('Incorrect Playwright result.');
    });
  }
  scenarioIndex += 1;

  const now = Date.now();
  if (now >= nextSampleAt + sampleIntervalMs) {
    nextSampleAt += sampleIntervalMs;
    sampleHeap(now - startedAt);
  }
  if (counters.operations >= operationTarget) {
    await new Promise(resolve => setTimeout(resolve, profile === 'smoke' ? 10 : 100));
  }
}

sampleHeap(Date.now() - startedAt);
const socketClosures = [...sockets].map(
  socket =>
    new Promise(resolve => {
      if (socket.destroyed) resolve();
      else socket.once('close', resolve);
      socket.destroy();
    })
);
const serverClosed = new Promise((resolve, reject) =>
  server.close(error => (error ? reject(error) : resolve()))
);
server.closeAllConnections();
await Promise.all([serverClosed, ...socketClosures]);

const values = heapSamples.map(sample => sample.heapUsed);
const median = items => {
  const sorted = [...items].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
};
const baselineMedian = median(values.slice(0, 5));
const endingMedian = median(values.slice(-5));
const heapThreshold = Math.max(16 * 1024 * 1024, baselineMedian * 0.2);
const heapAccepted = profile === 'smoke' || endingMedian <= baselineMedian + heapThreshold;
const resources = {
  activeCustomSessions: counters.activeCustomSessions,
  activeAuthInstances: counters.activeAuthInstances,
  activeServerRequests: counters.activeServerRequests,
  activeSockets: sockets.size
};
const report = {
  schemaVersion: 1,
  sha: process.env.FLOWTRACT_CANDIDATE_SHA ?? 'unknown',
  profile,
  os: `${os.platform()}-${os.arch()}`,
  node: process.version,
  npm: process.env.npm_config_user_agent ?? 'unknown',
  seed,
  durationMs: Date.now() - startedAt,
  operationTarget,
  counters,
  resources,
  heapSamples,
  baselineMedian,
  endingMedian,
  heapThreshold,
  secretScanCount: 0,
  verdict:
    counters.operations >= operationTarget &&
    counters.unexpectedFailures === 0 &&
    Object.values(resources).every(value => value === 0) &&
    heapAccepted
      ? 'passed'
      : 'failed'
};
const serialized = JSON.stringify(report);
report.secretScanCount = serialized.includes(secret) ? 1 : 0;
if (report.secretScanCount !== 0) report.verdict = 'failed';
console.log(`FLOWTRACT_SOAK ${JSON.stringify(report)}`);
if (report.verdict !== 'passed') process.exitCode = 1;
