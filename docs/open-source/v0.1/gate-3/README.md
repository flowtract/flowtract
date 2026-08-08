# Gate 3 — Core Production-Candidate Hardening

> **Status:** Accepted through PR #11 at merge revision `9e6c99133a923565eda38548427630b9487807f8`
> **Baseline:** Gate 2 merge `cc30efec286c595d185644096fe8a17c0771591d`
> **Technical target:** Root-only core production-candidate proof
> **Product claim:** Unpublished and not production ready

Gate 3 hardens the accepted runner-neutral REST execution core before adding
runner adapters or project tooling. It defines production profiles,
compatibility promises, lifecycle and fault invariants, security boundaries,
release-quality developer experience, stress proof, and operational evidence.

The term **core production candidate** is a bounded technical verdict. It
means the root runtime has passed the profiles and operational proofs in this
package. It is not a Flowtract production-readiness claim. Production readiness
still requires sustained external operation and an exercised support policy.

This package is normative because repository-owner approval is recorded in
the approval document against the exact substantive revision. The approved
implementation was accepted through [PR #11](https://github.com/flowtract/flowtract/pull/11),
with its durable evidence recorded in the
[completion record](05-proof-implementation-and-approval.md#completion-record).
Acceptance is limited to the root-core Gate 3 verdict and does not authorize a
production-ready claim.

## Documents

1. [Baseline and gap inventory](00-baseline-and-gap-inventory.md)
2. [Production profile and compatibility](01-production-profile-and-compatibility.md)
3. [Reliability, lifecycle, and resources](02-reliability-lifecycle-and-resources.md)
4. [Security and resilience](03-security-and-resilience.md)
5. [Developer experience and packaging](04-developer-experience-and-packaging.md)
6. [Proof, implementation, and approval](05-proof-implementation-and-approval.md)

## Public boundary

Gate 3 preserves the accepted root API and package shape:

- only the `flowtract` root export is supported;
- existing operation, result, error, auth, transport, state, cleanup,
  diagnostic, and dry-run semantics remain compatible;
- all mutable state remains scenario-local;
- no production dependency is added;
- no Cucumber, testing, command, CLI, reporter, configuration-loader, or
  generator surface is introduced;
- any required public-contract change stops implementation until this package
  is amended and approved again.

The deferred Cucumber/CLI proposal is preserved as
[non-normative future design](../../future/cucumber-cli/README.md). Command
execution is considered separately in the
[command-target feasibility brief](../../future/command-target/README.md).
Neither document authorizes implementation.

## Accepted completion boundary

Gate 3 completed after:

- the approved specification revision is implemented without scope expansion;
- lifecycle, fault, hostile-input, stress, soak, compatibility, packaging,
  security, and DX proofs pass;
- required Windows, Ubuntu, and macOS profiles pass on the final candidate;
- the root export and accepted behavior remain compatible;
- no correctness, security, portability, resource, packaging, or
  documentation blocker remains;
- the completion record names the final candidate and durable evidence.

Completion did not publish a package, add an adapter or CLI, or authorize a
production-ready claim. Gate 4 developer-preview publication and external
evaluation is the next separately approved gate.

## Explicit non-goals

Gate 3 excludes Cucumber, configuration-file loading, command execution, a
project CLI, a generator, reporter APIs, retries, artifact files, OpenAPI,
additional protocols, UI/load/database testing, hosted execution, telemetry,
npm publication, and production-readiness claims.
