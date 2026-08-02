import { randomUUID } from 'node:crypto';
import {
  AuthError,
  CleanupError,
  ConfigError,
  FlowtractError,
  TransportError,
  type CleanupFailure
} from './errors.js';
import { applyAuth, authFailure } from './auth.js';
import { resolveTimeout, type NormalizedConfig } from './config.js';
import { interpolateWithTaint } from './internal/interpolate.js';
import { parseOperationResponse, prepareOperationInput, RequestBuilder } from './internal/http.js';
import { Redactor } from './internal/redaction.js';
import { ScenarioState, SecretTracker } from './internal/state.js';
import {
  defineSafeData,
  safeArrayValues,
  safeDataProperty,
  safeErrorMessage,
  safeIsError,
  safeOwnEntries,
  safeOwnData
} from './internal/safe-inspection.js';
import type {
  DryRunResult,
  DryRunExecuteArguments,
  ExecuteArguments,
  FlowtractClient,
  FlowtractExecutionOptions,
  OperationDefinition,
  OperationInput,
  OperationResult
} from './operation-types.js';
import type {
  AuthProviderInstance,
  DiagnosticEvent,
  FlowtractScenario,
  HttpTransportSession,
  OperationSummary,
  ScenarioMetadata
} from './runtime-types.js';

type ExecutionPhase = 'auth' | 'operation' | 'cleanup';
type ExecutionOptions = FlowtractExecutionOptions & { readonly dryRun?: boolean };
type CleanupAction = {
  readonly label: string;
  readonly action: (client: FlowtractClient) => void | Promise<void>;
};
const REQUEST_SECTIONS = new Set(['headers', 'query', 'pathParams', 'body']);

function signalIsAborted(signal: AbortSignal | undefined): boolean {
  return signal?.aborted === true;
}

function configError(message: string, operationId?: string): ConfigError {
  return new ConfigError(message, {
    ...(operationId === undefined ? {} : { operationId }),
    details: { path: 'scenario', issues: [message] }
  });
}

function normalizedMetadata(metadata: ScenarioMetadata | undefined): Readonly<ScenarioMetadata> {
  if (metadata !== undefined && !safeOwnEntries(metadata).ok) {
    throw configError('Scenario metadata is invalid.');
  }
  const rawId = safeOwnData(metadata, 'id');
  const rawName = safeOwnData(metadata, 'name');
  const rawTags = safeOwnData(metadata, 'tags');
  if (rawId !== undefined && typeof rawId !== 'string')
    throw configError('Scenario id is invalid.');
  if (rawName !== undefined && typeof rawName !== 'string') {
    throw configError('Scenario name is invalid.');
  }
  const tags = rawTags === undefined ? undefined : safeArrayValues(rawTags);
  if (rawTags !== undefined && (tags === undefined || tags.some(tag => typeof tag !== 'string'))) {
    throw configError('Scenario tags are invalid.');
  }
  const id = (rawId as string | undefined)?.trim() || randomUUID();
  if (id.includes('{{') || id.includes('}}')) throw configError('Scenario id is invalid.');
  const output: Record<string, unknown> = {};
  defineSafeData(output, 'id', id);
  if (rawName !== undefined) defineSafeData(output, 'name', rawName);
  if (tags !== undefined) defineSafeData(output, 'tags', Object.freeze([...tags]));
  return Object.freeze(output) as Readonly<ScenarioMetadata>;
}

function normalizePrimary(error: unknown): Error {
  return safeIsError(error)
    ? error
    : new Error('Scenario callback threw a non-Error value.', { cause: error });
}

