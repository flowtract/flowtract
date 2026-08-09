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

## Pull request and release sequence

1. Approve and merge this specification PR.
2. Implement Gate 4A in one draft PR with signed slice commits.
3. Require all protected checks and repository-owner semantic/security review.
4. Merge the implementation only after it is `Ready for release rehearsal`.
5. Configure protected GitHub environments and create the short-lived bootstrap
   token outside tracked source.
6. Obtain explicit authorization for the exact bootstrap SHA and publish
   `0.1.0-rc.0`.
7. Verify the registry artifact, configure trusted publishing, disallow tokens,
   and revoke the bootstrap token.
8. Obtain explicit authorization for final `0.1.0` publication.
9. Publish through OIDC, verify, create the tag/release, deploy docs, and write
   the completion record.

Publication is never bundled into PR merge and is never inferred from green CI.

## Specification verification

This specification PR must change only Markdown and pass:

```powershell
npm ci --ignore-scripts
npm run format:check
npm run gate3:qa
npm run type-matrix
npm run clean-clone:check
npm audit --audit-level=low
git diff --check
git status --short
```

The Gate 3 acceptance workflow is not rerun because this specification changes
no runtime, dependency, package, workflow, or test.

## Approval record

| Field             | Value                                  |
| ----------------- | -------------------------------------- |
| Decision          | Pending                                |
| Approved by       | Pending                                |
| Approval date     | Pending                                |
| Approved revision | Pending                                |
| Authorization     | Gate 4A repository implementation only |

The repository owner must review:

- the bootstrap necessity and short-lived token boundary;
- package/version/dist-tag identity;
- trusted-publisher claims and environment protections;
- release trigger, permissions, provenance, integrity, and recovery ordering;
- registry-backed package and documentation proof;
- market-gap claims and Gate 4B handoff;
- the parallel production-readiness track and explicit non-goals.

Runtime implementation, publication, or external configuration cannot begin
until an exact specification revision is approved. Publication still requires
the later explicit authorizations described above.

## Completion record

Pending implementation, publication, and final acceptance. Gate 4A is not
complete merely because this specification or its implementation is merged.
