# Gate 0 Review and Approval

> **Historical decision note:** Gate 1.5 supersedes the repository-transfer
> assumption below with a clean extraction into `flowtract/flowtract`. Product,
> license, and root-interface decisions remain. The Gate 3 scope reset defers
> `create-flowtract`, Cucumber, and testing subpaths beyond the `0.1` root-core
> promise; the entries below record the original long-term direction, not an
> implementation authorization.

This sheet is the decision checkpoint between the prototype foundation and the
Flowtract runtime refactor. It does not replace the normative documents linked
from the [specification index](README.md).

## Decisions proposed for approval

- Product name: **Flowtract**.
- Positioning: **Test contracts in motion.**
- Release classification: `0.1.0` developer preview.
- License and contribution mechanism: Apache-2.0 and DCO, with no CLA.
- Scope: schema-verified, stateful REST workflows with JSON, text, and empty
  responses.
- Primary users: TypeScript QA engineers, SDETs, and backend teams.
- Immediate public package candidate: root-only `flowtract`.
- Deferred packages/entry points: `create-flowtract`, `flowtract/cucumber`, and
  `flowtract/testing`, subject to later approved gates.
- Supported Node lines: 22 and 24.
- Schema contract: Zod 4 public APIs.
- Default transport: Playwright behind the public `HttpTransport` port.
- Cucumber: possible optional future adapter after core acceptance.
- Telemetry: none in v0.1.
- Compatibility: clean pre-1.0 break from the unpublished prototype.
- Release schedule: evidence-gated, with no calendar promise.

## Evidence already established

- The prototype type-checks and builds.
- The prototype exercises authenticated, stateful request workflows.
- The current mock suite has previously passed 10 scenarios and 77 steps.
- Existing lint output is limited to 46 `no-explicit-any` warnings and no
  errors.
- The current mock runner can hang after completion on Windows.
- The current mock workflow can mutate the tracked `data/parts.json` fixture.
- The prototype still uses Zod 3 and private schema metadata and is not a
  publishable Flowtract package.

These statements describe the current repository only. They are not evidence
of package compatibility, cross-platform reliability, security maturity, or
production readiness.

## Local Gate 0 deliverables

- [x] Canonical product and public-interface specification.
- [x] Baseline and gap inventory.
- [x] Security, configuration, artifact, test, and release contracts.
- [x] Apache-2.0 license and notice.
- [x] Governance, contribution, DCO, security, support, and conduct policies.
- [x] Issue and pull-request templates.
- [x] Dependabot, CodeQL, Scorecard, and baseline CI definitions.
- [x] Committed-lockfile policy and a lockfile generated from the prototype.
- [x] Developer-preview and non-enterprise-ready language in the root README.
- [ ] Maintainer approval recorded in the specification index.

## External actions after approval

The following actions change external ownership or reserve public names and are
not completed by repository files:

- complete legal trademark and domain diligence for Flowtract;
- create the Flowtract GitHub organization and its recovery-owner policy;
- reserve `flowtract` and `create-flowtract` through an approved npm mechanism;
- transfer the repository without rewriting history;
- enable private vulnerability reporting;
- install or enable DCO enforcement;
- configure branch protection and required checks;
- configure npm trusted publishing and provenance before the first prerelease.

No package should be published merely to squat on a name. The reservation method
must follow npm policy and contain a useful package if publication is required.

## Approval effect

Approval authorizes Gate 1 restructuring only:

- establish the two-package npm workspace;
- implement builds, controlled exports, public types, and error contracts;
- replace prototype schema metadata with `defineOperation`;
- migrate to Zod 4 public APIs;
- create clean consumer package/type proofs.

It does not authorize repository transfer, npm publication, production
deployment, hosted services, paid features, or scope expansion.

To approve, update the approval table in [README.md](README.md) with the
decision, approver, date, and reviewed revision. The implementation can then
begin Gate 1 from that recorded boundary.
