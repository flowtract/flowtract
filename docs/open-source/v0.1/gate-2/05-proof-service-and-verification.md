# Proof Service and Verification Matrix

## Proof strategy

Gate 2 uses a new in-process HTTP service built only for executable proof. It
must not copy code, data, routes, credentials, or lifecycle assumptions from
the archived prototype.

The service:

- uses Node's maintained HTTP APIs;
- binds only to `127.0.0.1`;
- requests an ephemeral operating-system port;
- stores all data in memory;
- starts and stops inside test hooks;
- exposes an explicit `close()` that is awaited;
- reports active sockets so teardown tests can prove none remain;
- uses generated per-test credentials and tokens.

No tracked fixture is read or written.

## Service model

The service maintains:

- users with generated test-only credentials;
- opaque session IDs;
- per-session CSRF tokens;
- per-session part records;
- request counters and an audit view available only to the test harness.

Part state is partitioned by authenticated session. A part created in one
session cannot be read, updated, or deleted by another.

## Required routes

| Route                     | Purpose                                       |
| ------------------------- | --------------------------------------------- |
| `POST /auth/session`      | Set session cookie and return CSRF token      |
| `GET /auth/whoami`        | Prove cookie retention/isolation              |
| `GET /auth/bearer`        | Prove bearer provider                         |
| `GET /auth/api-key`       | Prove header and query API-key providers      |
| `GET /auth/basic`         | Prove basic provider                          |
| `POST /parts`             | Create session-owned part; require CSRF       |
| `GET /parts/{id}`         | Read session-owned part                       |
| `PATCH /parts/{id}`       | Update session-owned part; require CSRF       |
| `DELETE /parts/{id}`      | Delete session-owned part; require CSRF       |
| `GET /responses/text`     | Return UTF-8 text                             |
| `GET /responses/empty`    | Return an empty `204` response                |
| `GET /responses/bad-json` | Return malformed JSON                         |
| `GET /responses/delay`    | Prove timeout and cancellation                |
| `GET /responses/status`   | Return a requested declared/undeclared status |

The service may expose additional test-only routes only when a named acceptance
case requires them.

## Canonical authenticated CRUD proof

The primary proof creates one runtime and runs at least eight scenarios
concurrently.

Each scenario:

1. lazily logs in through `sessionAuth`;
2. receives a distinct cookie and CSRF token;
3. creates a part using an interpolated body value;
4. captures its part ID in ordinary scenario state;
5. registers deletion cleanup immediately after creation;
6. reads the part through a whole-value path reference;
7. updates the part;
8. verifies the updated Zod output and exact status contract;
9. completes and deletes the part through LIFO cleanup;
10. closes its provider and transport session.

The test then proves:

- every scenario received a unique session;
- no scenario can see another scenario's part;
- all parts were deleted;
- all transport contexts were disposed exactly once;
- the server has no active request/socket after teardown;
- no tracked file changed;
- captured diagnostics contain none of the generated credentials, cookies,
  CSRF tokens, authorization values, or part-secret values.

## Unit contract matrix

### Configuration/runtime

- valid config freezing;
- invalid/missing base URL;
- URL credentials/query/fragment rejection;
- duplicate operation IDs;
- unknown operation/default auth profile;
- invalid timeouts and TLS defaults;
- unregistered operation-object rejection;
- runtime reuse across parallel scenarios.

### State/interpolation

- ordinary and secret namespaces;
- overwrite and cross-classification rejection;
- absent versus explicit `undefined`;
- whole-value type preservation;
- embedded string conversion;
- nested arrays/plain objects;
- missing, malformed, cyclic, depth-bound, and node-bound references;
- exotic-object non-traversal;
- secret-taint propagation and redaction.

### Request assembly

- precedence for auth, timeout, and headers;
- case-insensitive header merging;
- parsed/transformed/defaulted Zod output sent;
- safe path encoding exactly once;
- scalar, repeated, null, and omitted query values;
- invalid nested query/header/path values;
- JSON body encoding and serialization failure;
- no body for `undefined`;
- unsafe validation bypass boundaries;
- dry-run overload and no target transport call.

### Response handling

