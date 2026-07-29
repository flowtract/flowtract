# Implementation Sequence and Approval

## Approval boundary

This document package is the deliverable for the current action. No Gate 2
runtime implementation is authorized until the repository owner approves the
decisions below.

Approval authorizes only the bounded execution-foundation slice described in
this package.

## Decision summary

| Decision             | Gate 2 choice                                                 |
| -------------------- | ------------------------------------------------------------- |
| Runtime creation     | Synchronous validation through `createFlowtract`              |
| Mutable unit         | One isolated `FlowtractScenario`                              |
| Preferred lifecycle  | `runtime.runScenario(callback)`                               |
| Adapter lifecycle    | `createScenario()` plus idempotent `close()`                  |
| Scenario concurrency | One operation in flight; parallelism across scenarios         |
| Transport            | Public bytes/header-tuples port; Playwright default adapter   |
| Cookie isolation     | One Playwright `APIRequestContext` per scenario               |
| Request body         | JSON only in Gate 2                                           |
| Response bodies      | JSON, UTF-8 text, and empty                                   |
| HTTP errors          | Declared typed results, not transport exceptions              |
| Auth lifecycle       | Lazy create/setup, per-request apply, reverse dispose         |
| Session login        | Same scenario session; forced `auth: false`                   |
| Interpolation        | Before Zod parsing; whole-value type preservation             |
| Secret handling      | Scenario classification, taint, structural/literal redaction  |
| Cleanup              | LIFO; aggregate all; callback failure remains primary         |
| Retry                | None                                                          |
| Timeout              | Invocation → operation → config → 30 seconds                  |
| TLS                  | Verification enabled; project-level explicit insecure opt-out |
| Proof service        | New in-process, ephemeral, authenticated CRUD service         |
| Package scope        | Root `flowtract` export only; no Cucumber/testing export      |

## Implementation slices

Implementation should use one Gate 2 branch and one reviewable pull request,
with small commits in this order.

### Slice 1 — Public types and configuration

- add configuration, runtime, scenario, transport, auth, history, diagnostic,
  and dry-run contracts;
- implement `defineConfig` validation/freezing;
- implement runtime operation/auth registry validation;
- snapshot and review the additive root export surface;
- add TypeScript 5.5/6.0/7.0 consumer type tests.

**Proof gate:** public declarations compile across the accepted compiler matrix
without Playwright types leaking through the port.

### Slice 2 — State, interpolation, and redaction

- implement ordinary/secret state namespaces;
- implement bounded deterministic interpolation and secret taint;
- implement structural, path, header, URL, literal, cause, and preview redaction;
- implement in-memory diagnostic events.

**Proof gate:** all state/interpolation/redaction unit contracts pass and a
generated secret is absent from every captured representation.

### Slice 3 — Scenario and transport lifecycle

- implement runtime scenario creation;
- implement in-flight/closed state guards;
- implement cleanup, auth disposal, transport disposal, and idempotent close;
- implement `runScenario` primary/cleanup failure composition;
- implement the public `hasCleanupError` type guard;
- add a deterministic fake transport for internal unit tests only.

**Proof gate:** every failure phase closes all resources in order and preserves
the primary failure.

### Slice 4 — Request and response engine

- implement option precedence;
- assemble/interpolate/parse/normalize/serialize requests;
- implement timeout/signal integration;
- select, decode, validate, transform, and summarize responses;
- implement sound dry-run overload/result;
- retain the exact/default Gate 1 result union.

**Proof gate:** the fake transport receives exactly the transformed final
request; all response/error cases pass.

### Slice 5 — Authentication

- implement the provider factory/instance lifecycle;
- implement collision-safe request facade;
- implement bearer, API key, basic, and session providers;
- implement auth setup execution with recursion prevention;
- prove reverse provider disposal and error phases.

**Proof gate:** every provider contract passes without hard-coded login fields
or credential sources.

### Slice 6 — Playwright adapter and proof service

- implement the adapter behind `HttpTransport`;
- build the new ephemeral in-process proof service;
- implement timeout, TLS, cookie, response, and disposal integration tests;
- implement the eight-scenario authenticated CRUD proof.

**Proof gate:** parallel isolation, cleanup, disposal, redaction, and process
termination pass with real Playwright HTTP execution.

### Slice 7 — Package and CI closure

- extend packed ESM/CommonJS consumers;
- update package allowlist and export snapshot only for reviewed Gate 2 files;
- run the full cross-platform and compiler matrix;
- update canonical current-status documentation and changelog;
- review the final diff against non-goals.

**Proof gate:** every Gate 1 and Gate 2 required check passes on the final
revision.

## Expected source layout

The implementation may adjust names during code review while preserving the
public contracts:

```text
packages/flowtract/src/
├── auth/
├── config/
├── diagnostics/
├── execution/
├── interpolation/
├── redaction/
├── scenario/
├── transport/
│   └── playwright/
├── errors.ts
├── operation*.ts
└── index.ts

packages/flowtract/test/
├── integration/
├── proof/
├── unit/
└── types/
```

Proof-service code belongs under tests and MUST NOT ship in the npm archive.

## Required verification commands

The implementation plan must use repository scripts as the stable entry points.
At minimum, the final implementation action will run:

```powershell
npm ci --ignore-scripts
npm run format:check
npm run lint
npm run typecheck
npm test
npm run gate1:type-matrix
npm run package:check
npm run repository:check
git diff --check
```

Gate 2 must add one documented root command, recommended as:

```powershell
npm run gate2:qa
```

That command must run the complete local Gate 2 unit, integration, proof,
coverage, and package-consumer sequence and terminate on Windows.

## Pull-request acceptance

The Gate 2 pull request may be marked ready only when:

- every decision in this package is implemented or explicitly deferred by an
  approved spec amendment;
- no non-goal behavior is present;
- all Gate 1 tests and package consumers remain green;
- all Gate 2 unit/integration/proof tests pass;
- the required Windows/Ubuntu and Node.js 22/24 matrix is green;
- TypeScript 5.5/6.0/7.0 consumers are green;
- CodeQL, dependency review, DCO, secret scan, and clean-clone checks pass;
- coverage and quantitative gates are met;
- the packed archive contains no proof-service code or secret;
- review finds no unresolved correctness, security, portability, package, or
  documentation blocker.

Merge policy remains squash merge into protected `main`. This specification
does not authorize commit, push, pull-request creation, or merge; those actions
belong to the later approved implementation turn.

## Completion record

Gate 2 implementation completion will be recorded here after merge:

| Field                 | Value       |
| --------------------- | ----------- |
| Implementation status | Not started |
| Accepted revision     | —           |
| Acceptance PR         | —           |
| Approval/merge date   | —           |
| Cross-platform proof  | —           |
| Coverage              | —           |

## Specification approval

To approve this Gate 2 specification, the repository owner must confirm:

- the public contracts and precedence rules;
- one-operation-per-scenario concurrency;
- lazy authentication and forced unauthenticated login setup;
- JSON-only Gate 2 request bodies;
- cleanup error-composition behavior;
- redaction and insecure-TLS policies;
- the new proof-service design and quantitative gates;
- all explicit non-goals.

Approval is recorded below before implementation starts:

| Field             | Value   |
| ----------------- | ------- |
| Decision          | Pending |
| Approved by       | —       |
| Approval date     | —       |
| Approved revision | —       |

## Next action after approval

Prepare a decision-preserving implementation plan against the approved
revision, then implement Slices 1–7 without expanding scope. If implementation
reveals a public-contract ambiguity or required deviation, stop, amend this
specification, and obtain approval before continuing.
