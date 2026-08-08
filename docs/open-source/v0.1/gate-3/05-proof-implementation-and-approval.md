# Proof, Implementation, and Approval

## Approval boundary

This specification package is the Gate 3 deliverable. Runtime, dependency,
test, documentation, package, and workflow implementation is not authorized
until the repository owner approves an exact revision below.

Approval authorizes only root-core hardening. It does not authorize Cucumber,
configuration loading, command execution, CLI/generator work, package
publication, or a production-ready claim.

## Implementation sequence

Use one Gate 3 implementation branch and one reviewable pull request with
small signed commits.

### Slice 1 — Baseline, dependency debt, and compatibility harness

- reproduce the clean Gate 2 baseline;
- remove the unused optional Cucumber peer;
- update development `esbuild` to 0.28.1;
- migrate ESLint to 10.8.0 with `@typescript-eslint` 8.65.0 and eliminate the
  high transitive `brace-expansion` finding without suppressing lint scope;
- add minimum/latest peer consumers and macOS/Node 24 CI;
- lock the root export and compatibility snapshot.

**Proof:** dependency, build, archive, root export, compiler, and installed
consumer checks pass without a public-surface change.

### Slice 2 — Hostile inputs, fault injection, and redaction

- add fixed-seed property generators and replay support;
- add the complete callback/transport/provider fault matrix;
- exercise accessors, proxies, cycles, deep/large values, thrown primitives,
  and non-extensible errors;
- scan every error and diagnostic representation for generated secrets.

**Proof:** 10,000 hostile cases and every failure phase remain bounded,
redacted, stable, and cleanup-safe.

### Slice 3 — Lifecycle races and resource conformance

- add deterministic scheduling barriers;
- exercise execute/close, abort/response, auth, and cleanup races 100 times;
- add internal transport/provider ownership counters;
- expand Playwright CRUD concurrency to at least 16 scenarios.

**Proof:** all ownership balances, isolation assertions, and lifecycle outcomes
pass with zero live resource.

### Slice 4 — Stress, benchmark, and soak

- add sequential and concurrent custom-transport stress profiles;
- record a same-host Gate 2 performance baseline;
- add `core:soak` with fixed seeds, resource accounting, forced-GC heap
  samples, and machine-readable summary;
- run the soak acceptance on Windows and Ubuntu Node 24.

**Proof:** the quantitative reliability, performance, and soak requirements in
Document 02 pass on the candidate.

### Slice 5 — Core DX and package proof

- document all root exports and accepted lifecycle/security boundaries;
- implement the executable quick start and focused examples;
- add the complete error/troubleshooting catalog;
- extend packed ESM/CommonJS/TypeScript and peer-version consumers;
- generate the untracked CycloneDX SBOM and publication dry run.

**Proof:** clean consumers use only the tarball, all snippets compile/execute,
and the archive contains only reviewed files.

### Slice 6 — Cross-platform security closure

- run Windows/Ubuntu Node 22/24 and macOS Node 24;
- run compiler, clean-clone, CodeQL, Dependency Review, DCO, audit, secret,
  package, and repository-integrity gates;
- review the final diff against this specification and non-goals;
- update the changelog and completion record only after all proof passes.

**Proof:** every required check passes on one immutable final SHA with no open
correctness, security, portability, resource, packaging, or documentation
blocker.

## Quantitative acceptance

The final candidate must satisfy all of these:

- at least 90% statements, lines, and functions and 85% branches;
- existing Gate 1/Gate 2 cases plus every named Gate 3 case pass;
- 100 schedules for each required lifecycle race family;
- 1,000 sequential scenario cycles;
- 64 concurrent custom-transport scenarios;
- at least 16 concurrent Playwright authenticated CRUD scenarios;
- at least 10,000 replayable hostile cases;
- 15-minute/10,000-operation soak on Windows and Ubuntu Node 24;
- 10,000-operation custom benchmark under 10 seconds and within 20% of the
  same-host Gate 2 baseline;
- normal QA and package proof each below 60 seconds under their documented
  exclusions;
- zero leaked resources, generated-secret occurrences, tracked mutations,
  production vulnerabilities, and new branch CodeQL alerts.

Coverage or timing thresholds, iterations, concurrency, redaction assertions,
and platform lanes must not be weakened to accept a failing candidate.

## Required final commands

The implementation must expose stable repository scripts for the complete
proof. Final local verification includes at least:

```powershell
npm ci --ignore-scripts
npm run gate3:qa
npm run type-matrix
npm run clean-clone:check
npm run core:soak
npm audit --omit=dev --audit-level=high
npm sbom --sbom-format cyclonedx
npm run package:publish-dry-run
git diff --check
git status --short
```

`package:publish-dry-run` uses a temporary manifest that differs only by
omitting `private`, runs npm with `--dry-run --tag next`, verifies the archive
against package proof, and publishes nothing. SBOM and dry-run artifacts remain
untracked. The cross-platform soak may be executed through manual
release-blocking workflows, but its durable run URLs must identify the final
candidate SHA.

## Failure policy

