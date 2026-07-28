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

### Current limitations

- Gate 1 package and typed-contract work is authorized; transport and runner
  integration remain deferred to later gates.
- The legacy prototype is retained privately as historical behavioral evidence.
- No npm package or production-ready release exists.
