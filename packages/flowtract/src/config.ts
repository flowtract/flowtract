import { ConfigError } from './errors.js';
import { OperationRegistry } from './internal/operation-registry.js';
import { Redactor } from './internal/redaction.js';
import { SecretTracker } from './internal/state.js';
import { playwrightTransport } from './playwright-transport.js';
import {
  defineSafeData,
  safeArrayValues,
  safeDataProperty,
  safeOwnEntries,
  safeOwnData
} from './internal/safe-inspection.js';
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
      typeof safeDataProperty(provider, 'create') !== 'function'
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
    if (!Object.hasOwn(auth, profile)) fail('auth', `Unknown auth profile "${profile}".`);
  }
}

function snapshotRedaction(config: RedactionConfig | undefined): RedactionConfig | undefined {
  if (config === undefined) return undefined;
  const rawHeaders = safeOwnData(config, 'headers');
  const rawPaths = safeOwnData(config, 'jsonPaths');
  const previewCharacters = safeOwnData(config, 'previewCharacters');
  const headerValues = rawHeaders === undefined ? undefined : safeArrayValues(rawHeaders);
  const pathValues = rawPaths === undefined ? undefined : safeArrayValues(rawPaths);
  if (rawHeaders !== undefined && headerValues === undefined) {
    fail('redaction.headers', 'Redaction headers must be an array.');
  }
  if (rawPaths !== undefined && pathValues === undefined) {
    fail('redaction.jsonPaths', 'Redaction JSON paths must be an array.');
  }
  const headers =
    headerValues === undefined
      ? undefined
      : Object.freeze(
          headerValues.map((header, index) => {
            if (typeof header !== 'string' || header.trim().length === 0) {
              fail(
                `redaction.headers.${index}`,
                'Redaction header names must be non-empty strings.'
              );
            }
            return header;
          })
        );
  const jsonPaths =
    pathValues === undefined
      ? undefined
      : Object.freeze(
          pathValues.map((path, index) => {
            if (typeof path !== 'string') {
              fail(`redaction.jsonPaths.${index}`, 'Redaction JSON paths must be strings.');
            }
            return path;
          })
        );
  return Object.freeze({
    ...(headers === undefined ? {} : { headers }),
    ...(jsonPaths === undefined ? {} : { jsonPaths }),
    ...(previewCharacters === undefined ? {} : { previewCharacters: previewCharacters as number })
  });
}

/** Validates, copies, and freezes Flowtract-owned configuration containers synchronously. */
export function defineConfig<const Config extends FlowtractConfig>(
  config: Config
): Readonly<Config> {
  const normalized = normalizeConfig(config);
  const inspected = safeOwnEntries(config);
  if (!inspected.ok) fail('config', 'Configuration must contain data properties only.');
  const output: Record<string, unknown> = {};
  for (const entry of inspected.entries) {
    if (!entry.enumerable || entry.kind !== 'data') continue;
    defineSafeData(output, entry.key, entry.value);
  }
  defineSafeData(output, 'baseURL', normalized.baseURL);
  defineSafeData(output, 'operations', normalized.operations);
  if (safeOwnData(config, 'auth') !== undefined) defineSafeData(output, 'auth', normalized.auth);
  if (normalized.redaction !== undefined) defineSafeData(output, 'redaction', normalized.redaction);
  return Object.freeze(output) as Readonly<Config>;
}

export function normalizeConfig(config: FlowtractConfig): NormalizedConfig {
  if (config === null || typeof config !== 'object' || !safeOwnEntries(config).ok)
    fail('config', 'Configuration must be an object.');
  const operationValues = safeArrayValues(safeOwnData(config, 'operations'));
  if (operationValues === undefined || operationValues.length === 0) {
    fail('operations', 'At least one operation is required.');
  }
  const operations = Object.freeze([...operationValues]) as readonly OperationDefinition[];
  const registry = new OperationRegistry(operations);
  const rawAuth = safeOwnData(config, 'auth');
  const inspectedAuth = rawAuth === undefined ? undefined : safeOwnEntries(rawAuth);
  if (
    inspectedAuth !== undefined &&
    (!inspectedAuth.ok ||
      (inspectedAuth.prototype !== Object.prototype && inspectedAuth.prototype !== null))
  ) {
    fail('auth', 'Authentication profiles must be a plain object.');
  }
  const authOutput: Record<string, AuthProvider> = {};
  for (const entry of inspectedAuth?.entries ?? []) {
    if (!entry.enumerable) continue;
    if (entry.kind !== 'data') fail(`auth.${entry.key}`, 'Auth profiles must be data properties.');
    defineSafeData(authOutput, entry.key, entry.value);
  }
  const auth = Object.freeze(authOutput);
  const defaultAuth = (safeOwnData(config, 'defaultAuth') ?? false) as string | false;
  validateAuth(operations, auth, defaultAuth);
  const timeoutMs = positiveTimeout(
    safeOwnData(config, 'timeoutMs') as number | undefined,
    'timeoutMs',
    30_000
  );
  const allowInsecureTls = safeOwnData(config, 'allowInsecureTls') ?? false;
  if (typeof allowInsecureTls !== 'boolean')
    fail('allowInsecureTls', 'allowInsecureTls must be boolean.');
  const redaction = snapshotRedaction(
    safeOwnData(config, 'redaction') as RedactionConfig | undefined
  );
  new Redactor(redaction, new SecretTracker());
  return Object.freeze({
    baseURL: normalizeBaseURL(safeOwnData(config, 'baseURL') as string),
    operations,
    registry,
    transport:
      (safeOwnData(config, 'transport') as HttpTransport | undefined) ?? playwrightTransport(),
    auth,
    defaultAuth,
    timeoutMs,
    allowInsecureTls,
    redaction
  });
}

export function resolveTimeout(
  invocation: number | undefined,
  operation: number | undefined,
  configured: number
): number {
  return positiveTimeout(invocation ?? operation, 'timeoutMs', configured);
}
