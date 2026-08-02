# Product and Scope

## Mission

Flowtract makes complete API business workflows readable, type-aware, and
diagnosable. It validates contracts while requests are assembled and responses
are received, without reducing a workflow to isolated endpoint checks.

## Primary users

The first audience is:

- TypeScript QA automation engineers and SDETs;
- backend engineers owning integration and acceptance tests;
- teams testing session-oriented enterprise REST APIs;
- teams that need a reliable typed core that runner adapters can use later.

Business stakeholders may read scenarios and reports, but `0.1.0` is not a
no-code product.

## Problem statement

Existing HTTP clients execute requests well, but enterprise workflow tests
often accumulate bespoke code for:

- login, cookies, bearer tokens, API keys, and CSRF;
- dependent identifiers and values passed between requests;
- request and response contract validation;
- per-scenario isolation and reliable resource cleanup;
- status-specific success and error responses;
- redacted failure diagnostics;
- deterministic lifecycle and cleanup across reusable scenarios.

Flowtract provides one coherent lifecycle for those concerns.

## Competitive wedge

Flowtract does not attempt to replace every API client or testing platform. Its
defensible initial wedge is:

> TypeScript-first, schema-verified testing of authenticated, stateful REST
> workflows through a robust runner-neutral core.

The project competes through workflow correctness, developer diagnostics,
secure defaults, and extension boundaries—not by matching every protocol or UI
feature of Postman, Karate, PactumJS, or Playwright.

## v0.1 Target

`0.1.0` is a developer preview with:

- explicit typed operations;
- exact-status response contracts;
- transformed request values sent after Zod parsing;
- Playwright HTTP transport through a public port;
- built-in common authentication providers plus custom providers;
- typed configuration;
- deterministic cross-platform tests and consumer package proofs;
- Apache-2.0 community governance.

The README and release notes MUST call it a developer preview. They MUST NOT
claim general enterprise readiness.

## Non-goals

The following MUST NOT delay `0.1.0`:

- broad protocol support;
- hosted control planes, dashboards, or telemetry;
- performance/load generation;
- UI automation;
- database verification;
- schema-neutral validation adapters;
- OpenAPI import/export;
- Cucumber, CLI, generator, configuration-file loading, and command execution;
- compatibility with unpublished prototype APIs;
- paid or proprietary feature boundaries.

## Compatibility posture

The existing repository has no published npm package. Flowtract therefore uses
a clean pre-1.0 public API and provides a written migration guide rather than a
runtime compatibility adapter.

Before `1.0.0`, breaking changes MAY occur only in a documented minor release
and MUST include migration instructions. Patch releases MUST remain compatible.

## Evidence standard

Claims in public documentation MUST link to one of:

- an exported public API and contract test;
- a runnable example;
- a CI job;
- a release artifact or package-consumer proof.

Roadmap items MUST be labelled as future and MUST NOT be presented as current
capability.
