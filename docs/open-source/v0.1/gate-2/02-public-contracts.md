# Public Contracts

## Export surface

Gate 2 adds the following reviewed root exports to `flowtract`:

- `defineConfig`;
- `createFlowtract`;
- `playwrightTransport`;
- `bearerToken`;
- `apiKey`;
- `basicAuth`;
- `sessionAuth`;
- `hasCleanupError`;
- runtime, scenario, transport, auth, state, diagnostic, and configuration
  types defined by this document.

Gate 1 exports remain public. Gate 2 does not create `flowtract/cucumber` or
`flowtract/testing`; those exports remain reserved for later gates.

## Configuration

The programmatic Gate 2 configuration is:

```ts
interface FlowtractConfig {
  readonly baseURL: string;
  readonly operations: readonly OperationDefinition[];
  readonly transport?: HttpTransport;
  readonly auth?: Readonly<Record<string, AuthProvider>>;
  readonly defaultAuth?: string | false;
  readonly timeoutMs?: number;
  readonly allowInsecureTls?: boolean;
  readonly redaction?: RedactionConfig;
}

declare function defineConfig<const Config extends FlowtractConfig>(
  config: Config
): Readonly<Config>;

declare function createFlowtract(config: FlowtractConfig): FlowtractRuntime;
```

`defineConfig` validates a configuration without loading files or reading
environment variables. It copies and freezes Flowtract-owned configuration
containers while retaining operation, transport, provider, schema, and callback
references. It does not deep-freeze arbitrary user objects. `createFlowtract`
accepts either its output or a structurally compatible object and performs the
same validation.

Validation includes:

- `baseURL` is an absolute `http:` or `https:` URL without credentials, query,
  or fragment;
- a `baseURL` path is treated as a prefix: `https://host/api/` plus operation
  path `/parts` becomes `https://host/api/parts`;
- at least one operation is present;
- operation IDs are unique;
- auth profile names are non-empty and unique object keys;
- every operation/default auth reference exists;
- `timeoutMs` is a positive integer;
- `allowInsecureTls` defaults to `false`;
- built-in redaction protections cannot be removed.

Gate 2 does not load `flowtract.config.ts`; Gate 3 owns config discovery.

## Runtime and scenario

```ts
interface ScenarioMetadata {
  readonly id?: string;
  readonly name?: string;
  readonly tags?: readonly string[];
}

interface FlowtractRuntime {
  runScenario<Result>(
    callback: (scenario: FlowtractScenario) => Promise<Result>,
    metadata?: ScenarioMetadata
  ): Promise<Result>;

  createScenario(metadata?: ScenarioMetadata): Promise<FlowtractScenario>;
}

interface FlowtractScenario extends FlowtractClient {
  readonly id: string;
  readonly metadata: Readonly<ScenarioMetadata>;
  readonly closed: boolean;

  set(name: string, value: unknown): void;
  setSecret(name: string, value: unknown): void;
  get(name: string): unknown;
  require(name: string): unknown;
  has(name: string): boolean;

  registerCleanup(label: string, action: (client: FlowtractClient) => void | Promise<void>): void;
  history(): readonly OperationSummary[];
  diagnostics(): readonly DiagnosticEvent[];
  close(): Promise<void>;
}
```

`runScenario` is the preferred lifecycle API. It creates a scenario, runs the
callback, and closes the scenario in a `finally` path. When the callback and
cleanup both fail, the callback failure remains the thrown primary error and
receives a non-enumerable `cleanupError` property containing
`FLOWTRACT_CLEANUP`.

`createScenario` exists for runner adapters. Callers using it MUST call
`close()`. A scenario created but never closed is a caller defect; Gate 2 tests
must prove the built-in lifecycle never leaks such a resource.

Cleanup attached to a primary error is inspectable without unsafe property
access:

```ts
type ErrorWithCleanup = Error & {
  readonly cleanupError: CleanupError;
};

declare function hasCleanupError(error: unknown): error is ErrorWithCleanup;
```

Scenario IDs are generated when omitted and are diagnostic identifiers, not
security credentials.

