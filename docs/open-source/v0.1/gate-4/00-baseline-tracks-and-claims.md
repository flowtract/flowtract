# Baseline, Tracks, and Claims

## Accepted baseline

Gate 4A starts from protected `main` revision
`d08c13055178d23cc4a381afccfff86907c11c68`.

That revision records:

- Gate 3 core production-candidate proof accepted through PR #11;
- 134 tests and accepted coverage floors;
- Windows and Ubuntu Node 22/24 plus macOS Node 24;
- TypeScript 5.5.4, 6.0.2, and 7.0.2 consumers;
- minimum/latest Zod 4 and Playwright peers;
- an 84-file root-only ESM/CommonJS package;
- hostile-input, lifecycle-race, resource, stress, benchmark, and soak proof;
- zero full-development and production audit findings after PR #15;
- post-merge CI and CodeQL success with zero open CodeQL alerts.

The `flowtract` name returned registry `E404` during Gate 4A discovery on
2026-08-09. This is only a point-in-time observation. The release workflow must
check again immediately before the first publish and must fail if the name or
target version has become unavailable.

## Current release state

- `packages/flowtract` is version `0.1.0-dev.0` and private.
- The workspace root is version `0.1.0-dev.0` and private.
- No npm package, dist-tag, release tag, or GitHub release exists for Flowtract.
- Package publication has only been rehearsed with `npm publish --dry-run`.
- Public documentation lives in the repository; no release documentation site
  has been deployed.

## Parallel product tracks

Flowtract uses independent evidence tracks after Gate 4A:

1. **Capability track** — separately approved runtime, adapter, or target work
   selected from demonstrated user problems.
2. **Market-validation track** — Gate 4B onboarding, real workflow use, support
   load, retention, and missing-capability evidence.
3. **Release-maturity track** — compatibility across releases, incident and
   recovery exercises, production operation, and support-policy evidence.

The tracks inform each other but are not serial blockers. In particular:

- Gate 4B evidence may authorize later feature gates before production-ready
  evidence exists;
- the three-team/90-day criterion gates only the `production ready` label;
- no calendar duration substitutes for an approved capability contract;
- green repository proof does not substitute for external market evidence.

## Claim ladder

The project may use only these labels after their evidence exists:

1. **Unpublished core candidate** — current state before Gate 4A publication.
2. **Developer preview** — `flowtract@0.1.0` is public, documented, and proven
   from the registry.
3. **Beta** — Gate 4B demonstrates repeated external use and resolves its
   release-blocking findings.
4. **Production candidate** — released artifacts and operating profiles have
   meaningful external evidence.
5. **Production ready** — at least three teams have operated Flowtract in
   production for at least 90 days, compatibility/support/security policies
   have been exercised, and no major blocker remains.

Gate 3's root-core technical verdict remains valid but does not advance the
project-level label by itself.

## External prerequisites

Before any publication is attempted, the repository owner must verify:

- npm account ownership and recovery methods;
- account-level two-factor authentication;
- control of the `flowtract` package name at publish time;
- GitHub organization and repository recovery owners;
- protected GitHub environments for bootstrap and final publication;
- an exact workflow filename registered with npm after the package exists;
- no unexpected npm owners, tokens, trusted publishers, versions, or tags.

Missing external control stops publication without changing package identity or
weakening the workflow.
