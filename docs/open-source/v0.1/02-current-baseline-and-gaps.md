# Current Baseline and Gaps

## Current

The clean Flowtract repository currently provides:

- an explicit `defineOperation` contract using Zod 4 public APIs;
- typed request input and parsed output;
- exact and default response-contract result unions;
- stable public error codes and JSON shapes;
- scoped duplicate-operation detection;
- immutable reusable runtimes and isolated, closeable scenarios;
- request interpolation, schema parsing, normalization, and typed dry runs;
- Playwright-backed HTTP execution through a public transport port;
- bearer, API-key, basic, and session/CSRF authentication;
- scenario-local secrets, redacted diagnostics, history, and LIFO cleanup;
- dual ESM/CommonJS builds with declarations and source maps;
- clean packed-package proofs for JavaScript and TypeScript consumers.

The accepted Gate 3 root core executes authenticated HTTP/HTTPS workflows and
adds hostile-input containment, deterministic lifecycle-race proof, resource
accounting, stress, benchmark, soak, peer-version, documentation, and
supply-chain evidence. PR #11 passed semantic review and the protected Windows,
Ubuntu, macOS, compiler, clean-clone, dependency, DCO, and CodeQL checks. Its
accepted baseline is 134 tests, 90.84% statement coverage, 94.00% line coverage,
96.09% function coverage, 85.53% branch coverage, an 84-file archive, and
TypeScript 5.5.4/6.0.2/7.0.2 consumers. The exact-SHA acceptance also proved
15-minute Windows and Ubuntu soak profiles with zero unexpected failures,
generated-secret occurrences, or live resources.

The previous prototype is retained in a private archived repository as
historical behavioral evidence; it is not part of the public source tree or
package dependency graph.

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
clean `flowtract/flowtract` repository. Gate 2 added the execution foundation
without expanding into Cucumber, CLI, configuration-file loading, retry, or
reporting. npm publication and trusted publishing remain future external
actions.

Gate 3 core production-candidate proof was accepted at `9e6c991`. Gate 4 is the
next gate: separately approved developer-preview publication with provenance,
documentation deployment, and external evaluation. The package remains private
and unpublished. Cucumber, CLI, configuration loading, generators, retry,
reporting, and command execution are deferred and require separate approved
specifications.

The remaining production-readiness gap is external and operational evidence:
released-artifact use across at least two minor releases, at least three teams
operating Flowtract in production for at least 90 days, exercised support,
compatibility, deprecation, and security-response policies, and no open major
correctness or security blocker.

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
