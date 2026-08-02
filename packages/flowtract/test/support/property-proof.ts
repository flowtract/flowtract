import fc, { type IProperty } from 'fast-check';
import { safeSnapshot } from '../../src/internal/safe-inspection.js';

const DEFAULT_SEED = 0x464c4f57;

function configuredSeed(): number {
  const raw = process.env.FLOWTRACT_PROPERTY_SEED;
  if (raw === undefined) return DEFAULT_SEED;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) throw new Error('FLOWTRACT_PROPERTY_SEED must be an integer.');
  return parsed;
}

function safeCounterexample(value: unknown): unknown {
  return safeSnapshot(value, {
    maximumDepth: 8,
    maximumNodes: 256,
    maximumText: 128,
    string: text => `[String:${Array.from(text).length}]`,
    redact: key => /authorization|cookie|csrf|password|secret|token|api.?key|session/iu.test(key)
  });
}

export function checkProperty<Ts>(name: string, property: IProperty<Ts>, numRuns: number): void {
  const seed = configuredSeed();
  const requestedPath = process.env.FLOWTRACT_PROPERTY_PATH;
  const result = fc.check(property, {
    seed,
    numRuns,
    ...(requestedPath === undefined ? {} : { path: requestedPath }),
    endOnFailure: false,
    verbose: 0
  });
  if (result.failed) {
    const evidence = Object.freeze({
      property: name,
      seed: result.seed,
      replayPath: result.counterexamplePath,
      caseIndex: Math.max(0, result.numRuns - 1),
      counterexample: safeCounterexample(result.counterexample)
    });
    throw new Error(`Property proof failed: ${JSON.stringify(evidence)}`);
  }
  if (result.numRuns !== numRuns) {
    throw new Error(`${name} completed ${result.numRuns} cases; expected ${numRuns}.`);
  }
}
