import { normalizeConfig } from './config.js';
import { Scenario, runScenario } from './scenario.js';
import { TransportError } from './errors.js';
import type {
  FlowtractConfig,
  FlowtractRuntime,
  FlowtractScenario,
  HttpTransportSession,
  ScenarioMetadata
} from './runtime-types.js';
import { safeDataProperty } from './internal/safe-inspection.js';

/** Creates an immutable, reusable runtime whose mutable execution state is scenario-local. */
export function createFlowtract(config: FlowtractConfig): FlowtractRuntime {
  const normalized = normalizeConfig(config);
  return Object.freeze({
    async createScenario(metadata?: ScenarioMetadata) {
      let transport: HttpTransportSession | undefined;
      try {
        const createSession = safeDataProperty(normalized.transport, 'createSession');
        if (typeof createSession !== 'function') {
          throw new TypeError('Transport must define createSession() as a data method.');
        }
        transport = await Reflect.apply(createSession, normalized.transport, [
          {
            baseURL: normalized.baseURL,
            allowInsecureTls: normalized.allowInsecureTls
          }
        ]);
        const session = transport;
        if (session === undefined) {
          throw new TypeError('Transport createSession() returned no session.');
        }
        const execute = safeDataProperty(session, 'execute');
        const dispose = safeDataProperty(session, 'dispose');
        if (typeof execute !== 'function' || typeof dispose !== 'function') {
          throw new TypeError('Transport session must define execute() and dispose().');
        }
        const safeTransport = {
          execute: (...arguments_: Parameters<typeof session.execute>) =>
            Reflect.apply(execute, session, arguments_),
          dispose: (...arguments_: Parameters<typeof session.dispose>) =>
            Reflect.apply(dispose, session, arguments_)
        };
        return new Scenario(normalized, safeTransport, metadata);
      } catch (error) {
        let failure = error;
        if (transport !== undefined) {
          const dispose = safeDataProperty(transport, 'dispose');
          if (typeof dispose === 'function') {
            try {
              await Reflect.apply(dispose, transport, []);
            } catch (disposeError) {
              failure = new AggregateError(
                [error, disposeError],
                'Transport session validation and disposal failed.'
              );
            }
          }
        }
        try {
          if (failure instanceof TransportError) throw failure;
        } catch (classificationError) {
          if (classificationError === failure) throw failure;
        }
        throw new TransportError('Failed to create transport session.', {
          details: { kind: 'unknown' },
          cause: failure
        });
      }
    },
    async runScenario<Result>(
      callback: (scenario: FlowtractScenario) => Promise<Result>,
      metadata?: ScenarioMetadata
    ): Promise<Result> {
      const scenario = await this.createScenario(metadata);
      return runScenario(scenario as Scenario, callback);
    }
  }) as FlowtractRuntime;
}
