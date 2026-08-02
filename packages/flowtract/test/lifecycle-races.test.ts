import { z } from 'zod';
import { describe, expect, it } from 'vitest';
import {
  CleanupError,
  TransportError,
  createFlowtract,
  defineOperation,
  type AuthProvider,
  type HttpTransport,
  type TransportRequest,
  type TransportResponse
} from '../src/index.js';
import { deferred } from './support/deferred.js';

const Read = defineOperation({
  id: 'race.read',
  method: 'GET',
  path: '/race',
  responses: { 200: { body: z.object({ ok: z.literal(true) }) } }
});

const Secured = defineOperation({
  id: 'race.secured',
  method: 'GET',
  path: '/secured',
  auth: 'single',
  responses: { 200: { body: z.object({ ok: z.literal(true) }) } }
});

function success(): TransportResponse {
  return {
    status: 200,
    headers: [['content-type', 'application/json']],
    body: new TextEncoder().encode('{"ok":true}'),
    url: 'https://example.test/final',
    durationMs: 1
  };
}

function runtime(transport: HttpTransport, auth?: Readonly<Record<string, AuthProvider>>) {
  return createFlowtract({
    baseURL: 'https://example.test',
    operations: auth === undefined ? [Read] : [Read, Secured],
    transport,
    ...(auth === undefined ? {} : { auth })
  });
}

describe('Gate 3 deterministic lifecycle schedules', () => {
  it('runs 100 execute-versus-close schedules', async () => {
    for (let schedule = 0; schedule < 100; schedule += 1) {
      const started = deferred();
      const release = deferred();
      let disposals = 0;
      const candidate = runtime({
        async createSession() {
          return {
            async execute() {
              started.resolve();
              await release.promise;
              return success();
            },
            async dispose() {
              disposals += 1;
            }
          };
        }
      });
      const scenario = await candidate.createScenario({ id: `execute-close-${schedule}` });
      const execution = scenario.execute(Read);
      await started.promise;
      const firstClose = scenario.close();
      const secondClose = scenario.close();
      expect(firstClose).toBe(secondClose);
      expect(scenario.closed).toBe(false);
      await expect(scenario.execute(Read)).rejects.toMatchObject({ code: 'FLOWTRACT_CONFIG' });
      release.resolve();
      await expect(execution).resolves.toMatchObject({ status: 200 });
      await firstClose;
      expect(scenario.closed).toBe(true);
      expect(disposals).toBe(1);
    }
  });

  it('runs 100 caller-abort-versus-response schedules', async () => {
    for (let schedule = 0; schedule < 100; schedule += 1) {
      const started = deferred();
      const responseReady = deferred<TransportResponse>();
      const transport: HttpTransport = {
        async createSession() {
          return {
            execute(request: TransportRequest) {
              started.resolve();
              return new Promise<TransportResponse>((resolve, reject) => {
                request.signal?.addEventListener(
                  'abort',
                  () =>
                    reject(
                      new TransportError('aborted', {
                        details: { kind: 'abort' },
                        operationId: request.operationId
                      })
                    ),
                  { once: true }
                );
                void responseReady.promise.then(resolve, reject);
              });
            },
            async dispose() {}
          };
        }
      };
      const scenario = await runtime(transport).createScenario({
        id: `abort-response-${schedule}`
      });
      const controller = new AbortController();
      const execution = scenario.execute(Read, undefined, { signal: controller.signal });
      await started.promise;
      if (schedule % 2 === 0) {
        controller.abort(new Error('synthetic abort marker'));
        responseReady.resolve(success());
        await expect(execution).rejects.toMatchObject({
          code: 'FLOWTRACT_TRANSPORT',
          details: { kind: 'abort' }
        });
      } else {
        responseReady.resolve(success());
        await expect(execution).resolves.toMatchObject({ status: 200 });
        controller.abort(new Error('late abort marker'));
      }
      await scenario.close();
      expect(scenario.history()).toHaveLength(schedule % 2 === 0 ? 0 : 1);
    }
  });

  it('runs 100 auth-single-flight-versus-close schedules', async () => {
    for (let schedule = 0; schedule < 100; schedule += 1) {
      const setupStarted = deferred();
      const releaseSetup = deferred();
      const counters = { create: 0, setup: 0, apply: 0, dispose: 0 };
      const provider: AuthProvider = {
        create: () => {
          counters.create += 1;
          return {
            async setup() {
              counters.setup += 1;
              setupStarted.resolve();
              await releaseSetup.promise;
            },
            apply() {
              counters.apply += 1;
            },
            dispose() {
              counters.dispose += 1;
            }
          };
        }
      };
      const scenario = await runtime(
        {
          async createSession() {
            return { execute: async () => success(), dispose: async () => undefined };
          }
        },
        { single: provider }
      ).createScenario({ id: `auth-close-${schedule}` });
      const execution = scenario.execute(Secured);
      await setupStarted.promise;
      const closing = scenario.close();
      releaseSetup.resolve();
      await execution;
      await closing;
      expect(counters).toEqual({ create: 1, setup: 1, apply: 1, dispose: 1 });
    }
  });

  it('runs 100 cleanup-I/O-versus-disposal schedules', async () => {
    for (let schedule = 0; schedule < 100; schedule += 1) {
      const cleanupStarted = deferred();
      const releaseCleanup = deferred();
      const order: string[] = [];
      const candidate = runtime({
        async createSession() {
          return {
            async execute() {
              cleanupStarted.resolve();
              await releaseCleanup.promise;
              order.push('cleanup-io');
              return success();
            },
            async dispose() {
              order.push('transport-dispose');
            }
          };
        }
      });
      const scenario = await candidate.createScenario({ id: `cleanup-dispose-${schedule}` });
      scenario.registerCleanup('unawaited', client => {
        void client.execute(Read);
        throw new Error('synthetic cleanup failure');
      });
      const closing = scenario.close();
      await cleanupStarted.promise;
      expect(order).toEqual([]);
      releaseCleanup.resolve();
      await expect(closing).rejects.toBeInstanceOf(CleanupError);
      expect(order).toEqual(['cleanup-io', 'transport-dispose']);
      expect(scenario.closed).toBe(true);
    }
  });
});