## Execution

The accepted Gate 1 `FlowtractClient.execute` shape remains:

```ts
interface FlowtractExecutionOptions {
  readonly auth?: string | false;
  readonly timeoutMs?: number;
  readonly headers?: Readonly<Record<string, unknown>>;
  readonly signal?: AbortSignal;
  readonly unsafe?: {
    readonly skipRequestValidation?: boolean;
  };
}

interface DryRunResult<Operation extends OperationDefinition> {
  readonly operationId: Operation['id'];
  readonly dryRun: true;
  readonly method: Operation['method'];
  readonly url: string;
  readonly headerNames: readonly string[];
  readonly bodyPresent: boolean;
  readonly timeoutMs: number;
  readonly auth: string | false;
  readonly warnings: readonly string[];
}

interface FlowtractClient {
  execute<const Operation extends OperationDefinition>(
    operation: Operation,
    ...args: ExecuteArguments<Operation, FlowtractExecutionOptions & { dryRun?: false }>
  ): Promise<OperationResult<Operation>>;

  execute<const Operation extends OperationDefinition>(
    operation: Operation,
    ...args: ExecuteArguments<Operation, FlowtractExecutionOptions & { dryRun: true }>
  ): Promise<DryRunResult<Operation>>;
}
```

Gate 2 refines the previously reserved `dryRun?: boolean` option into sound
overloads. Normal execution retains the accepted Gate 1 result union. An
explicit literal `dryRun: true` returns `DryRunResult`; it never pretends that
an HTTP response exists.

Only operations registered in the runtime configuration may execute. Passing a
different operation object with a matching ID is rejected with
`FLOWTRACT_CONFIG`; this prevents configuration and execution metadata from
diverging.

`dryRun` executes configuration resolution, auth setup/application,
interpolation, request parsing, serialization, and redacted diagnostics. Its
URL is redacted, header values are reduced to sorted names, and warnings include
explicit insecure-TLS and networked-auth-setup notices when applicable. It does
not call `HttpTransportSession.execute` for the target operation, add a normal
response-history entry, or run operation-derived cleanup.

`unsafe.skipRequestValidation` skips Zod parsing for invocation request
sections only. It remains explicit per invocation. It does not skip shape
normalization, safe serialization, interpolation, authentication, response
parsing, response validation, or redaction.

## Transport port

Header tuples preserve ordering and repeated fields at the port boundary:

```ts
type TransportHeader = readonly [name: string, value: string];

interface TransportSessionOptions {
  readonly baseURL: string;
  readonly allowInsecureTls: boolean;
}

interface TransportRequest {
  readonly operationId: string;
  readonly method: HttpMethod;
  readonly url: string;
  readonly headers: readonly TransportHeader[];
  readonly body?: Uint8Array;
  readonly timeoutMs: number;
  readonly signal?: AbortSignal;
}

interface TransportResponse {
  readonly status: number;
  readonly headers: readonly TransportHeader[];
  readonly body: Uint8Array;
  readonly url: string;
  readonly durationMs: number;
}

interface HttpTransport {
  createSession(options: TransportSessionOptions): Promise<HttpTransportSession>;
}

interface HttpTransportSession {
  execute(request: TransportRequest): Promise<TransportResponse>;
  dispose(): Promise<void>;
}
```

Transport headers and response byte arrays are copied or treated as immutable
at the Flowtract boundary. A transport must return a status from `100` through
`599`, a finite non-negative duration, and a valid final `http:` or `https:`
URL. Invalid transport output raises `FLOWTRACT_TRANSPORT`.

`playwrightTransport()` returns an `HttpTransport`. It accepts no timeout or TLS
setting; those are resolved by Flowtract configuration and passed through the
session/request contracts. This prevents competing sources of precedence.

## Authentication port

