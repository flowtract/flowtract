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

Pending implementation, publication, and final acceptance. Gate 4A is not
complete merely because this specification or its implementation is merged.
