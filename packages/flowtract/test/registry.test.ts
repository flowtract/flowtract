import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { DuplicateOperationError, defineOperation } from '../src/index.js';
import { OperationRegistry } from '../src/internal/operation-registry.js';

const Health = defineOperation({
  id: 'health.get',
  method: 'GET',
  path: '/health',
  responses: { 200: { body: z.object({ ok: z.boolean() }) } }
});

describe('OperationRegistry', () => {
  it('preserves order, resolves by id, and does not freeze the caller array', () => {
    const operations = [Health];
    const registry = new OperationRegistry(operations);

    expect(registry.operations).toEqual([Health]);
    expect(registry.get('health.get')).toBe(Health);
    expect(registry.get('missing')).toBeUndefined();
    expect(Object.isFrozen(registry.operations)).toBe(true);
    expect(Object.isFrozen(operations)).toBe(false);
  });

  it('reports deterministic duplicate indexes without global state', () => {
    try {
      new OperationRegistry([Health, Health]);
      throw new Error('Expected duplicate registration to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(DuplicateOperationError);
      const duplicate = error as DuplicateOperationError;
      expect(duplicate.details).toEqual({
        operationId: 'health.get',
        firstIndex: 0,
        duplicateIndex: 1
      });
    }

    expect(() => new OperationRegistry([Health])).not.toThrow();
  });
});
