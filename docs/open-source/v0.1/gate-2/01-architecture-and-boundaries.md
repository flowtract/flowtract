# Architecture and Boundaries

## Baseline

Gate 1 and Gate 1.5 already prove:

- immutable typed operations built with public Zod 4 APIs;
- typed request inputs and parsed outputs;
- exact/default response result unions;
- stable Flowtract errors;
- runtime-scoped duplicate-operation detection;
- dual ESM/CommonJS archives and clean consumers;
- Windows and Ubuntu support on Node.js 22 and 24.

Gate 2 extends that foundation. It does not redesign `defineOperation`,
`OperationInput`, `OperationResult`, `emptyBody`, or the accepted error codes.

## Component model

```text
Imported FlowtractConfig
          │
          ▼
  createFlowtract
          │
          ▼
   FlowtractRuntime ─────────── HttpTransport
          │                         │
          │ creates                 │ creates
          ▼                         ▼
 FlowtractScenario ─────── HttpTransportSession
          │                         │
          ├─ ordinary state         ├─ isolated cookie jar
          ├─ secret state           ├─ execute raw HTTP
          ├─ auth instances         └─ dispose exactly once
          ├─ response history
          ├─ cleanup stack
          └─ diagnostic events
```

The runtime is reusable and contains validated immutable configuration. It
does not own cookies, scenario values, provider state, response history, or
cleanup actions.

The scenario is the unit of mutable execution. No operation may execute without
a scenario.

## Ownership

### Flowtract runtime

The runtime owns:

- a frozen validated configuration snapshot;
- the operation registry;
- auth-provider definitions;
- the transport factory;
- redaction policy definitions;
- library defaults.

Runtime creation MUST NOT create a Playwright `APIRequestContext` or perform a
network request.

### Flowtract scenario

Each scenario owns:

- exactly one transport session;
- one isolated cookie jar through that transport session;
- ordinary and secret state namespaces;
- lazily initialized auth-provider instances;
- ordered execution summaries;
- a LIFO cleanup stack;
- redacted diagnostic events;
- close state and disposal state.

A scenario MUST NOT expose its cookie jar, raw provider state, raw secrets, or
Playwright objects.

### Transport

The transport owns protocol I/O only. It:

- receives a fully assembled request;
- executes it;
- returns raw response bytes and headers;
- reports transport-level failures;
- disposes its own resources.

It MUST NOT:

- parse Zod contracts;
- select response contracts;
- interpolate scenario values;
- choose or apply auth profiles;
- throw merely because an HTTP status is `4xx` or `5xx`;
- retry automatically.

### Authentication provider

An auth provider owns authentication behavior for one named profile. Provider
definitions are reusable; initialized provider state is scenario-local.

Providers may:

- perform scenario-local setup;
- register ordinary or secret state;
- add authentication material to a request;
- dispose scenario-local auth resources.

Providers MUST NOT mutate operation definitions, runtime configuration, another
scenario, or the transport implementation.

## Dependency direction

Dependencies flow inward:

```text
Playwright adapter ──► HttpTransport port
Built-in auth ───────► AuthProvider port
Execution engine ────► operations, state, redaction, transport, auth
Public API ──────────► execution engine
```

Core execution code MUST NOT import Playwright types. Only the adapter and its
adapter tests may import Playwright.

## Concurrency model

- A runtime is safe for concurrent scenario creation and execution.
- A scenario may have only one operation in flight at a time.
- Concurrent calls to the same scenario fail with `FLOWTRACT_CONFIG`; they are
  not queued implicitly.
- Different scenarios may execute concurrently.
- Provider setup for a profile is single-flight within its scenario.
- Closing a scenario prevents new execution immediately.
- Repeated close calls share the first close promise and do not rerun cleanup or
  disposal.

Serial execution inside a scenario makes state, auth transitions, response
history, and cleanup registration deterministic. Parallelism belongs at the
scenario level.

## Trust boundaries

Flowtract treats these as untrusted:

- operation invocation input;
- state values used through interpolation;
- auth callback results;
- HTTP response status, headers, content type, and bytes;
- transport-thrown values;
- cleanup-thrown values.

Every untrusted value is validated, normalized, or safely wrapped before it
enters public results or diagnostics.

Project configuration and operation definitions are trusted code but still
receive structural validation. Flowtract does not sandbox user callbacks.

## Data-flow boundary

The execution engine sends only the request produced by the ordered pipeline in
[03-execution-and-lifecycle.md](03-execution-and-lifecycle.md). Parsed Zod
output, interpolation results, option precedence, and authentication
application are therefore observable behavior and require contract tests.

## Gate 2 request and response scope

Gate 2 supports:

- absolute runtime `baseURL` plus operation-relative paths;
- JSON request bodies;
- scalar/repeated query values;
- scalar headers;
- JSON, UTF-8 text, and empty responses.

Multipart, form encoding, arbitrary binary request/response bodies, streaming,
proxy configuration, and custom redirect policy are outside Gate 2.

## Filesystem and process boundary

The Gate 2 runtime writes no files and starts no child processes. Tests may use
temporary directories only for clean package consumers. The proof HTTP service
runs in the test process, binds to `127.0.0.1` on an ephemeral port, and stores
all application state in memory.
