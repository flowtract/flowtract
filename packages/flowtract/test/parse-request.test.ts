import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { RequestContractError, defineOperation } from '../src/index.js';
import { parseOperationInput } from '../src/internal/parse-request.js';

describe('parseOperationInput', () => {
  it('returns defaults, coercions, and transformations instead of raw input', () => {
    const operation = defineOperation({
      id: 'reports.create',
      method: 'POST',
      path: '/reports/{reportId}',
      request: {
        headers: z.object({ accept: z.string().default('application/json') }).prefault({}),
        query: z.object({ page: z.coerce.number().int().default(1) }).prefault({}),
        pathParams: z.object({
          reportId: z.string().transform(value => value.toUpperCase())
        }),
        body: z.object({
          quantity: z.coerce.number().positive(),
          label: z.string().transform(value => value.trim())
        })
      },
      responses: { 201: { body: z.object({ id: z.string() }) } }
    });

    const parsed = parseOperationInput(operation, {
      pathParams: { reportId: 'r-1' },
      body: { quantity: '4', label: '  monthly  ' }
    });

    expect(parsed).toEqual({
      headers: { accept: 'application/json' },
      query: { page: 1 },
      pathParams: { reportId: 'R-1' },
      body: { quantity: 4, label: 'monthly' }
    });
  });

  it('maps Zod issues into a stable request-contract error', () => {
    const operation = defineOperation({
      id: 'parts.create',
      method: 'POST',
      path: '/parts',
      request: {
        body: z.object({
          name: z.string().min(2)
        })
      },
      responses: { 201: { body: z.string() } }
    });

    try {
      parseOperationInput(operation, { body: { name: '' } });
      throw new Error('Expected parsing to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(RequestContractError);
      const contractError = error as RequestContractError;
      expect(contractError.code).toBe('FLOWTRACT_REQUEST_CONTRACT');
      expect(contractError.operationId).toBe('parts.create');
      expect(contractError.details?.section).toBe('body');
      expect(contractError.details?.issues[0]?.path).toEqual(['name']);
    }
  });

  it('rejects undeclared and arbitrary request sections at runtime', () => {
    const operation = defineOperation({
      id: 'health.get',
      method: 'GET',
      path: '/health',
      responses: { 200: { body: z.string() } }
    });

    expect(() => parseOperationInput(operation, { body: 'unexpected' } as never)).toThrowError(
      'Request section "body" is not declared.'
    );
    expect(() => parseOperationInput(operation, { arbitrary: true } as never)).toThrowError(
      'Request section "arbitrary" is not declared.'
    );
    expect(() => parseOperationInput(operation, null as never)).toThrowError(
      'Request input must be an object.'
    );
    expect(() => parseOperationInput(operation, [] as never)).toThrowError(
      'Request input must be an object.'
    );
  });

  it('parses undefined for declared optional sections', () => {
    const operation = defineOperation({
      id: 'search.get',
      method: 'GET',
      path: '/search',
      request: {
        query: z.object({ query: z.string() }).optional()
      },
      responses: { 200: { body: z.array(z.string()) } }
    });

    expect(parseOperationInput(operation, undefined)).toEqual({ query: undefined });
  });
});
