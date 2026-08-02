import type { FlowtractErrorCode } from './errors.js';
import type {
  FlowtractClient,
  HttpMethod,
  OperationDefinition,
  OperationInput,
  OperationResult
} from './operation-types.js';

export type MaybePromise<Value> = Value | Promise<Value>;

/** A normalized HTTP header tuple; names and values must not contain invalid control characters. */
export type TransportHeader = readonly [name: string, value: string];

/** Immutable options supplied once when a scenario-owned transport session is created. */
export interface TransportSessionOptions {
  readonly baseURL: string;
  readonly allowInsecureTls: boolean;
}

/** A fully normalized request supplied to an HTTP transport session. */
export interface TransportRequest {
  readonly operationId: string;
  readonly method: HttpMethod;
  readonly url: string;
  readonly headers: readonly TransportHeader[];
  readonly body?: Uint8Array;
  readonly timeoutMs: number;
  readonly signal?: AbortSignal;
}

/** Raw response bytes and metadata returned by an HTTP transport session. */
export interface TransportResponse {
  readonly status: number;
  readonly headers: readonly TransportHeader[];
  readonly body: Uint8Array;
  readonly url: string;
  readonly durationMs: number;
}

/** Factory for one isolated, scenario-owned HTTP transport session. */
export interface HttpTransport {
  createSession(options: TransportSessionOptions): Promise<HttpTransportSession>;
}

/** A scenario-owned transport session that must dispose all of its resources exactly once. */
export interface HttpTransportSession {
  execute(request: TransportRequest): Promise<TransportResponse>;
  dispose(): Promise<void>;
}

/** State access available to authentication providers; secret values must use `setSecret`. */
export interface AuthStateAccess {
  set(name: string, value: unknown): void;
  setSecret(name: string, value: unknown): void;
  get(name: string): unknown;
  require(name: string): unknown;
  has(name: string): boolean;
}

/** Immutable identity supplied while lazily creating an authentication profile instance. */
export interface AuthCreateContext {
  readonly profile: string;
  readonly scenarioId: string;
}

type AuthSetupExecuteArguments<Operation extends OperationDefinition> =
  Record<string, never> extends OperationInput<Operation>
    ? readonly [input?: OperationInput<Operation>]
    : readonly [input: OperationInput<Operation>];

/** Close-scoped setup context whose operation execution always disables authentication recursion. */
export interface AuthSetupContext {
  readonly state: AuthStateAccess;
  execute<const Operation extends OperationDefinition>(
    operation: Operation,
    ...arguments_: AuthSetupExecuteArguments<Operation>
  ): Promise<OperationResult<Operation>>;
}

/** Collision-enforcing request mutations available to authentication providers. */
export interface MutableAuthRequest {
  setHeader(name: string, value: string): void;
  setQuery(name: string, value: string | readonly string[]): void;
}

/** Operation, state, and request context supplied while applying authentication. */
export interface AuthApplyContext {
  readonly operationId: string;
  readonly state: AuthStateAccess;
  readonly request: MutableAuthRequest;
}

/** Scenario-local authentication lifecycle hooks; setup is single-flight and disposal is best-effort. */
export interface AuthProviderInstance {
  setup?(context: AuthSetupContext): MaybePromise<void>;
  apply(context: AuthApplyContext): MaybePromise<void>;
  dispose?(): MaybePromise<void>;
}

/** Factory for one lazily initialized authentication instance per profile and scenario. */
export interface AuthProvider {
  create(context: AuthCreateContext): MaybePromise<AuthProviderInstance>;
}

/** Structural and literal redaction settings copied into an immutable runtime snapshot. */
export interface RedactionConfig {
  readonly headers?: readonly string[];
  readonly jsonPaths?: readonly string[];
  readonly previewCharacters?: number;
}

/** Immutable root runtime configuration; mutable execution state remains scenario-local. */
export interface FlowtractConfig {
  readonly baseURL: string;
  readonly operations: readonly OperationDefinition[];
  readonly transport?: HttpTransport;
  readonly auth?: Readonly<Record<string, AuthProvider>>;
  readonly defaultAuth?: string | false;
  readonly timeoutMs?: number;
  readonly allowInsecureTls?: boolean;
  readonly redaction?: RedactionConfig;
}

/** Optional immutable identity and tags attached to a scenario. */
export interface ScenarioMetadata {
  readonly id?: string;
  readonly name?: string;
  readonly tags?: readonly string[];
}

/** Immutable record of a successfully matched auth, operation, or cleanup exchange. */
export interface OperationSummary {
  readonly operationId: string;
  readonly phase: 'auth' | 'operation' | 'cleanup';
  readonly startedAt: string;
  readonly durationMs: number;
  readonly status: number;
  readonly contractStatus: number | 'default';
  readonly outcome: 'matched';
}

/** Immutable, already-redacted in-memory diagnostic event using schema version 1. */
export interface DiagnosticEvent {
  readonly schemaVersion: 1;
  readonly timestamp: string;
  readonly scenarioId: string;
  readonly operationId?: string;
  readonly phase:
    | 'scenario'
    | 'auth'
    | 'interpolation'
    | 'request'
    | 'transport'
    | 'response'
    | 'cleanup'
    | 'dispose';
  readonly level: 'debug' | 'info' | 'warn' | 'error';
  readonly code?: FlowtractErrorCode;
  readonly data?: Readonly<Record<string, unknown>>;
}

/** Isolated state, execution, diagnostics, history, and deterministic cleanup for one workflow. */
export interface FlowtractScenario extends FlowtractClient {
  readonly id: string;
  readonly metadata: Readonly<ScenarioMetadata>;
  readonly closed: boolean;
  set(name: string, value: unknown): void;
  setSecret(name: string, value: unknown): void;
  get(name: string): unknown;
  require(name: string): unknown;
  has(name: string): boolean;
  registerCleanup(label: string, action: (client: FlowtractClient) => MaybePromise<void>): void;
  history(): readonly OperationSummary[];
  diagnostics(): readonly DiagnosticEvent[];
  close(): Promise<void>;
}

/** Reusable immutable runtime that creates isolated scenarios or closes them around callbacks. */
export interface FlowtractRuntime {
  runScenario<Result>(
    callback: (scenario: FlowtractScenario) => Promise<Result>,
    metadata?: ScenarioMetadata
  ): Promise<Result>;
  createScenario(metadata?: ScenarioMetadata): Promise<FlowtractScenario>;
}

/** Configuration for cookie-preserving login and project-owned post-login/CSRF extraction. */
export interface SessionAuthOptions<Login extends OperationDefinition> {
  readonly login: Login;
  readonly input:
    OperationInput<Login> | ((state: AuthStateAccess) => MaybePromise<OperationInput<Login>>);
  readonly afterLogin?: (
    result: OperationResult<Login>,
    state: AuthStateAccess
  ) => MaybePromise<void>;
  readonly csrf?: {
    readonly state: string;
    readonly header: string;
  };
}
