# Developer Experience and Packaging

## DX objective

A TypeScript or JavaScript user must be able to understand the root runtime,
execute a first scenario, diagnose a failure, and clean up correctly without
reading Flowtract source or depending on an adapter.

Gate 3 improves documentation and diagnostics without creating a second
execution model or a new public package surface.

## Root-package quick start

The packed README provides an executable sequence that:

1. installs `flowtract`, Zod 4, and Playwright;
2. defines one status-specific operation;
3. creates an immutable runtime;
4. runs an isolated scenario;
5. executes and narrows a typed result;
6. registers deterministic cleanup;
7. handles a stable Flowtract error safely.

The example runs from a clean temporary ESM consumer on Windows, Ubuntu, and
macOS. After dependency installation, the documented first scenario must
complete in under five minutes without repository-local paths or undeclared
imports.

Focused executable examples also cover:

- bearer, API-key, basic, and project-defined session authentication;
- ordinary/secret state and interpolation;
- dry run and unsafe request-validation bypass boundaries;
- timeout and caller cancellation;
- cleanup I/O and `hasCleanupError`;
- a deterministic custom transport;
- history, diagnostics, and error-code handling.

Every snippet is compiled or executed in CI. Examples use generated credentials
and do not write tracked state.

## IntelliSense and API documentation

Every root runtime value and public type receives concise documentation for:

- ownership and mutability;
- lifecycle and valid call timing;
- defaults and precedence;
- security-sensitive behavior;
- errors and failure phases;
- one minimal usage example where the contract is not self-evident.

Declaration consumers verify documentation changes do not alter type/runtime
agreement. Documentation must not promise Cucumber, CLI, command, retry,
reporting, or publication behavior.

## Error and troubleshooting catalog

The package README or linked canonical guide maps every stable error code to:

- meaning and applicable phase/kind values;
- likely caller or target causes;
- safe fields available for diagnosis;
- corrective actions;
- redaction and cleanup evidence behavior.

Messages remain human-readable, but automation branches on codes and structured
details rather than prose. Configuration failures identify the invalid field
or reference and the accepted boundary without echoing secret values.

## Installed-consumer proof

The package proof installs only the generated tarball and declared peers into
clean temporary projects. It executes:

- ESM JavaScript with the default Playwright transport;
- CommonJS JavaScript with a deterministic custom transport;
- TypeScript ESM and CommonJS declaration consumers;
- minimum/latest Zod and Playwright peer combinations;
- TypeScript 5.5.4, 6.0.2, and 7.0.2 consumers.

`publint` and Are the Types Wrong run in strict mode. Runtime/declaration source
maps embed reviewed sources. The archive allowlist rejects proof services,
tests, secrets, caches, reports, and future-design documents.

The current 80-file archive is the comparison baseline. A count change is
allowed only when the PR explains the exact reviewed source/declaration-map
difference; an allowlist pass alone is insufficient.

## Package metadata

Gate 3 retains the root export, `sideEffects: false`, Node engine, ESM/CommonJS
conditions, license, notice, and explicit `files`. It removes the unused
optional Cucumber peer and adds no binary or subpath. Peer-missing and
unsupported-version failures must be actionable in clean consumers.

Publication, provenance issuance, documentation-site deployment, and the
`create-flowtract` package remain later actions.
