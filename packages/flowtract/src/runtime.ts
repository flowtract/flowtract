import { normalizeConfig } from './config.js';
import { Scenario, runScenario } from './scenario.js';
import { TransportError } from './errors.js';
import type {
  FlowtractConfig,
  FlowtractRuntime,
  FlowtractScenario,
  ScenarioMetadata
} from './runtime-types.js';

export function createFlowtract(config: FlowtractConfig): FlowtractRuntime {
  const normalized = normalizeConfig(config);
  return Object.freeze({
    async createScenario(metadata?: ScenarioMetadata) {
      try {
        const transport = await normalized.transport.createSession({
          baseURL: normalized.baseURL,
          allowInsecureTls: normalized.allowInsecureTls
        });
        return new Scenario(normalized, transport, metadata);
      } catch (error) {
        if (error instanceof TransportError) throw error;
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
