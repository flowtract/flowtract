# Current Baseline and Gaps

## Current

The clean Flowtract repository currently provides:

- an explicit `defineOperation` contract using Zod 4 public APIs;
- typed request input and parsed output;
- exact and default response-contract result unions;
- stable public error codes and JSON shapes;
- scoped duplicate-operation detection;
- dual ESM/CommonJS builds with declarations and source maps;
- clean packed-package proofs for JavaScript and TypeScript consumers.

The Gate 1 package does not yet execute HTTP requests. The previous prototype
is retained in a private archived repository as historical behavioral evidence.
It is not part of the public source tree or package dependency graph.

## Architectural gaps

The archived prototype operation model:

- stores method, URL, auth, payload, and response metadata inside a Zod object;
- reads private Zod `_def` internals;
- ignores parsed/transformed request output;
- provides one response schema regardless of status;
- skips request validation for all GET requests;
- exposes broad `any` types;
- silently converts invalid JSON to `{}`.

The archived prototype lifecycle:

- assumes fixed `csrfToken` and `sessionId` response fields;
- exposes mutable “next request” query state;
- lacks a cleanup stack;
- disables TLS verification unconditionally;
- declares but does not apply `REQUEST_TIMEOUT`;
- logs headers and bodies without comprehensive redaction;
- includes fallback credentials;
- can mutate tracked fixture data;
- does not terminate the mock runner reliably on Windows.

## Release and community status

Gate 0 added the license, governance policies, security workflows, and
canonical specification. Gate 1 added package-consumer tests and a
Windows/Ubuntu Node 22/24 CI definition. Gate 1.5 moved that foundation into a
clean `flowtract/flowtract` repository. npm publication and trusted publishing
remain future external actions.

## v0.1 Target

The prototype is input evidence, not the public architecture. `0.1.0` MUST:

- separate reusable packages from examples and test applications;
- replace private schema introspection with explicit metadata and public Zod 4
  parsing APIs;
- make scenario state and cleanup deterministic;
- provide secure defaults and stable diagnostic codes;
- prove installed-package use from clean consumer projects;
- run without tracked mutations or orphaned child processes on Windows and
  Linux.

## Migration treatment

Existing example behavior will be ported to the new operation model. Old
classes and schema shapes will not be exported from Flowtract. The migration
guide will map:

- schema object → `defineOperation`;
- `SchemaExecutor` → `FlowtractClient.execute`;
- `TestContext` → `FlowtractScenario`;
- `AuthManager` → named `AuthProvider`;
- single response schema → status-specific response contracts;
- `{variable}` → `{{variable}}`;
- global registry bootstrapping → explicit operation registration.

## Baseline preservation rule

Implementation MUST begin by recording a clean baseline. Existing user changes
must not be overwritten. Tests MUST use temporary or in-memory state rather
than modifying tracked `data/` files.
