import type { FlowtractErrorCode } from './errors.js';
import type {
  FlowtractClient,
  HttpMethod,
  OperationDefinition,
  OperationInput,
  OperationResult
} from './operation-types.js';

export type MaybePromise<Value> = Value | Promise<Value>;

export type TransportHeader = readonly [name: string, value: string];

export interface TransportSessionOptions {
  readonly baseURL: string;
  readonly allowInsecureTls: boolean;
}

export interface TransportRequest {
  readonly operationId: string;
  readonly method: HttpMethod;
  readonly url: string;
  readonly headers: readonly TransportHeader[];
  readonly body?: Uint8Array;
  readonly timeoutMs: number;
  readonly signal?: AbortSignal;
}

export interface TransportResponse {
  readonly status: number;
  readonly headers: readonly TransportHeader[];
  readonly body: Uint8Array;
  readonly url: string;
  readonly durationMs: number;
}

export interface HttpTransport {
  createSession(options: TransportSessionOptions): Promise<HttpTransportSession>;
}

export interface HttpTransportSession {
  execute(request: TransportRequest): Promise<TransportResponse>;
  dispose(): Promise<void>;
}

export interface AuthStateAccess {
  set(name: string, value: unknown): void;
  setSecret(name: string, value: unknown): void;
  get(name: string): unknown;
  require(name: string): unknown;
  has(name: string): boolean;
}

export interface AuthCreateContext {
  readonly profile: string;
  readonly scenarioId: string;
}

type AuthSetupExecuteArguments<Operation extends OperationDefinition> =
  Record<string, never> extends OperationInput<Operation>
    ? readonly [input?: OperationInput<Operation>]
    : readonly [input: OperationInput<Operation>];

export interface AuthSetupContext {
  readonly state: AuthStateAccess;
  execute<const Operation extends OperationDefinition>(
    operation: Operation,
    ...arguments_: AuthSetupExecuteArguments<Operation>
  ): Promise<OperationResult<Operation>>;
}

export interface MutableAuthRequest {
  setHeader(name: string, value: string): void;
  setQuery(name: string, value: string | readonly string[]): void;
}

export interface AuthApplyContext {
  readonly operationId: string;
  readonly state: AuthStateAccess;
  readonly request: MutableAuthRequest;
}

export interface AuthProviderInstance {
  setup?(context: AuthSetupContext): MaybePromise<void>;
  apply(context: AuthApplyContext): MaybePromise<void>;
  dispose?(): MaybePromise<void>;
}

export interface AuthProvider {
  create(context: AuthCreateContext): MaybePromise<AuthProviderInstance>;
}

export interface RedactionConfig {
  readonly headers?: readonly string[];
  readonly jsonPaths?: readonly string[];
  readonly previewCharacters?: number;
}

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

export interface ScenarioMetadata {
  readonly id?: string;
  readonly name?: string;
  readonly tags?: readonly string[];
}

export interface OperationSummary {
  readonly operationId: string;
  readonly phase: 'auth' | 'operation' | 'cleanup';
  readonly startedAt: string;
  readonly durationMs: number;
  readonly status: number;
  readonly contractStatus: number | 'default';
  readonly outcome: 'matched';
}

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

export interface FlowtractRuntime {
  runScenario<Result>(
    callback: (scenario: FlowtractScenario) => Promise<Result>,
    metadata?: ScenarioMetadata
  ): Promise<Result>;
  createScenario(metadata?: ScenarioMetadata): Promise<FlowtractScenario>;
}

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
