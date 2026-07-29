import { InterpolationError } from '../errors.js';
import type { ScenarioState } from './state.js';

const WHOLE_REFERENCE = /^\{\{([^{}]+)\}\}$/u;
const EMBEDDED_REFERENCE = /\{\{([^{}]+)\}\}/gu;

export function interpolateValue(value: unknown, state: ScenarioState): unknown {
  let visitedNodes = 0;
  const objects = new WeakSet<object>();

  const fail = (reference: string | undefined, reason: 'missing' | 'cycle' | 'invalid'): never => {
    throw new InterpolationError('State interpolation failed.', {
      details: { ...(reference === undefined ? {} : { reference }), reason }
    });
  };

  const resolveReference = (name: string, chain: readonly string[]): unknown => {
    const key = name.trim();
    if (key.length === 0) fail(name, 'invalid');
    if (chain.includes(key)) fail(key, 'cycle');
    if (!state.has(key)) fail(key, 'missing');
    if (chain.length >= 64) fail(key, 'invalid');
    return visit(state.require(key), [...chain, key]);
  };

  const visit = (candidate: unknown, chain: readonly string[]): unknown => {
    if (typeof candidate === 'string') {
      const whole = WHOLE_REFERENCE.exec(candidate);
      if (whole !== null) return resolveReference(whole[1] ?? '', chain);
      let matched = false;
      const rendered = candidate.replace(EMBEDDED_REFERENCE, (_match, name: string) => {
        matched = true;
        return String(resolveReference(name, chain));
      });
      if (
        (!matched && (candidate.includes('{{') || candidate.includes('}}'))) ||
        rendered.includes('{{') ||
        rendered.includes('}}')
      ) {
        fail(undefined, 'invalid');
      }
      return rendered;
    }

    if (candidate === null || typeof candidate !== 'object') return candidate;
    if (!Array.isArray(candidate) && Object.getPrototypeOf(candidate) !== Object.prototype) {
      return candidate;
    }
    visitedNodes += 1;
    if (visitedNodes > 10_000 || objects.has(candidate)) fail(undefined, 'cycle');
    objects.add(candidate);
    try {
      if (Array.isArray(candidate)) return candidate.map(item => visit(item, chain));
      const output: Record<string, unknown> = {};
      for (const [key, descriptor] of Object.entries(Object.getOwnPropertyDescriptors(candidate))) {
        if (!descriptor.enumerable) continue;
        if (!('value' in descriptor)) fail(key, 'invalid');
        output[key] = visit(descriptor.value, chain);
      }
      return output;
    } finally {
      objects.delete(candidate);
    }
  };

  return visit(value, []);
}
