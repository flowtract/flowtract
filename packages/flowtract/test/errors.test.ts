import { describe, expect, it } from 'vitest';
import {
  AuthError,
  CleanupError,
  ConfigError,
  DuplicateOperationError,
  FLOWTRACT_ERROR_CODES,
  FlowtractError,
  InterpolationError,
  RequestContractError,
  ResponseContractError,
  ResponseParseError,
  TransportError,
  UndeclaredStatusError
} from '../src/index.js';

describe('Flowtract errors', () => {
  it('defines every stable v0.1 error code exactly once', () => {
    expect(FLOWTRACT_ERROR_CODES).toEqual([
      'FLOWTRACT_CONFIG',
      'FLOWTRACT_DUPLICATE_OPERATION',
      'FLOWTRACT_REQUEST_CONTRACT',
      'FLOWTRACT_TRANSPORT',
      'FLOWTRACT_UNDECLARED_STATUS',
      'FLOWTRACT_RESPONSE_PARSE',
      'FLOWTRACT_RESPONSE_CONTRACT',
      'FLOWTRACT_AUTH',
      'FLOWTRACT_INTERPOLATION',
      'FLOWTRACT_CLEANUP'
    ]);
    expect(new Set(FLOWTRACT_ERROR_CODES).size).toBe(10);
  });

  it('serializes safe fields without stack or cause', () => {
    const cause = new Error('secret nested failure');
    const error = new ConfigError('Invalid config', {
      operationId: 'parts.get',
      details: { path: 'baseURL', issues: ['Required'] },
      cause
    });

    expect(error).toBeInstanceOf(FlowtractError);
    expect(error.cause).toBe(cause);
    expect(error.toJSON()).toEqual({
      code: 'FLOWTRACT_CONFIG',
      message: 'Invalid config',
      operationId: 'parts.get',
      details: { path: 'baseURL', issues: ['Required'] }
    });
    expect(JSON.stringify(error)).not.toContain('stack');
    expect(JSON.stringify(error)).not.toContain('secret nested failure');
  });

  it('constructs every concrete subclass with its fixed code', () => {
    const errors = [
      new ConfigError('config'),
      new DuplicateOperationError('duplicate', {
        details: { operationId: 'a', firstIndex: 0, duplicateIndex: 1 }
      }),
      new RequestContractError('request', {
        details: { section: 'body', issues: [] }
      }),
      new TransportError('transport', {
        details: { kind: 'network' }
      }),
      new UndeclaredStatusError('status', {
        details: { status: 418, declaredStatuses: [200], hasDefault: false }
      }),
      new ResponseParseError('parse', {
        details: { status: 200, contentType: 'application/json' }
      }),
      new ResponseContractError('response', {
        details: {
          status: 200,
          contractStatus: 200,
          section: 'body',
          issues: []
        }
      }),
      new AuthError('auth', {
        details: { profile: 'session', phase: 'apply' }
      }),
      new InterpolationError('interpolation', {
        details: { reference: 'partId', reason: 'missing' }
      }),
      new CleanupError('cleanup', {
        details: { failures: [{ label: 'delete part', message: 'failed' }] }
      })
    ];

    expect(errors.map(error => error.code)).toEqual(FLOWTRACT_ERROR_CODES);
    for (const error of errors) {
      expect(error.name).toBe(error.constructor.name);
      expect(Object.keys(error.toJSON())).not.toContain('cause');
    }
  });
});
