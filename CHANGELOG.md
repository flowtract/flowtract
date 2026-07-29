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

### Current limitations

- Gate 2 is implemented and locally proof-gated; pull-request review and the
  required Windows/Ubuntu Node 22/24 CI matrix remain acceptance prerequisites.
- The legacy prototype is retained privately as historical behavioral evidence.
- No npm package or production-ready release exists.