```ts
interface AuthProvider {
  create(context: AuthCreateContext): AuthProviderInstance | Promise<AuthProviderInstance>;
}

interface AuthProviderInstance {
  setup?(context: AuthSetupContext): void | Promise<void>;
  apply(context: AuthApplyContext): void | Promise<void>;
  dispose?(): void | Promise<void>;
}

interface AuthCreateContext {
  readonly profile: string;
  readonly scenarioId: string;
}

interface AuthSetupContext {
  readonly state: AuthStateAccess;
  execute<const Operation extends OperationDefinition>(
    operation: Operation,
    input: OperationInput<Operation>
  ): Promise<OperationResult<Operation>>;
}

interface AuthApplyContext {
  readonly operationId: string;
  readonly state: AuthStateAccess;
  readonly request: MutableAuthRequest;
}

interface AuthStateAccess {
  set(name: string, value: unknown): void;
  setSecret(name: string, value: unknown): void;
  get(name: string): unknown;
  require(name: string): unknown;
  has(name: string): boolean;
}

interface MutableAuthRequest {
  setHeader(name: string, value: string): void;
  setQuery(name: string, value: string | readonly string[]): void;
}
```

The auth request facade permits only header and query authentication material.
It cannot change method, URL path, body, timeout, operation ID, or response
contracts.

Setup-context execution always uses `auth: false`, the same scenario transport
session, the normal request/response contract pipeline, and a diagnostic phase
of `auth`. Its argument optionality follows `FlowtractClient.execute`. It cannot
recursively initialize another auth profile.

Provider definitions are immutable factories. `create`, `setup`, `apply`, and
`dispose` failures are wrapped as `FLOWTRACT_AUTH` with the profile and phase.

## Built-in auth factories

### Bearer token

```ts
type MaybePromise<Value> = Value | Promise<Value>;

bearerToken({
  token: string | ((context: AuthStateAccess) => string | Promise<string>)
});
```

The resolved token must be non-empty and is registered as secret. The provider
sets `Authorization: Bearer <token>`.

### API key

```ts
apiKey({
  value: string | ((context: AuthStateAccess) => string | Promise<string>),
  in: 'header' | 'query',
  name: string
});
```

The value must be non-empty and is registered as secret. Header names must be
valid HTTP field names. Query names must be non-empty.

### Basic auth

```ts
basicAuth({
  username: string | ((context: AuthStateAccess) => string | Promise<string>),
  password: string | ((context: AuthStateAccess) => string | Promise<string>)
});
```

Username and password are encoded as UTF-8 before Base64. Both source values
and the resulting authorization value are registered as secrets.

### Session auth

```ts
declare function sessionAuth<const Login extends OperationDefinition>(options: {
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
}): AuthProvider;
```

The login operation executes once during setup using `auth: false`. Cookies
remain in the scenario transport session. `afterLogin` performs project-owned
typed extraction through public state methods. When `csrf` is configured,
`apply` requires the named secret/ordinary state value and adds it to the
configured header.

Flowtract assumes no login URL, credential source, response status, response
field name, cookie name, or CSRF field name.

## State contract

State names:

- are non-empty after trimming;
- cannot contain `{{` or `}}`;
- are unique across ordinary and secret namespaces;
- cannot be overwritten with the opposite secrecy classification.

`set` and `setSecret` replace an existing value in the same namespace.
`require` throws `FLOWTRACT_INTERPOLATION` with reason `missing` when absent.
`get` returns `undefined` for absence. `has` distinguishes absence from an
explicit `undefined` value.

State values are scenario-local and are not deep-cloned. Callers SHOULD store
immutable values. Flowtract recursively reads only arrays and plain objects
during interpolation.

## History and diagnostics

```ts
interface OperationSummary {
  readonly operationId: string;
  readonly phase: 'auth' | 'operation' | 'cleanup';
  readonly startedAt: string;
  readonly durationMs: number;
  readonly status: number;
  readonly contractStatus: number | 'default';
  readonly outcome: 'matched';
}

interface DiagnosticEvent {
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
```

History contains successful contract-matched HTTP exchanges only, including
auth setup exchanges with `phase: "auth"` and cleanup-client exchanges with
`phase: "cleanup"`. Diagnostics contain no raw request or response body by
default and are already redacted when exposed.
