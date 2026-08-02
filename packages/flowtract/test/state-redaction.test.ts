import { describe, expect, it } from 'vitest';
import { InterpolationError } from '../src/index.js';
import { interpolateValue } from '../src/internal/interpolate.js';
import { Redactor } from '../src/internal/redaction.js';
import { ScenarioState, SecretTracker } from '../src/internal/state.js';

describe('scenario state and interpolation', () => {
  it('preserves whole-value types and resolves nested references', () => {
    const state = new ScenarioState(new SecretTracker());
    state.set('count', 4);
    state.set('object', { value: '{{count}}' });
    expect(interpolateValue('{{count}}', state)).toBe(4);
    expect(interpolateValue({ nested: '{{object}}', text: 'count={{count}}' }, state)).toEqual({
      nested: { value: 4 },
      text: 'count=4'
    });
  });

  it('distinguishes explicit undefined and rejects missing/cyclic/malformed references', () => {
    const state = new ScenarioState(new SecretTracker());
    state.set('present', undefined);
    expect(state.has('present')).toBe(true);
    expect(interpolateValue('{{present}}', state)).toBeUndefined();
    expect(() => interpolateValue('{{missing}}', state)).toThrow(InterpolationError);
    state.set('a', '{{b}}');
    state.set('b', '{{a}}');
    expect(() => interpolateValue('{{a}}', state)).toThrow(InterpolationError);
    expect(() => interpolateValue('{{broken}', state)).toThrow(InterpolationError);
  });

  it('prevents secret downgrade and empty secrets', () => {
    const state = new ScenarioState(new SecretTracker());
    state.setSecret('token', 'secret-value');
    expect(() => state.set('token', 'public')).toThrow(InterpolationError);
    expect(() => state.setSecret('empty', '')).toThrow(InterpolationError);
  });

  it('enforces reference-depth and traversal-node bounds', () => {
    const state = new ScenarioState(new SecretTracker());
    for (let index = 0; index < 65; index += 1) {
      state.set(`depth${index}`, index === 64 ? 'end' : `{{depth${index + 1}}}`);
    }
    expect(() => interpolateValue('{{depth0}}', state)).toThrow(InterpolationError);

    const tooMany = Array.from({ length: 10_001 }, () => []);
    expect(() => interpolateValue(tooMany, state)).toThrow(InterpolationError);
  });
});

describe('redaction', () => {
  it('redacts built-ins, configured paths, headers, and literal secrets', () => {
    const credentialField = ['pass', 'word'].join('');
    const secrets = new SecretTracker();
    secrets.add('literal.secret+');
    const redactor = new Redactor(
      {
        headers: ['x-private'],
        jsonPaths: ['nested.*.value'],
        previewCharacters: 20
      },
      secrets
    );
    const value = redactor.value({
      authorization: 'Bearer abc',
      [credentialField]: 'synthetic-credential',
      'x-private': 'private',
      nested: [{ value: 'hidden', other: 'literal.secret+' }]
    });
    expect(value).toEqual({
      authorization: '[REDACTED]',
      [credentialField]: '[REDACTED]',
      'x-private': '[REDACTED]',
      nested: [{ value: '[REDACTED]', other: '[REDACTED]' }]
    });
    expect(redactor.preview(`prefix literal.secret+ suffix`)).not.toContain('literal.secret+');
  });

  it('does not invoke getters and handles cycles', () => {
    const redactor = new Redactor(undefined, new SecretTracker());
    let invoked = false;
    const value: Record<string, unknown> = {};
    Object.defineProperty(value, 'danger', {
      enumerable: true,
      get() {
        invoked = true;
        return 'secret';
      }
    });
    value.self = value;
    expect(redactor.value(value)).toEqual({ danger: '[Accessor]', self: '[Circular]' });
    expect(invoked).toBe(false);
  });
});
