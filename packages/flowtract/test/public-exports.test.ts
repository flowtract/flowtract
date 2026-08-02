import { describe, expect, it } from 'vitest';
import * as flowtract from '../src/index.js';

describe('public runtime exports', () => {
  it('matches the reviewed Gate 2 surface', () => {
    expect(Object.keys(flowtract).sort()).toEqual([
      'AuthError',
      'CleanupError',
      'ConfigError',
      'DuplicateOperationError',
      'FLOWTRACT_ERROR_CODES',
      'FlowtractError',
      'InterpolationError',
      'RequestContractError',
      'ResponseContractError',
      'ResponseParseError',
      'TransportError',
      'UndeclaredStatusError',
      'apiKey',
      'basicAuth',
      'bearerToken',
      'createFlowtract',
      'defineConfig',
      'defineOperation',
      'emptyBody',
      'hasCleanupError',
      'playwrightTransport',
      'sessionAuth'
    ]);
  });
});
