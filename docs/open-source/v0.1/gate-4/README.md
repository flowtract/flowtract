# Gate 4 — Developer Preview and Market Validation

> **Status:** Gate 4A accepted; Gate 4B external evaluation next
> **Baseline:** Gate 3 completion merge `d08c13055178d23cc4a381afccfff86907c11c68`
> **Gate 4A target:** Publish and prove `flowtract@0.1.0` as a developer preview
> **Gate 4B target:** Launch external market-gap evaluation after publication
> **Product claim:** Published developer preview; not beta, production candidate, or production ready

Gate 4 is split so release engineering does not wait for adoption evidence and
adoption work does not weaken release safety:

- **Gate 4A** publishes the already-accepted root core with provenance, proves
  the real registry artifact, deploys executable documentation, and establishes
  recovery procedures.
- **Gate 4B** takes that artifact to real TypeScript QA and backend teams,
  measures whether Flowtract solves meaningful authenticated workflow problems,
  and produces evidence for later capability gates.

Production-readiness evidence is a parallel maturity track. It gates only a
production-ready claim; it does not block developer-preview publication,
market validation, or separately approved evidence-driven feature work.

## Documents

1. [Baseline, tracks, and claims](00-baseline-tracks-and-claims.md)
2. [Package identity and trusted publication](01-package-identity-and-publication.md)
3. [Documentation and market proof](02-documentation-and-market-proof.md)
4. [Acceptance, recovery, and evidence](03-acceptance-recovery-and-evidence.md)
5. [Implementation, authorization, and approval](04-implementation-authorization-and-approval.md)

## Gate 4A public boundary

Gate 4A changes release state, not the accepted runtime contract:

- publish only the `flowtract` root package;
- preserve the Gate 3 export snapshot and runtime semantics;
- change the package version from development metadata to `0.1.0`;
- remove `private` only from `packages/flowtract/package.json`;
- keep the workspace root private;
- add no binary, subpath export, runtime dependency, telemetry, adapter, or
  protocol;
- publish no `create-flowtract` package;
- label every public surface and release as a developer preview.

Any required runtime or public-contract change stops Gate 4A and requires a
separate approved specification amendment.

Repository implementation was authorized against amended specification
revision `72fa3dfbffd666d5d8d921fa089b1476ed4ba4d3`. The implementation, separately
authorized publication, release completion, documentation deployment, and
post-release remediation are accepted in the completion record.

## Completion boundary

Gate 4A completes only when:

- the repository changes and release workflow are approved and merged;
- the bootstrap prerelease and final package are published through the
  controlled paths in this specification;
- npm shows provenance for the final release;
- clean consumers install and execute the real registry artifact;
- the documentation site is live and its examples use the released version;
- the completion record identifies the release SHA, tag, npm integrity,
  workflow runs, documentation URL, and recovery state;
- no correctness, security, packaging, documentation, or release-operations
  blocker remains.

Gate 4A does not complete Gate 4B and does not establish beta, production
candidate, production-ready, or enterprise-ready evidence.

All Gate 4A completion conditions passed on the immutable `03b2402` release
source, followed by the accepted `cf1a386` release-tool remediation on
protected `main`. Gate 4B is now the active market-validation gate.

## Explicit non-goals

Gate 4A excludes Cucumber, a project CLI, configuration loading, generators,
command execution, retries, reporters, artifact files, OpenAPI, additional
protocols, hosted execution, telemetry, `create-flowtract` publication, and any
new runtime capability.
