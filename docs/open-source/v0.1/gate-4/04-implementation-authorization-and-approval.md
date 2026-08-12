# Implementation, Authorization, and Approval

## Specification boundary

This package is specification-only. Approval authorizes a Gate 4A repository
implementation candidate; it does not authorize npm publication, GitHub release
creation, dist-tag mutation, package deprecation, token creation, or external
account configuration.

Irreversible release actions require explicit repository-owner authorization
after the implementation PR and its exact candidate evidence pass.

## Implementation slices

### Slice 1 — Package and release contract

- make only `packages/flowtract` public and version it `0.1.0`;
- preserve the workspace root and deferred packages as private;
- add release-manifest, exact-SHA, archive, integrity, and registry guards;
- add manual `release.yml` with isolated bootstrap/final environments;
- extend repository checks for release permissions, triggers, and token absence.

**Proof:** package output and public exports are unchanged except approved
release metadata; no publish command can run from PR, push, tag, fork, schedule,
or reusable-workflow events.

### Slice 2 — Registry consumers and recovery

- add exact-version public-registry consumer scripts;
- add provenance, signature, integrity, owner, dist-tag, and file checks;
- implement idempotent post-publish tag/release completion guards;
- document bootstrap token revocation, deprecation, and incident paths.

**Proof:** mock/local-registry tests exercise success, duplicate version,
integrity mismatch, partial publish, failed verification, and recovery without
contacting the public registry.

### Slice 3 — Documentation and market proof

- deploy tracked Markdown through GitHub Pages with pinned official actions;
- publish the registry-backed five-minute quick start;
- add the three market-gap demonstrations and factual comparison matrix;
- provide opt-in Gate 4B onboarding and feedback templates.

**Proof:** links, examples, accessibility basics, package version, and live-site
deployment pass; no telemetry or private evidence is collected.

### Slice 4 — Cross-platform release rehearsal

- run full local and clean-clone proof;
- run protected Windows/Ubuntu/macOS, compiler, peer, package, security, and
  documentation jobs;
- run a no-publish exact-SHA rehearsal of both release channels;
- review permissions, environments, actions, and failure paths semantically.

**Proof:** one immutable candidate is ready for bootstrap authorization with no
runtime/public-contract change and no unresolved release blocker.

## Branch, pull request, and release sequence

Gate 4A uses one consolidated side branch so documentation-only specification
work does not trigger the protected cross-platform matrix separately from the
implementation it governs.

1. Commit the decision-complete specification and this delivery-policy
   amendment as signed checkpoints.
2. Record repository-owner approval against the exact amended specification
   revision before runtime, package, or workflow implementation begins.
3. Implement Gate 4A with signed slice commits on the same side branch. Pushes
   may back up the branch but no pull request is opened until the candidate is
   complete.
4. Open one ready-for-review implementation PR and require all protected checks
   plus repository-owner semantic/security review.
5. Merge only after the candidate is `Ready for release rehearsal` and the
   repository owner gives separate merge authorization.
6. Configure protected GitHub environments and create the short-lived bootstrap
   token outside tracked source.
7. Obtain explicit authorization for the exact bootstrap SHA and publish
   `0.1.0-rc.0`.
8. Verify the registry artifact, configure trusted publishing, disallow tokens,
   and revoke the bootstrap token.
9. Obtain explicit authorization for final `0.1.0` publication.
10. Publish through OIDC, verify, create the tag/release, deploy docs, and write
    the completion record.

Publication is never bundled into PR merge and is never inferred from green CI.

## Cost-aware verification

Validation is proportional until the complete candidate exists:

- Markdown-only work runs formatting, links, stale-language, repository-scope,
  and diff checks.
- Each implementation slice runs only checks that exercise its changed
  boundary.
- Any source, package, manifest, lockfile, script, example, workflow, or
  uncertain change is classified as full-impact.
- The complete side branch runs the full local Gate 4A suite once before its
  pull request.
- The protected pull request supplies the committed clean-clone and
  cross-platform proof; these are not duplicated locally.
- Manual dispatch always uses the full-impact profile.

The Markdown-only specification checkpoint requires:

```powershell
npm run format:check
git diff --check
git status --short
```

The Gate 3 acceptance workflow is not rerun for the specification checkpoint
because it changes no runtime, dependency, package, workflow, or test.

## Approval record

| Field             | Value                                      |
| ----------------- | ------------------------------------------ |
| Decision          | Approved                                   |
| Approved by       | `iamprasanna-dev`                          |
| Approval date     | 2026-08-09                                 |
| Approved revision | `72fa3dfbffd666d5d8d921fa089b1476ed4ba4d3` |
| Authorization     | Gate 4A repository implementation only     |

The repository owner must review:

- the bootstrap necessity and short-lived token boundary;
- package/version/dist-tag identity;
- trusted-publisher claims and environment protections;
- release trigger, permissions, provenance, integrity, and recovery ordering;
- registry-backed package and documentation proof;
- market-gap claims and Gate 4B handoff;
- the parallel production-readiness track and explicit non-goals.

Runtime, package, documentation, and workflow implementation may proceed
against the approved revision. Publication and external configuration still
require the later explicit authorizations described above.

## Completion record

| Field                            | Recorded result                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Gate 4A developer preview        | Accepted                                                                                                                        |
| Approved specification           | `72fa3dfbffd666d5d8d921fa089b1476ed4ba4d3`                                                                                      |
| Implementation PR                | [PR #17](https://github.com/flowtract/flowtract/pull/17), merged as `7df8289f70750529a5ac7342b403ac4daa9a9c79`                  |
| Release-source PR                | [PR #18](https://github.com/flowtract/flowtract/pull/18), merged as `03b2402f972852827a2b132bed2d2795439f0e88`                  |
| Immutable release source and tag | `03b2402f972852827a2b132bed2d2795439f0e88`; `v0.1.0`                                                                            |
| Post-release remediation         | [PR #19](https://github.com/flowtract/flowtract/pull/19), merged as `cf1a386ee0a8ea11b2e32934bb757d652ca36b21`                  |
| Completion date                  | 2026-08-11                                                                                                                      |
| Public package                   | [`flowtract@0.1.0`](https://www.npmjs.com/package/flowtract)                                                                    |
| Final npm integrity              | `sha512-cW0mEo73qEgJzQ8jjos2SVRA2OvLxAk5v9k4osY1+o+zfiAy+V2OrBnm93BgvM6EuncJuJVF7M0A+Zvot+l4oA==`                               |
| Provenance                       | [npm attestation](https://registry.npmjs.org/-/npm/v1/attestations/flowtract@0.1.0), SLSA provenance v1                         |
| Package contract                 | 66 root exports; 84 reviewed archive files; zero runtime dependencies                                                           |
| Registry consumers               | ESM, CommonJS, TypeScript ESM/CommonJS, peer matrix, and authenticated Playwright passed on Windows and Ubuntu                  |
| GitHub release                   | [`v0.1.0`](https://github.com/flowtract/flowtract/releases/tag/v0.1.0), including tarball, CycloneDX SBOM, and release evidence |
| Documentation                    | [Flowtract documentation](https://flowtract.github.io/flowtract/) deployed and live                                             |
| Security                         | Production/full audits passed; final release uses OIDC; PR #19 closed CodeQL alert #15; zero open CodeQL alerts on `main`       |
| Gate 3 regression baseline       | 134 tests; 90.84% statements, 94.00% lines, 96.09% functions, 85.53% branches                                                   |
| Next gate                        | Gate 4B external market validation                                                                                              |

### Durable release evidence

- Bootstrap rehearsal: [run 31405129229](https://github.com/flowtract/flowtract/actions/runs/31405129229).
- Bootstrap publication and registry acceptance: [run 31406726522](https://github.com/flowtract/flowtract/actions/runs/31406726522).
- Final rehearsal: [run 31405132521](https://github.com/flowtract/flowtract/actions/runs/31405132521).
- Final OIDC publication and Windows/Ubuntu registry acceptance: [run 31409852139](https://github.com/flowtract/flowtract/actions/runs/31409852139).
- Documentation deployment: [run 31410405582](https://github.com/flowtract/flowtract/actions/runs/31410405582).
- Post-remediation CI: [run 31456172317](https://github.com/flowtract/flowtract/actions/runs/31456172317).
- Post-remediation CodeQL: [run 31456172178](https://github.com/flowtract/flowtract/actions/runs/31456172178).
- Post-remediation Scorecard: [run 31456172172](https://github.com/flowtract/flowtract/actions/runs/31456172172).

The bootstrap artifact `flowtract@0.1.0-rc.0` used integrity
`sha512-fm5iB+jkvbjBs36lrFyj3HBiO4wb0w6WME77lhXpANU326VsCXdDAfwTDIONDOxVhK1uWZ7hCDGipafL4BvtMg==`.
It is deprecated in favor of `0.1.0`; both `latest` and `next` resolve to
`0.1.0`. The repository owner confirmed that the temporary bootstrap token was
revoked, trusted publishing was configured, and token-based publication was
disabled before the final OIDC release.

Final verdict:

`Gate 4A complete — flowtract@0.1.0 developer preview published and proven`

This acceptance does not establish beta, production-candidate,
production-ready, or enterprise-ready status. Gate 4B now evaluates the
released package with external TypeScript QA and backend teams. Separately
approved capability work may proceed while the longer production-maturity
evidence track accumulates.