export class Scenario implements FlowtractScenario {
  readonly metadata: Readonly<ScenarioMetadata>;
  readonly id: string;
  readonly #secrets = new SecretTracker();
  readonly #state = new ScenarioState(this.#secrets);
  readonly #redactor: Redactor;
  readonly #history: OperationSummary[] = [];
  readonly #diagnostics: DiagnosticEvent[] = [];
  readonly #cleanups: CleanupAction[] = [];
  readonly #authPromises = new Map<string, Promise<AuthProviderInstance>>();
  readonly #authInstances: Array<{
    readonly profile: string;
    readonly instance: AuthProviderInstance;
  }> = [];
  #status: 'active' | 'closing' | 'closed' = 'active';
  #current: Promise<unknown> | undefined;
  #closePromise: Promise<void> | undefined;

  constructor(
    readonly config: NormalizedConfig,
    readonly transport: HttpTransportSession,
    metadata?: ScenarioMetadata
  ) {
    this.metadata = normalizedMetadata(metadata);
    this.id = this.metadata.id ?? randomUUID();
    this.#redactor = new Redactor(config.redaction, this.#secrets);
    if (config.allowInsecureTls) {
      this.#emit('scenario', 'warn', undefined, { allowInsecureTls: true });
    }
  }

  get closed(): boolean {
    return this.#status === 'closed';
  }

  set(name: string, value: unknown): void {
    this.#assertActive();
    this.#state.set(name, value);
  }

  setSecret(name: string, value: unknown): void {
    this.#assertActive();
    this.#state.setSecret(name, value);
  }

  get(name: string): unknown {
    return this.#state.get(name);
  }

  require(name: string): unknown {
    return this.#state.require(name);
  }

  has(name: string): boolean {
    return this.#state.has(name);
  }

  registerCleanup(label: string, action: (client: FlowtractClient) => void | Promise<void>): void {
    this.#assertActive();
    if (label.trim().length === 0) throw configError('Cleanup label must not be empty.');
    this.#cleanups.push({ label: label.trim(), action });
  }

  history(): readonly OperationSummary[] {
    return Object.freeze([...this.#history]);
  }

  diagnostics(): readonly DiagnosticEvent[] {
    return Object.freeze([...this.#diagnostics]);
  }

  execute<const Operation extends OperationDefinition>(
    operation: Operation,
    ...arguments_: DryRunExecuteArguments<Operation>
  ): Promise<DryRunResult<Operation>>;
  execute<const Operation extends OperationDefinition>(
    operation: Operation,
    ...arguments_: ExecuteArguments<
      Operation,
      FlowtractExecutionOptions & { readonly dryRun?: false }
    >
  ): Promise<OperationResult<Operation>>;
  execute<Operation extends OperationDefinition>(
    operation: Operation,
    input?: OperationInput<Operation>,
    options: ExecutionOptions = {}
  ): Promise<OperationResult<Operation> | DryRunResult<Operation>> {
    if (this.#status !== 'active') {
      return Promise.reject(configError('Scenario is closing or closed.', operation.id));
    }
    if (this.#current !== undefined) {
      return Promise.reject(
        configError('A scenario may execute only one operation at a time.', operation.id)
      );
    }
    const execution = this.#executeInternal(operation, input, options, 'operation');
    this.#current = execution;
    void execution
      .finally(() => {
        if (this.#current === execution) this.#current = undefined;
      })
      .catch(() => undefined);
    return execution;
  }

  async #executeInternal<Operation extends OperationDefinition>(
    operation: Operation,
    input: OperationInput<Operation> | undefined,
    options: ExecutionOptions,
    phase: ExecutionPhase
  ): Promise<OperationResult<Operation> | DryRunResult<Operation>> {
    if (this.config.registry.get(operation.id) !== operation) {
      throw configError('Only the exact registered operation object may execute.', operation.id);
    }
    const startedAt = new Date().toISOString();
    const auth = options.auth ?? operation.auth ?? this.config.defaultAuth;
    const timeoutMs = resolveTimeout(options.timeoutMs, operation.timeoutMs, this.config.timeoutMs);
    let failurePhase: DiagnosticEvent['phase'] = 'request';
    try {
      if (options.signal?.aborted === true) {
        failurePhase = 'transport';
        throw new TransportError('HTTP transport execution was aborted.', {
          operationId: operation.id,
          details: { kind: 'abort' },
          ...(options.signal.reason === undefined ? {} : { cause: options.signal.reason })
        });
      }
      failurePhase = 'auth';
      const authInstance = auth === false ? undefined : await this.#authInstance(auth);
      failurePhase = 'interpolation';
      const interpolatedInput = interpolateWithTaint(input, this.#state);
      const interpolatedHeaders =
        options.headers === undefined
          ? undefined
          : interpolateWithTaint(options.headers, this.#state);
      const taintedSections = new Set<string>();
      for (const path of interpolatedInput.taintedPaths) {
        const section = path[0];
        if (typeof section === 'string' && REQUEST_SECTIONS.has(section)) {
          taintedSections.add(section);
        }
      }
      if ((interpolatedHeaders?.taintedPaths.length ?? 0) > 0) {
        taintedSections.add('headers');
      }
      const effectiveOptions: ExecutionOptions = {
        ...options,
        ...(interpolatedHeaders === undefined
          ? {}
          : { headers: interpolatedHeaders.value as Readonly<Record<string, unknown>> })
      };
      failurePhase = 'request';
      const parsed = prepareOperationInput(
        operation,
        input,
        effectiveOptions,
        interpolatedInput.value,
        this.#redactor,
        taintedSections,
        this.#secrets
      );
      const request = new RequestBuilder(
        operation,
        parsed as Readonly<Record<string, unknown>>,
        this.config.baseURL,
        timeoutMs,
        options.signal,
        this.#secrets
      );
      if (auth !== false && authInstance !== undefined) {
        failurePhase = 'auth';
        await applyAuth(auth, authInstance, {
          operationId: operation.id,
          state: this.#state,
          request
        });
      }
      this.#emit('request', 'info', operation.id, {
        method: operation.method,
        url: this.#redactor.url(request.url()),
        auth
      });
      if (options.dryRun === true) {
        return Object.freeze({
          operationId: operation.id,
          dryRun: true,
          method: operation.method,
          url: this.#redactor.url(request.url()),
          headerNames: request.headerNames(),
          bodyPresent: request.body !== undefined,
          timeoutMs,
          auth,
          warnings: Object.freeze([
            ...(this.config.allowInsecureTls ? ['TLS verification is disabled.'] : []),
            ...(auth !== false && operation.id !== 'auth.login'
              ? ['Authentication setup may have performed network I/O.']
              : [])
          ])
        }) as DryRunResult<Operation>;
      }
      failurePhase = 'transport';
      let response;
      try {
        response = await this.transport.execute(request.transportRequest());
      } catch (error) {
        try {
          if (error instanceof TransportError) throw error;
        } catch (classificationError) {
          if (classificationError === error) throw error;
        }
        throw new TransportError('HTTP transport execution failed.', {
          operationId: operation.id,
          details: { kind: signalIsAborted(options.signal) ? 'abort' : 'unknown' },
          cause: error
        });
      }
      failurePhase = 'response';
      const result = parseOperationResponse(operation, response, this.#redactor);
      this.#history.push(
        Object.freeze({
          operationId: operation.id,
          phase,
          startedAt,
          durationMs: result.durationMs,
          status: result.status,
          contractStatus: result.contractStatus,
          outcome: 'matched'
        })
      );
      this.#emit('response', 'info', operation.id, {
        status: result.status,
        contractStatus: result.contractStatus,
        durationMs: result.durationMs
      });
      return result;
    } catch (error) {
      const code = error instanceof FlowtractError ? error.code : undefined;
      this.#emit(
        phase === 'auth' ? 'auth' : phase === 'cleanup' ? 'cleanup' : failurePhase,
        'error',
        operation.id,
        {
          ...(code === undefined ? {} : { code }),
          message: this.#redactor.text(safeErrorMessage(error))
        },
        code
      );
      throw error;
    }
  }

  async #authInstance(profile: string): Promise<AuthProviderInstance> {
    const existing = this.#authPromises.get(profile);
    if (existing !== undefined) return existing;
    const provider = this.config.auth[profile];
    if (provider === undefined) {
      throw new AuthError(`Unknown authentication profile "${profile}".`, {
        details: { profile, phase: 'create' }
      });
    }
    const promise = (async () => {
      let instance: AuthProviderInstance;
      try {
        const create = safeDataProperty(provider, 'create');
        if (typeof create !== 'function') throw new TypeError('Auth provider create() is invalid.');
        const created = await Reflect.apply(create, provider, [{ profile, scenarioId: this.id }]);
        const apply = safeDataProperty(created, 'apply');
        const setup = safeDataProperty(created, 'setup');
        const dispose = safeDataProperty(created, 'dispose');
        if (
          typeof apply !== 'function' ||
          (setup !== undefined && typeof setup !== 'function') ||
          (dispose !== undefined && typeof dispose !== 'function')
        ) {
          throw new TypeError('Authentication provider create() returned an invalid instance.');
        }
        instance = {
          apply: context => Reflect.apply(apply, created, [context]),
          ...(setup === undefined
            ? {}
            : { setup: context => Reflect.apply(setup, created, [context]) }),
          ...(dispose === undefined ? {} : { dispose: () => Reflect.apply(dispose, created, []) })
        };
      } catch (error) {
        throw authFailure(profile, 'create', error);
      }
      this.#authInstances.push({ profile, instance });
      if (instance.setup !== undefined) {
        try {
          const execute = (async (
            operation: OperationDefinition,
            input?: OperationInput<OperationDefinition>
          ) =>
            this.#executeInternal(
              operation,
              input,
              { auth: false, dryRun: false },
              'auth'
            )) as Parameters<NonNullable<AuthProviderInstance['setup']>>[0]['execute'];
          await instance.setup({ state: this.#state, execute });
        } catch (error) {
          throw authFailure(profile, 'setup', error);
        }
      }
      return instance;
    })();
    this.#authPromises.set(profile, promise);
    return promise;
  }

  #emit(
    phase: DiagnosticEvent['phase'],
    level: DiagnosticEvent['level'],
    operationId?: string,
    data?: Readonly<Record<string, unknown>>,
    code?: DiagnosticEvent['code']
  ): void {
    this.#diagnostics.push(
      Object.freeze({
        schemaVersion: 1,
        timestamp: new Date().toISOString(),
        scenarioId: this.id,
        ...(operationId === undefined ? {} : { operationId }),
        phase,
        level,
        ...(code === undefined ? {} : { code }),
        ...(data === undefined
          ? {}
          : { data: this.#redactor.value(data) as Readonly<Record<string, unknown>> })
      })
    );
  }

  #assertActive(operationId?: string): void {
    if (this.#status !== 'active') throw configError('Scenario is closing or closed.', operationId);
  }

  close(): Promise<void> {
    if (this.#closePromise !== undefined) return this.#closePromise;
    this.#status = 'closing';
    this.#closePromise = this.#performClose();
    return this.#closePromise;
  }

  async #performClose(): Promise<void> {
    const failures: CleanupFailure[] = [];
    await this.#current?.catch(() => undefined);
    for (const cleanup of [...this.#cleanups].reverse()) {
      let active = true;
      let current: Promise<unknown> | undefined;
      const executions: Promise<unknown>[] = [];
      const client: FlowtractClient = {
        execute: ((
          operation: OperationDefinition,
          input?: OperationInput<OperationDefinition>,
          options?: ExecutionOptions
        ) => {
          if (!active)
            return Promise.reject(configError('Cleanup client is no longer active.', operation.id));
          if (current !== undefined) {
            return Promise.reject(
              configError('Cleanup client allows one operation at a time.', operation.id)
            );
          }
          const execution = this.#executeInternal(operation, input, options ?? {}, 'cleanup');
          current = execution;
          executions.push(execution);
          void execution.then(
            () => {
              if (current === execution) current = undefined;
            },
            () => {
              if (current === execution) current = undefined;
            }
          );
          return execution;
        }) as FlowtractClient['execute']
      };
      let actionFailed = false;
      let actionError: unknown;
      try {
        await cleanup.action(client);
      } catch (error) {
        actionFailed = true;
        actionError = error;
      } finally {
        active = false;
      }
      const executionResults = await Promise.allSettled(executions);
      const cleanupErrors = [
        ...(actionFailed ? [actionError] : []),
        ...executionResults.flatMap(result =>
          result.status === 'rejected' && result.reason !== actionError ? [result.reason] : []
        )
      ];
      for (const error of cleanupErrors) {
        failures.push({
          label: cleanup.label,
          message: this.#redactor.text(safeErrorMessage(error, 'Unknown cleanup failure'))
        });
      }
    }
    for (const { profile, instance } of [...this.#authInstances].reverse()) {
      if (instance.dispose === undefined) continue;
      try {
        await instance.dispose();
      } catch (error) {
        const wrapped = authFailure(profile, 'dispose', error);
        failures.push({ label: `auth:${profile}`, message: this.#redactor.text(wrapped.message) });
      }
    }
    try {
      await this.transport.dispose();
    } catch (error) {
      failures.push({
        label: 'transport',
        message: this.#redactor.text(safeErrorMessage(error, 'Transport disposal failed'))
      });
    }
    this.#emit('dispose', failures.length === 0 ? 'info' : 'error', undefined, {
      failures: failures.length
    });
    this.#status = 'closed';
    this.#state.clear();
    if (failures.length > 0) {
      throw new CleanupError('Scenario cleanup failed.', {
        details: { failures: Object.freeze(failures) }
      });
    }
  }
}

export async function runScenario<Result>(
  scenario: Scenario,
  callback: (scenario: FlowtractScenario) => Promise<Result>
): Promise<Result> {
  let primary: Error | undefined;
  let result!: Result;
  try {
    result = await callback(scenario);
  } catch (error) {
    primary = normalizePrimary(error);
  }

  let cleanup: CleanupError | undefined;
  try {
    await scenario.close();
  } catch (cleanupError) {
    cleanup =
      cleanupError instanceof CleanupError
        ? cleanupError
        : new CleanupError('Scenario cleanup failed.', {
            details: {
              failures: [
                {
                  label: 'close',
                  message: safeErrorMessage(cleanupError, 'Unknown cleanup failure')
                }
              ]
            },
            cause: cleanupError
          });
  }

  if (primary !== undefined) {
    if (cleanup === undefined) throw primary;
    let extensible: boolean;
    try {
      extensible = Object.isExtensible(primary);
    } catch {
      extensible = false;
    }
    if (extensible) {
      Object.defineProperty(primary, 'cleanupError', {
        configurable: false,
        enumerable: false,
        writable: false,
        value: cleanup
      });
      throw primary;
    }
    const wrapped = new Error(safeErrorMessage(primary, 'Scenario failed.'), { cause: primary });
    Object.defineProperty(wrapped, 'cleanupError', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: cleanup
    });
    throw wrapped;
  }

  if (cleanup !== undefined) throw cleanup;
  return result;
}
