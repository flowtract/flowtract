# Gate 3 Proof, Implementation Slices, and Approval

## Preconditions

Implementation starts only after:

- this package is decision-complete and approved at a recorded revision;
- the TypeScript configuration-loader proof records the selected package,
  public API, license, ESM/CommonJS behavior, and security boundary;
- public Cucumber contracts compile against the supported peer range without
  private imports;
- the branch starts clean from synchronized `main` at or after `cc30efe`.

The completed proof is recorded in Document 00. It authorizes the dependency
choice only after this package receives owner approval; it is not production
or cross-platform acceptance evidence.

## Implementation slices

### Slice 1 — contracts and package topology

- amend root config types;
- add reviewed `./cucumber`, `./testing`, and binary exports;
- establish internal command-service ports;
- extend export snapshots and declaration consumers.

**Gate:** root Gate 1/2 consumers remain compatible; optional Cucumber absence
does not break root import.

### Slice 2 — configuration and command kernel

- implement deterministic config selection/import and environment parsing;
- implement CLI parser, envelopes, exit mapping, streams, and doctor/list;
- prove no config search escape or secret output.

**Gate:** table-driven command/config/security proof passes on ESM and CommonJS
projects.

### Slice 3 — Cucumber adapter

- implement explicit World/support/step installers;
- bind one scenario per pickle/attempt;
- compose hook, step, cleanup, and attachment failures;
- prove domain and generic steps in parallel.

**Gate:** lifecycle and isolation proof passes with optional peer present and
root import passes with it absent.

### Slice 4 — worker and artifact lifecycle

- implement test worker protocol and signal forwarding;
- aggregate schema-versioned redacted artifacts;
- prove interruption, timeout, malformed worker output, and formatter failure.

**Gate:** no process, pipe, handle, socket, response, transport, temp file, or
secret remains on Windows or Ubuntu.

### Slice 5 — generator and cURL importer

- implement shared transactional generator;
- add programmatic and Cucumber templates;
- implement bounded non-executing cURL parser and redacted source output.

**Gate:** traversal, symlink, collision, force, rollback, credential stripping,
and unsupported syntax cases pass.

### Slice 6 — package and onboarding proof

- execute packed CLI, Cucumber, testing, and generator consumers;
- scaffold into fresh directories and run exact documented commands;
- extend compiler matrix and archive allowlists;
- update documentation and changelog.

**Gate:** Windows/Ubuntu onboarding completes in under ten minutes with no
repository mutation or orphaned process.

### Slice 7 — acceptance

- run local and clean-clone Gate 3 QA;
- run protected Windows/Ubuntu Node 22/24, declarations, DCO, Dependency Review,
  CodeQL, and secret scan;
- perform semantic review of every public, security, lifecycle, filesystem, and
  process boundary.

**Gate:** final SHA has no unresolved blocker; merge remains separately
authorized.

## Required tests

Unit and type proof covers:

- config discovery ambiguity, module forms, factory single-flight, invalid
  exports, environment precedence/denials, and path containment;
- CLI grammar, every exit code, JSON envelope, stdout/stderr separation, color,
  help/version, and error composition;
- World construction, hook order, scenario/attempt isolation, generic step
  parsing, domain wrappers, auth selection, unsafe visibility, cleanup, and
  attachment redaction;
- worker framing, concurrency, retries, fail-fast, signals, forced shutdown,
  crash/malformed output, and artifact transaction rollback;
- generator empty/non-empty/symlink/reparse/traversal/force/rollback behavior;
- cURL credential stripping, escaping, repeated values, malformed input, and
  explicit unsupported forms;
- testing-utility request copies, queues, counters, disposal, and redaction;
- every public declaration on TypeScript 5.5.4, 6.0.2, and 7.0.2.

Integration proof includes:

- packed ESM and CommonJS programmatic projects;
- packed Cucumber projects with the peer installed and root-only projects
  without it;
- eight parallel authenticated scenarios plus retries with unique cookies and
  CSRF values;
- cleanup operations after failed steps and failed attachments;
- interactive and deterministic generator modes without network install;
- a generated programmatic project and generated Cucumber project executing
  against the Gate 2 proof service;
- SIGINT/SIGTERM and Windows process-tree cleanup;
- zero generated-secret occurrence across console, JSON, messages, JUnit, HTML,
  diagnostics, errors, filenames, and source drafts;
- zero tracked mutation and normal parent/worker termination.

## Quantitative gates

- at least 90% statements, lines, and functions and 85% branches per publishable
  package with a combined report;
- CLI/Cucumber runtime proof under 90 seconds per CI lane, excluding install and
  package compilation;
- package proof under 90 seconds;
- generator without install under five seconds;
- worker graceful shutdown within five seconds plus a bounded forced-shutdown
  interval;
- fresh scaffold-to-first-pass under ten minutes on Windows and Ubuntu;
- zero production critical/high audit vulnerability;
- zero new open CodeQL alert;
- packed archives contain only approved files.

## Final commands

The implementation plan may refine script names, but Gate 3 must expose one
canonical `gate3:qa` command and retain `qa` as its compatibility alias. Final
acceptance includes:

```text
npm ci --ignore-scripts
npm run gate3:qa
npm run type-matrix
npm run clean-clone:check
npm audit --omit=dev --audit-level=high
git diff --check
git status --short
```

## Decisions requiring owner approval

Approval confirms:

- Gate 3 includes Cucumber, CLI, generator, config loading, testing utilities,
  artifacts, and process lifecycle as one gate;
- exact root/subpath/binary surfaces;
- config discovery and trusted-code boundary;
- environment precedence and denied process-control variables;
- explicit generic-step installation and retry isolation;
- artifact schema, limits, and transaction behavior;
- child-process and termination model;
- generator force/rollback policy;
- cURL subset and credential stripping;
- quantitative gates and non-goals.

The specification has no deliberately unresolved implementation choice. The
repository owner records approval here before runtime coding:

| Field             | Value            |
| ----------------- | ---------------- |
| Decision          | Pending          |
| Approved by       | Repository owner |
| Approval date     | —                |
| Approved revision | —                |