Correctness, security, portability, resource, packaging, compatibility, or
documentation failures stop acceptance and produce a bounded remediation.
Only a confirmed infrastructure failure may receive one unchanged rerun.
Every candidate-changing push invalidates earlier candidate-specific evidence.

## Specification approval

The repository owner must confirm:

- the core production-candidate meaning and production-ready non-claim;
- the root-only API freeze and compatibility rules;
- lifecycle, race, fault, resource, stress, performance, and soak contracts;
- threat model, redaction, dependency, and supply-chain gates;
- DX, package, platform, compiler, and peer-version profiles;
- deferred Cucumber/CLI and command-target boundaries;
- all explicit non-goals.

| Field             | Value                                      |
| ----------------- | ------------------------------------------ |
| Decision          | Approved                                   |
| Approved by       | Repository owner                           |
| Approval date     | 2026-08-02                                 |
| Approved revision | `2f9a50ca714916e91eb4e4b2266aa28c01da99e3` |
| Authorization     | Root-core Gate 3 implementation only       |

Semantic review corrected the development-audit inventory, locked the ESLint
and esbuild remediation targets, made private-package publication rehearsal
executable without publishing, and replaced a platform-sensitive heap trend
rule with a bounded forced-GC comparison before approval.

After approval, prepare a decision-preserving implementation plan against the
approved SHA. Any required deviation stops work until an amended revision is
approved.

## Completion record

Gate 3 was accepted and squash-merged on 2026-08-02. The accepted merge tree is
identical to the final reviewed candidate tree.

| Field                     | Recorded result                                                                                                                                                                                                                                                                                |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core production-candidate | Accepted                                                                                                                                                                                                                                                                                       |
| Approved specification    | `2f9a50ca714916e91eb4e4b2266aa28c01da99e3`                                                                                                                                                                                                                                                     |
| Final candidate           | `9e56434e60bdd538968d9e1c06b1fdb07528e3a9`                                                                                                                                                                                                                                                     |
| Accepted merge revision   | `9e6c99133a923565eda38548427630b9487807f8`                                                                                                                                                                                                                                                     |
| Acceptance PR             | [PR #11](https://github.com/flowtract/flowtract/pull/11)                                                                                                                                                                                                                                       |
| Approval and merge date   | 2026-08-02                                                                                                                                                                                                                                                                                     |
| Cross-platform proof      | [PR candidate CI `30756515545`](https://github.com/flowtract/flowtract/actions/runs/30756515545) and [post-merge CI `30757454947`](https://github.com/flowtract/flowtract/actions/runs/30757454947)                                                                                            |
| Soak/performance proof    | [Exact-SHA acceptance `30756617172`](https://github.com/flowtract/flowtract/actions/runs/30756617172)                                                                                                                                                                                          |
| Security proof            | [PR CodeQL `30756515490`](https://github.com/flowtract/flowtract/actions/runs/30756515490), [post-merge CodeQL `30757454777`](https://github.com/flowtract/flowtract/actions/runs/30757454777), and [Scorecard `30757454766`](https://github.com/flowtract/flowtract/actions/runs/30757454766) |
| Package/compiler proof    | 84 approved files; ESM/CommonJS; TypeScript 5.5.4, 6.0.2, and 7.0.2; minimum/latest reviewed Zod and Playwright peers                                                                                                                                                                          |
| Test and coverage proof   | 134 tests; 90.84% statements, 94.00% lines, 96.09% functions, and 85.53% branches                                                                                                                                                                                                              |

The final candidate passed 10,000 fixed-seed hostile/property cases, 400
deterministic lifecycle-race schedules, 1,000 sequential scenario cycles, 64
concurrent custom-transport scenarios, and 16 concurrent authenticated
Playwright CRUD scenarios.

The exact-SHA acceptance ran for 900.077 seconds and 18,938 operations on
Ubuntu, and 900.096 seconds and 18,590 operations on Windows. Both lanes
reported zero unexpected failures, generated-secret occurrences, or live
resources. The candidate benchmark completed in 89.222 milliseconds on Ubuntu
at 1.027 times the same-host Gate 2 baseline, and in 172.267 milliseconds on
Windows at 0.954 times that baseline.

Full-development and production audits, DCO, Dependency Review, CycloneDX SBOM
validation, and the non-publishing package rehearsal passed. Branch-filtered
queries recorded zero open CodeQL alerts on both the final candidate and the
accepted `main` revision. Five older OpenSSF Scorecard advisory findings,
created on 2026-07-28, remain visible in repository code scanning; they are not
new Gate 3 CodeQL findings and this record does not describe them as closed.

On 2026-08-08, a later registry advisory refresh identified high-severity
development-only findings in locked transitive `brace-expansion` and `nanoid`
versions. [PR #15](https://github.com/flowtract/flowtract/pull/15) updated only
those lockfile entries and merged as `63386a5`; full-development and production
audits returned to zero without a manifest, runtime, package, or public-contract
change.

This is a bounded root-core technical verdict. The package remains private and
unpublished, and Flowtract is not production or enterprise ready. Gate 4
developer-preview publication and external evaluation remain separately
authorized future work.
