import { ConfigError } from './errors.js';
import { OperationRegistry } from './internal/operation-registry.js';
import { Redactor } from './internal/redaction.js';
import { SecretTracker } from './internal/state.js';
import { playwrightTransport } from './playwright-transport.js';
import type { OperationDefinition } from './operation-types.js';
import type {
  AuthProvider,
  FlowtractConfig,
  HttpTransport,
  RedactionConfig
} from './runtime-types.js';

export interface NormalizedConfig {
  readonly baseURL: string;
  readonly operations: readonly OperationDefinition[];
  readonly registry: OperationRegistry<readonly OperationDefinition[]>;
  readonly transport: HttpTransport;
  readonly auth: Readonly<Record<string, AuthProvider>>;
  readonly defaultAuth: string | false;
  readonly timeoutMs: number;
  readonly allowInsecureTls: boolean;
  readonly redaction: RedactionConfig | undefined;
}

function fail(path: string, message: string): never {
  throw new ConfigError(message, { details: { path, issues: [message] } });
}

function positiveTimeout(value: number | undefined, path: string, fallback: number): number {
  const resolved = value ?? fallback;
  if (!Number.isInteger(resolved) || resolved <= 0) {
    fail(path, `${path} must be a positive integer.`);
  }
  return resolved;
}

function normalizeBaseURL(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    fail('baseURL', 'baseURL must be an absolute HTTP or HTTPS URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol)) {
    fail('baseURL', 'baseURL must use HTTP or HTTPS.');
  }
  if (url.username !== '' || url.password !== '')
    fail('baseURL', 'baseURL must not contain credentials.');
  if (url.search !== '' || url.hash !== '')
    fail('baseURL', 'baseURL must not contain query or fragment.');
  url.pathname = url.pathname === '/' ? '' : url.pathname.replace(/\/+$/u, '');
  return url.toString().replace(/\/$/u, '');
}

function validateAuth(
  operations: readonly OperationDefinition[],
  auth: Readonly<Record<string, AuthProvider>>,
  defaultAuth: string | false
): void {
  for (const [profile, provider] of Object.entries(auth)) {
    if (profile.trim() !== profile || profile.length === 0) {
      fail('auth', 'Auth profile names must be non-empty without surrounding whitespace.');
    }
    if (
      provider === null ||
      typeof provider !== 'object' ||
      typeof provider.create !== 'function'
    ) {
      fail(`auth.${profile}`, `Auth profile "${profile}" must implement create().`);
    }
  }
  const references = [
    ...(defaultAuth === false ? [] : [defaultAuth]),
    ...operations.flatMap(operation =>
      operation.auth === undefined || operation.auth === false ? [] : [operation.auth]
    )
  ];
  for (const profile of references) {
    if (!(profile in auth)) fail('auth', `Unknown auth profile "${profile}".`);
  }
}

export function defineConfig<const Config extends FlowtractConfig>(
  config: Config
): Readonly<Config> {
  normalizeConfig(config);
  const redaction =
    config.redaction === undefined
      ? undefined
      : Object.freeze({
          ...config.redaction,
          ...(config.redaction.headers === undefined
            ? {}
            : { headers: Object.freeze([...config.redaction.headers]) }),
          ...(config.redaction.jsonPaths === undefined
            ? {}
            : { jsonPaths: Object.freeze([...config.redaction.jsonPaths]) })
        });
  return Object.freeze({
    ...config,
    operations: Object.freeze([...config.operations]),
    ...(config.auth === undefined ? {} : { auth: Object.freeze({ ...config.auth }) }),
    ...(redaction === undefined ? {} : { redaction })
  }) as Readonly<Config>;
}

export function normalizeConfig(config: FlowtractConfig): NormalizedConfig {
  if (config === null || typeof config !== 'object')
    fail('config', 'Configuration must be an object.');
  if (!Array.isArray(config.operations) || config.operations.length === 0) {
    fail('operations', 'At least one operation is required.');
  }
  const operations = Object.freeze([...config.operations]);
  const registry = new OperationRegistry(operations);
  const auth = Object.freeze({ ...(config.auth ?? {}) });
  const defaultAuth = config.defaultAuth ?? false;
  validateAuth(operations, auth, defaultAuth);
  const timeoutMs = positiveTimeout(config.timeoutMs, 'timeoutMs', 30_000);
  const allowInsecureTls = config.allowInsecureTls ?? false;
  if (typeof allowInsecureTls !== 'boolean')
    fail('allowInsecureTls', 'allowInsecureTls must be boolean.');
  new Redactor(config.redaction, new SecretTracker());
  return Object.freeze({
    baseURL: normalizeBaseURL(config.baseURL),
    operations,
    registry,
    transport: config.transport ?? playwrightTransport(),
    auth,
    defaultAuth,
    timeoutMs,
    allowInsecureTls,
    redaction: config.redaction
  });
}

export function resolveTimeout(
  invocation: number | undefined,
  operation: number | undefined,
  configured: number
): number {
  return positiveTimeout(invocation ?? operation, 'timeoutMs', configured);
}
