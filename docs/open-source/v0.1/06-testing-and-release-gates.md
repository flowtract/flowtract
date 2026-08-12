# Testing and Release Gates

## Test layers

### Contracts and unit behavior

Tests cover operation definition, typed request/response transforms,
exact/default status selection, interpolation, normalization, auth, dry run,
errors, diagnostics, history, cleanup, configuration, redaction, and every
public code/phase boundary.

### Transport integration

The in-process HTTP/HTTPS service proves isolated cookies, bearer/API-key/basic
and session/CSRF auth, TLS, redirect bounds, timeout/abort distinction,
declared errors, malformed responses, parallel execution, cleanup I/O, and
deterministic disposal. Tests use generated credentials and temporary or
in-memory state.

### Gate 3 resilience

Gate 3 adds fixed-seed hostile inputs, every-phase fault injection,
deterministic lifecycle race schedules, high-count sequential/concurrent
stress, resource accounting, a performance comparison, and a 15-minute soak.
Exact quantities and failure policy are normative in the
[Gate 3 proof specification](gate-3/05-proof-implementation-and-approval.md).

### Package consumers and documentation

CI packs `flowtract` and installs the tarball into clean ESM, CommonJS, and
TypeScript consumers. Minimum/latest peer combinations, compiler versions,
source/declaration maps, archive contents, root exports, and executable
documentation examples are verified without source imports.

## Coverage and quality floors

Core runtime requires at least:

- 90% statements;
- 90% lines;
- 90% functions;
- 85% branches.

Coverage is a floor, not a substitute for named scenario evidence. Additional
gates require zero lint/type errors, a reviewed export snapshot, successful
strict package linting, no tracked mutation, no leaked resource, no generated
secret occurrence, no unapproved critical/high finding, and only approved
archive files.

Normal runtime/coverage proof and package proof each complete in less than 60
seconds under their documented exclusions. Soak execution is separate.

## Required matrix

The accepted Gate 3 profile included:

- Ubuntu latest, Node 22 and 24;
- Windows latest, Node 22 and 24;
- macOS latest, Node 24;
- TypeScript 5.5.4, 6.0.2, and 7.0.2;
- minimum and latest supported Zod 4 and Playwright;
- CodeQL, Dependency Review, DCO, secret scan, production audit, SBOM,
  clean-clone, package, and repository-integrity evidence.

## Gate sequence

### Gate 0 — canonical foundation

Product, public API, security, governance, and clean-repository boundaries were
approved.

### Gate 1/1.5 — typed contracts and public repository

Typed operation/result contracts, dual package output, installed consumers,
compiler proof, and clean public extraction were accepted.

### Gate 2 — execution foundation

Accepted through PR #9 at `cc30efe`: transport, isolated scenarios, auth,
interpolation, cleanup, redaction, diagnostics, and authenticated CRUD proof.

### Gate 3 — core production-candidate hardening

Accepted through PR #11 at `9e6c991`: the root core passed the approved
compatibility, hostile-input, fault, lifecycle, stress, soak, security,
packaging, and DX profiles. The accepted evidence includes 134 tests, the
84-file archive, the TypeScript and peer matrices, and exact-SHA Windows and
Ubuntu soak proof. No adapter, CLI, command target, publication, or
production-ready claim was included.

### Gate 4A — developer preview publication

Accepted on 2026-08-11: the controlled bootstrap prerelease, trusted OIDC
publication of `flowtract@0.1.0`, registry-backed consumers, provenance,
immutable release evidence, and deployed documentation passed. The completion
record preserves the exact source, integrity, workflow, and recovery evidence.

### Gate 4B — external market validation

Recruit real TypeScript QA/backend repositories, measure first success and
repeated workflow use, and resolve market-validation blockers against the
published developer preview. Gate 4B guides later capability gates but does not
retroactively gate the accepted developer-preview publication.

### Later evidence-gated capabilities

Cucumber, project CLI, generator, configuration loading, command execution,
additional protocols, and richer reporting require separate approved gates.

### Production-ready evidence track

Production readiness requires sustained production evidence: at least three
teams for at least 90 days, exercised support/compatibility policy, and no open
major correctness or security blocker. This track runs in parallel and gates
only a production-ready claim; it does not freeze feature development.

## Failure policy

Acceptance stops for secret disclosure, incorrect contract behavior,
cross-scenario leakage, cleanup/resource leakage, unsupported public import,
package-consumer failure, platform divergence, critical/high unapproved
vulnerability, or documentation that claims unimplemented behavior.

Only a confirmed infrastructure failure may receive one unchanged rerun.
Thresholds, schedules, concurrency, scans, redaction assertions, and platform
lanes must not be weakened to make a candidate pass.
