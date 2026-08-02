# Changelog

All notable changes to Flowtract will be documented here.

The project follows Semantic Versioning after `0.1.0`. Before `1.0.0`,
documented breaking changes may occur in minor releases and must include
migration guidance.

## [Unreleased]

### Added

- Canonical Flowtract open-source `0.1.0` specification.
- Apache-2.0 license and project notice.
- Governance, contribution, security, support, and conduct policies.
- Gate 0 approval and the Gate 1 package/typed-contract implementation boundary.
- Sound `contractStatus` discrimination for operations with default responses.
- Private npm workspace foundations for `flowtract` and `create-flowtract`.
- Zod 4 `defineOperation`, parsed request contracts, scoped operation registry,
  explicit empty-body helper, and stable error taxonomy.
- Dual ESM/CommonJS package builds with declarations, source maps, strict archive
  linting, and clean consumer proofs.
- Gate 1 unit, type, coverage, TypeScript-version, and cross-platform CI
  contracts.
- Clean Gate 1.5 extraction into `flowtract/flowtract` without prototype
  history, runtime code, mutable fixtures, or legacy dependencies.
- Approved decision-complete Gate 2 execution-foundation specification covering
  public runtime/transport/auth contracts, scenario lifecycle, interpolation,
  cleanup, redaction, proof service, verification matrix, and approval gate.
- Immutable reusable runtimes, isolated scenario state, deterministic cleanup,
  dry-run execution, operation history, and redacted in-memory diagnostics.
- A public transport port with a default Playwright implementation and strict
  JSON, UTF-8 text, empty-body, timeout, abort, TLS, and network handling.
- Bearer, header/query API key, basic, and project-defined session/CSRF
  authentication with lazy scenario-local provider lifecycles.
- An ephemeral HTTP/HTTPS proof service covering parallel authenticated CRUD,
  scenario isolation, cleanup I/O, TLS policy, timeout/abort, and disposal.
- Gate 2 package consumers, compiler-matrix declarations, coverage thresholds,
  repository checks, and the `gate2:qa` compatibility gate.
- Draft Gate 3 core production-candidate specification covering lifecycle
  races, fault injection, hostile inputs, stress, soak, compatibility,
  security, packaging, and root-runtime developer experience.
- Non-authorizing future design records for deferred Cucumber/CLI work and a
  bounded command-target feasibility candidate.
- Gate 3 hostile-value inspection and bounded public errors that avoid getters,
  proxies, `toJSON`, arbitrary coercion, prototype mutation, and unbounded causes.
- Fixed-seed property proof with 10,000 cases, exhaustive fault injection,
  400 deterministic lifecycle-race schedules, 1,000 sequential cycles, 64
  concurrent custom scenarios, and 16 concurrent Playwright CRUD scenarios.
- Built-package benchmark and fixed 15-minute soak profiles with resource,
  disposal, secret, result, and forced-GC heap evidence.
- Executable packed documentation, an error catalog, documentation for every
  root export, minimum/latest peer consumers, CycloneDX SBOM proof, and a
  non-publishing 84-file publication rehearsal.
- Gate 3 QA, macOS/Node 24 CI, supply-chain/peer compatibility CI, and an exact-SHA
  manual Windows/Ubuntu acceptance workflow.

### Fixed

- Prevent secret-tainted request validation messages, transformed secret
  values, and bearer/basic source credentials from reaching error previews.
- Wait for cleanup-client I/O before auth and transport disposal even when a
  cleanup callback fails without awaiting its operation.
- Reject pre-aborted operations before custom transport execution and align the
  public auth-setup client with its forced unauthenticated runtime behavior.
- Snapshot redaction configuration, validate custom transport headers and auth
  instances, and classify redirect overflow separately from request timeout.
- Extend Gate 2 proof for lifecycle races, response disposal, redirects,
  connection failures, repeated headers, declared error statuses, and bounds.
- Remove the unused Cucumber package coupling and remediate all full-development
  audit findings by moving to ESLint 10.8.0 and esbuild 0.28.1.

### Current limitations

- Gate 2 is accepted at `cc30efe`; Gate 3 core hardening is implemented on a
  review candidate but remains pending cross-platform, soak, security, and
  repository-owner semantic acceptance.
- Cucumber, CLI, generator, configuration discovery, command execution, and
  artifact behavior are deferred future designs and are not part of the `0.1`
  root-package compatibility promise.
- The legacy prototype is retained privately as historical behavioral evidence.
- No npm package or production-ready release exists.
