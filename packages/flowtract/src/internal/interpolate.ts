import { InterpolationError } from '../errors.js';
import type { ScenarioState } from './state.js';
import {
  defineSafeData,
  safeArrayValues,
  safeIsArray,
  safeOwnEntries,
  safePrimitiveText
} from './safe-inspection.js';

const WHOLE_REFERENCE = /^\{\{([^{}]+)\}\}$/u;
const EMBEDDED_REFERENCE = /\{\{([^{}]+)\}\}/gu;

export interface InterpolationResult {
  readonly value: unknown;
  readonly taintedPaths: readonly (readonly (string | number)[])[];
}

export function interpolateWithTaint(value: unknown, state: ScenarioState): InterpolationResult {
  let visitedNodes = 0;
  const objects = new WeakSet<object>();
  const taintedPaths: Array<readonly (string | number)[]> = [];

  const fail = (reference: string | undefined, reason: 'missing' | 'cycle' | 'invalid'): never => {
    throw new InterpolationError('State interpolation failed.', {
      details: { ...(reference === undefined ? {} : { reference }), reason }
    });
  };

  const markTainted = (path: readonly (string | number)[]): void => {
    if (
      !taintedPaths.some(
        existing =>
          existing.length === path.length && existing.every((part, index) => part === path[index])
      )
    ) {
      taintedPaths.push(Object.freeze([...path]));
    }
  };

  const resolveReference = (
    name: string,
    chain: readonly string[],
    path: readonly (string | number)[],
    depth: number
  ): { readonly value: unknown; readonly tainted: boolean } => {
    const key = name.trim();
    if (key.length === 0) fail(name, 'invalid');
    if (chain.includes(key)) fail(key, 'cycle');
    if (!state.has(key)) fail(key, 'missing');
    if (chain.length >= 64) fail(key, 'invalid');
    const nested = visit(state.require(key), [...chain, key], path, depth + 1);
    const tainted = state.isSecret(key) || nested.tainted;
    if (tainted) markTainted(path);
    return { value: nested.value, tainted };
  };

  const visit = (
    candidate: unknown,
    chain: readonly string[],
    path: readonly (string | number)[],
    depth: number
  ): { readonly value: unknown; readonly tainted: boolean } => {
    if (depth >= 64) fail(undefined, 'invalid');
    if (typeof candidate === 'string') {
      const whole = WHOLE_REFERENCE.exec(candidate);
      if (whole !== null) return resolveReference(whole[1] ?? '', chain, path, depth);
      let matched = false;
      let tainted = false;
      const rendered = candidate.replace(EMBEDDED_REFERENCE, (_match, name: string) => {
        matched = true;
        const resolved = resolveReference(name, chain, path, depth);
        tainted ||= resolved.tainted;
        const text = safePrimitiveText(resolved.value);
        if (text === undefined) return fail(name, 'invalid');
        return text;
      });
      if (
        (!matched && (candidate.includes('{{') || candidate.includes('}}'))) ||
        rendered.includes('{{') ||
        rendered.includes('}}')
      ) {
        fail(undefined, 'invalid');
      }
      if (tainted) markTainted(path);
      return { value: rendered, tainted };
    }

    if (candidate === null || typeof candidate !== 'object') {
      return { value: candidate, tainted: false };
    }
    const inspected = safeOwnEntries(candidate);
    if (!inspected.ok) fail(undefined, 'invalid');
    const isArray = safeIsArray(candidate);
    if (isArray === undefined) fail(undefined, 'invalid');
    if (!isArray && inspected.prototype !== Object.prototype && inspected.prototype !== null) {
      return { value: candidate, tainted: false };
    }
    visitedNodes += 1;
    if (visitedNodes > 10_000 || objects.has(candidate)) fail(undefined, 'cycle');
    objects.add(candidate);
    try {
      if (isArray) {
        let tainted = false;
        const values = safeArrayValues(candidate);
        if (values === undefined) return fail(undefined, 'invalid');
        const output = values.map((item, index) => {
          const nested = visit(item, chain, [...path, index], depth + 1);
          tainted ||= nested.tainted;
          return nested.value;
        });
        return { value: output, tainted };
      }
      const output: Record<string, unknown> = {};
      let tainted = false;
      for (const entry of inspected.entries) {
        if (!entry.enumerable) continue;
        if (entry.kind !== 'data') fail(entry.key, 'invalid');
        const nested = visit(entry.value, chain, [...path, entry.key], depth + 1);
        tainted ||= nested.tainted;
        defineSafeData(output, entry.key, nested.value);
      }
      return { value: output, tainted };
    } finally {
      objects.delete(candidate);
    }
  };

  const result = visit(value, [], [], 0);
  return Object.freeze({
    value: result.value,
    taintedPaths: Object.freeze(taintedPaths)
  });
}

export function interpolateValue(value: unknown, state: ScenarioState): unknown {
  return interpolateWithTaint(value, state).value;
}
