# Gate 2 — Execution Foundation

> **Status:** Implemented locally; acceptance pending CI and review
>
> **Gate:** 2 of the Flowtract `0.1.0` developer preview
>
> **Implementation authorization:** Granted 2026-07-29
>
> **Canonical parent:** [Flowtract Open-Source v0.1](../README.md)

## Objective

Gate 2 turns the accepted typed-contract kernel into a secure execution runtime.
It must prove:

> Flowtract can execute authenticated, stateful, schema-verified REST workflows
> safely, deterministically, and in parallel.

The implementation began after the approval record in
[06-implementation-and-approval.md](06-implementation-and-approval.md) was
completed.

## Required outcome

Gate 2 is complete only when:

- a reusable Flowtract runtime creates isolated scenarios;
- each scenario owns its transport session, cookies, state, secrets, auth
  lifecycle, history, diagnostics, and cleanup stack;
- the default Playwright transport sends the final parsed and transformed
  request;
- bearer, API key, basic, and session/CSRF authentication work without
  hard-coded response field names;
- exact and default response contracts select and validate correctly;
- HTTP `4xx` and `5xx` responses remain ordinary contract results;
- interpolation preserves whole-reference types and rejects missing or cyclic
  references;
- cleanup runs in LIFO order after success and failure;
- credentials and secret-derived values remain redacted at every diagnostic
  boundary;
- parallel authenticated CRUD scenarios do not share cookies or mutable state;
- tests do not modify tracked files, leak secrets, or leave a process or
  Playwright resource alive;
- Gate 1 package, type, export, and consumer contracts remain green.

## Specification map

1. [Architecture and boundaries](01-architecture-and-boundaries.md)
2. [Public contracts](02-public-contracts.md)
3. [Execution and lifecycle semantics](03-execution-and-lifecycle.md)
4. [Authentication, secrets, and diagnostics](04-authentication-secrets-and-diagnostics.md)
5. [Proof service and verification matrix](05-proof-service-and-verification.md)
6. [Implementation sequence and approval](06-implementation-and-approval.md)

These documents refine the Gate 2 portions of the parent v0.1 specification.
If a conflict exists, this package governs Gate 2 after approval. Gate 1 public
contracts remain unchanged unless this package explicitly identifies an
additive Gate 2 surface.

## In scope

- `defineConfig` and `createFlowtract`;
- `FlowtractRuntime`, `FlowtractClient`, and `FlowtractScenario`;
- `HttpTransport` and the Playwright transport;
- request assembly and response decoding;
- scenario-local state, secret state, history, and diagnostics;
- deterministic interpolation;
- authentication-provider lifecycle and four built-in providers;
- cleanup and resource disposal;
- redaction and secure configuration precedence;
- one temporary in-process authenticated CRUD proof service;
- unit, integration, package-consumer, and cross-platform proof.

## Non-goals

Gate 2 MUST NOT add:

- Cucumber support or generic steps;
- the CLI, config-file discovery/loading, or environment-file loading;
- the `create-flowtract` generator;
- cURL or OpenAPI import;
- retries, polling, or eventual-consistency helpers;
- GraphQL, SOAP, gRPC, WebSockets, SSE, multipart, binary streaming, UI,
  database, load-test, or hosted-service capabilities;
- user-facing report files or the final artifact schema;
- npm publication, a prerelease, or a production-readiness claim;
- compatibility adapters for the archived prototype.

Gate 2 accepts an already-imported typed configuration object. Configuration
file discovery/loading remains deferred beyond the root-core Gate 3.

## Locked implementation posture

- Use public Zod 4 APIs only.
- Preserve dual ESM/CommonJS packaging and TypeScript 5.5/6.0/7.0 consumer
  compatibility.
- Use a public transport port; keep Playwright-specific objects out of public
  execution results.
- Create a new proof server from the Gate 2 contract. Do not copy archived
  prototype runtime or fixture code.
- Prefer immutable values and scenario-owned mutation.
- Do not weaken validation, coverage, package allowlists, branch checks, or
  redaction to make proof pass.
- Treat the package as a developer preview, not an enterprise-ready platform.