- exact before default selection;
- undeclared status;
- declared `4xx` and `5xx` results;
- JSON and `+json`;
- UTF-8 text;
- empty bytes and `emptyBody`;
- malformed JSON and invalid UTF-8;
- missing, unsupported, and mismatched content type;
- transformed response body/header output;
- normalized repeated headers;
- bounded redacted previews.

### Authentication

- lazy single-flight create/setup;
- apply on every authenticated request;
- auth `false` and all precedence levels;
- bearer static and resolver tokens;
- header/query API key;
- UTF-8 basic auth;
- session cookie and explicit CSRF extraction;
- setup execution forced to `auth: false`;
- collision rejection;
- create/setup/apply/dispose error phases;
- reverse provider disposal.

### Cleanup/disposal

- LIFO cleanup;
- all actions attempted after failure;
- ordered normalized failures;
- callback failure remains primary;
- non-extensible and non-`Error` failures;
- reverse auth disposal before transport disposal;
- idempotent concurrent close;
- execution/registration rejected after close;
- resource disposal after auth, interpolation, request, transport, response, and
  assertion failures.

### Redaction/diagnostics

- every built-in protected header/key;
- custom additive headers/paths;
- inability to remove built-ins;
- literal secret replacement with metacharacters;
- longest-first replacement;
- cycle/getter/toJSON-safe traversal;
- URL/query redaction;
- cause and cleanup redaction;
- no bodies/headers/state in default events;
- insecure-TLS warning;
- JSON serialization of every Flowtract error.

## Transport integration matrix

The Playwright adapter must prove:

- one `APIRequestContext` per scenario;
- cookies retained within and isolated across scenarios;
- `failOnStatusCode: false`;
- default secure TLS and explicit insecure TLS against a local test certificate;
- timeout and caller abort distinction;
- network/TLS failure mapping;
- redirect final URL and the explicit 20-redirect bound;
- raw repeated response headers and bytes;
- every `APIResponse` disposed after its bytes/metadata are copied;
- context disposal exactly once;
- no automatic retry;
- no Playwright type in a public execution result.

## Package and compatibility proof

Gate 2 extends the existing package-consumer fixtures:

- ESM consumer executes one authenticated scenario from the packed archive;
- CommonJS consumer executes one operation through a deterministic custom
  transport;
- TypeScript 5.5, 6.0, and 7.0 compile public runtime, scenario, auth, and
  transport contracts;
- a custom transport implements only the documented public port;
- no consumer imports an internal or source path;
- `flowtract/cucumber` and `flowtract/testing` remain unavailable.

`npm pack` output must remain limited to the approved archive allowlist.

## Cross-platform CI

Release-blocking:

- Ubuntu latest / Node.js 22;
- Ubuntu latest / Node.js 24;
- Windows latest / Node.js 22;
- Windows latest / Node.js 24;
- TypeScript 5.5/6.0/7.0 declaration matrix on Node.js 24.

Every platform lane runs:

1. `npm ci --ignore-scripts`;
2. formatting, lint, type-check, and type tests;
3. Gate 1 unit/package tests;
4. Gate 2 unit and Playwright integration tests;
5. authenticated parallel CRUD proof;
6. coverage;
7. packed ESM/CommonJS consumer execution;
8. repository-integrity and secret scans.

Long-running workflows use explicit test timeouts. Test success is insufficient
until the Node process exits normally.

## Quantitative gates

- at least 90% statements;
- at least 90% lines;
- at least 90% functions;
- at least 85% branches;
- 100% contract tests for stable error codes touched by Gate 2;
- eight concurrent authenticated CRUD scenarios;
- zero tracked-file mutations;
- zero active proof-service sockets after teardown;
- zero undisposed transport sessions;
- zero generated-secret occurrences in captured diagnostic/error output;
- full Gate 2 proof completes in under 60 seconds on each supported CI lane.

The time bound excludes dependency installation and package compilation.

## Failure policy

A failing acceptance case is a Gate 2 defect unless logs prove an external
infrastructure failure. Fixes MUST NOT:

- reduce scenario count;
- serialize the parallel proof;
- weaken cleanup or redaction assertions;
- whitelist leaked generated values;
- lower coverage;
- skip Windows or Ubuntu;
- replace Playwright proof with a fake transport;
- update package goldens without reviewing the public-surface change.
