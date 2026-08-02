# Testing and Release Gates

## Test layers

### Unit

Unit tests cover:

- operation definition and duplicate registration;
- request input/output transformations;
- exact/default status selection and result narrowing;
- JSON, text, empty, and malformed responses;
- path encoding and path/schema mismatch;
- interpolation type preservation, nesting, missing values, secrets, and cycles;
- configuration precedence;
- redaction at every output boundary;
- auth provider lifecycle;
- cleanup ordering and aggregated failure behavior;
- every public error code and CLI exit code.

### Transport integration

A local in-memory/temporary-state server proves:

- isolated cookies across scenarios;
- session login and CSRF injection;
- bearer, API key, and basic providers;
- timeout and cancellation;
- secure and explicitly insecure TLS configuration;
- redirects and declared HTTP error statuses;
- malformed JSON diagnostics;
- parallel execution and deterministic disposal.

Tests MUST NOT write tracked fixtures.

### Cucumber end-to-end

End-to-end suites prove:

- World and hook lifecycle;
- generic steps and domain wrapper steps;
- DocString, DataTable, and file payloads;
- status and field assertions;
- variable capture and interpolation;
- negative request testing;
- tags, parallelism, fail-fast, and scenario retry;
- redacted attachments and artifacts;
- cleanup after step and hook failures;
- complete process termination on Windows and Linux.

### CLI

CLI tests cover every command, option, JSON envelope, exit code, invalid config,
unsupported runtime, signal, child-process failure, and safe file-write
behavior.

### Package consumer

CI packs both npm packages and installs tarballs into clean temporary consumers:

- ESM JavaScript;
- CommonJS JavaScript;
- TypeScript programmatic;
- TypeScript Cucumber.

Each fixture compiles and executes at least one operation. No fixture imports a
source path or undeclared deep export.

### Documentation

Every code sample is compiled or executed. Quick-start commands run from a
clean temporary directory. Links and the VitePress production build are
validated.

## Coverage and quality gates

Core runtime requires:

- 90% statements;
- 90% lines;
- 90% functions;
- 85% branches.

Coverage is a release floor, not a substitute for scenario coverage.

Additional gates:

- type-check and lint have zero errors;
- public-package build has zero unresolved warnings;
- export surface is snapshotted and reviewed;
- full mock suite completes in less than 60 seconds;
- no tracked file changes after tests;
- no orphaned child process;
- no unapproved critical/high dependency finding;
- package archives contain only approved files.

## CI matrix

Release-blocking:

- Ubuntu latest, Node 22 and 24;
- Windows latest, Node 22 and 24.

Non-blocking until promoted:

- macOS latest on Node 24;
- current Node release.

Pull requests run formatting check, lint, type tests, unit, integration, E2E,
CLI, package-consumer, documentation, license, secret scanning, and dependency
review as applicable.

## Release sequence

### Gate 0 — specification

- canonical specification approved;
- license/governance foundation present;
- name and repository identity confirmed;
- no unresolved public-interface decision.

### Gate 1 — typed contracts

**Implementation status:** accepted and proven on Windows and Ubuntu with
Node.js 22 and 24. Gate 1.5 activated the clean public repository and repeated
the package, compiler, CodeQL, and Scorecard proof.

- workspaces and exports established;
- `defineOperation` and result unions complete;
- example contracts ported;
- clean consumer type proof passes without private Zod APIs.

### Gate 2 — execution foundation

**Implementation status:** accepted through PR #9 at merge revision `cc30efe`.

- canonical Gate 2 specification approved;
- transport port and Playwright adapter complete;
- scenario, auth, interpolation, cleanup, redaction, and secure config complete;
- authenticated CRUD proof passes in parallel without tracked changes.

### Gate 3 — Cucumber and CLI

- adapter, CLI, generator, diagnostics, and process lifecycle complete;
- new user scaffolds and runs a project on Windows and Linux in under ten
  minutes.

### Gate 4 — beta

- docs, examples, package proofs, and security automation complete;
- `0.1.0-beta.1` tested by five design partners;
- at least four complete onboarding and author one workflow without maintainer
  intervention.

### Release candidate

- beta blockers closed;
- public API frozen for `0.1`;
- security and dependency review complete;
- `0.1.0-rc.1` passes all clean-clone gates.

### Developer preview

- `flowtract@0.1.0` and `create-flowtract@0.1.0` publish with provenance;
- documentation and examples deploy;
- changelog, migration guide, limitations, and release notes are public.

## Release failure policy

A release stops for:

- secret disclosure;
- incorrect contract acceptance/rejection;
- scenario state leakage;
- cleanup or child-process leakage;
- package-consumer failure;
- unsupported deep import required by examples;
- critical/high vulnerability without approved exception;
- documentation that claims unimplemented behavior.

Near-zero defects are not inferred from passing unit tests. Each gate requires
its named executable proof.
