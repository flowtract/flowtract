import { ConfigError } from '../errors.js';
import type { RedactionConfig } from '../runtime-types.js';
import type { SecretTracker } from './state.js';
import { safeSnapshot } from './safe-inspection.js';

const REDACTED = '[REDACTED]';
const BUILT_IN_HEADERS = new Set([
  'authorization',
  'proxy-authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-csrf-token'
]);
const BUILT_IN_KEYS = new Set(
  [
    'password',
    'passwd',
    'secret',
    'token',
    'accessToken',
    'refreshToken',
    'apiKey',
    'sessionId'
  ].map(value => value.toLowerCase())
);

function parsePath(path: string): readonly string[] {
  if (path.length === 0) {
    throw new ConfigError('Redaction JSON paths must not be empty.', {
      details: { path: 'redaction.jsonPaths', issues: ['Empty JSON path.'] }
    });
  }
  const segments = path.split('.');
  if (segments.some(segment => segment.length === 0 || segment.includes('\\'))) {
    throw new ConfigError(`Redaction JSON path "${path}" is invalid.`, {
      details: {
        path: 'redaction.jsonPaths',
        issues: ['Use dot-delimited literal, numeric, or "*" segments without escaping.']
      }
    });
  }
  return segments;
}

export class Redactor {
  readonly #headers: ReadonlySet<string>;
  readonly #paths: readonly (readonly string[])[];
  readonly previewCharacters: number;

  constructor(
    config: RedactionConfig | undefined,
    readonly secrets: SecretTracker
  ) {
    const previewCharacters = config?.previewCharacters ?? 2048;
    if (!Number.isInteger(previewCharacters) || previewCharacters < 0 || previewCharacters > 8192) {
      throw new ConfigError('redaction.previewCharacters must be an integer from 0 to 8192.', {
        details: {
          path: 'redaction.previewCharacters',
          issues: ['Expected an integer from 0 to 8192.']
        }
      });
    }
    this.previewCharacters = previewCharacters;
    this.#headers = new Set([
      ...BUILT_IN_HEADERS,
      ...(config?.headers ?? []).map(header => header.toLowerCase())
    ]);
    this.#paths = (config?.jsonPaths ?? []).map(parsePath);
  }

  text(value: string): string {
    let output = value;
    for (const secret of this.secrets.strings()) {
      output = output.split(secret).join(REDACTED);
    }
    return output;
  }

  preview(value: string): string {
    return Array.from(this.text(value)).slice(0, this.previewCharacters).join('');
  }

  url(value: string): string {
    try {
      const url = new URL(value);
      for (const key of [...url.searchParams.keys()]) {
        url.searchParams.set(key, REDACTED);
      }
      return this.text(url.toString());
    } catch {
      return this.text(value);
    }
  }

  value(value: unknown): unknown {
    return safeSnapshot(value, {
      string: candidate => this.text(candidate),
      redact: (key, path) =>
        this.#headers.has(key.toLowerCase()) ||
        BUILT_IN_KEYS.has(key.toLowerCase()) ||
        this.#paths.some(
          pattern =>
            pattern.length === path.length &&
            pattern.every((segment, index) => segment === '*' || segment === path[index])
        ),
      redactedValue: REDACTED
    });
  }
}
