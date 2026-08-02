import { normalizeConfig } from './config.js';
import { Scenario, runScenario } from './scenario.js';
import { TransportError } from './errors.js';
import type {
  FlowtractConfig,
  FlowtractRuntime,
  FlowtractScenario,
  ScenarioMetadata
} from './runtime-types.js';
import { safeDataProperty } from './internal/safe-inspection.js';

/** Creates an immutable, reusable runtime whose mutable execution state is scenario-local. */
export function createFlowtract(config: FlowtractConfig): FlowtractRuntime {
  const normalized = normalizeConfig(config);
  return Object.freeze({
    async createScenario(metadata?: ScenarioMetadata) {
      try {
        const createSession = safeDataProperty(normalized.transport, 'createSession');
        if (typeof createSession !== 'function') {
          throw new TypeError('Transport must define createSession() as a data method.');
        }
        const transport = await Reflect.apply(createSession, normalized.transport, [
          {
            baseURL: normalized.baseURL,
            allowInsecureTls: normalized.allowInsecureTls
          }
        ]);
        const execute = safeDataProperty(transport, 'execute');
        const dispose = safeDataProperty(transport, 'dispose');
        if (typeof execute !== 'function' || typeof dispose !== 'function') {
          throw new TypeError('Transport session must define execute() and dispose().');
        }
        const safeTransport = {
          execute: (...arguments_: Parameters<typeof transport.execute>) =>
            Reflect.apply(execute, transport, arguments_),
          dispose: (...arguments_: Parameters<typeof transport.dispose>) =>
            Reflect.apply(dispose, transport, arguments_)
        };
        return new Scenario(normalized, safeTransport, metadata);
      } catch (error) {
        try {
          if (error instanceof TransportError) throw error;
        } catch (classificationError) {
          if (classificationError === error) throw error;
        }
        throw new TransportError('Failed to create transport session.', {
          details: { kind: 'unknown' },
          cause: error
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
