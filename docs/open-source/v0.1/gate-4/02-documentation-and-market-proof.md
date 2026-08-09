# Documentation and Market Proof

## Documentation delivery

Gate 4A deploys public documentation to GitHub Pages at the repository's
organization-project URL. The implementation uses GitHub's Pages deployment
environment and SHA-pinned official Pages actions. It introduces no runtime
dependency and no publishing credential.

The initial Pages deployment is manual and may run only after final registry
acceptance. It checks out the exact final release SHA and fails unless
`flowtract@0.1.0` and its provenance already verify. Before that point, the
tracked documentation may describe Gate 4A as upcoming but must not tell users
that `0.1.0` is installable. After initial release, normal documentation changes
may deploy from protected `main` after documentation and link checks pass.

The site is built from tracked Markdown and must include:

- installation from `flowtract@0.1.0`;
- a runnable local-HTTP quick start;
- supported Node, npm, TypeScript, Zod, and Playwright versions;
- operation contracts and exact/default status narrowing;
- bearer, API-key, basic, and session/CSRF authentication;
- state, secret interpolation, dry run, cancellation, cleanup, diagnostics,
  history, and custom transports;
- stable error codes, phases, corrective actions, and troubleshooting;
- security defaults, redaction boundaries, privacy, and vulnerability reporting;
- package exports, SemVer/deprecation policy, limitations, and non-goals;
- links to npm, source, release notes, support, governance, and provenance.

The npm README and documentation site must agree. All examples are extracted,
compiled, or executed by repository checks. The post-release documentation
check installs the real registry package and rejects local source or tarball
resolution.

## Five-minute path

After dependencies are installed, a new user must be able to:

1. install `flowtract`, compatible Zod, and Playwright;
2. define one typed operation;
3. create a runtime and scenario;
4. execute against a local HTTP service;
5. narrow the status-specific result;
6. close the scenario cleanly.

The automated proof must complete in under five minutes. The human-facing page
must show one primary path before advanced configuration.

## Market-gap proof pack

Gate 4A publishes three reproducible demonstrations using only public APIs:

1. **Authenticated workflow** — session login, cookies, CSRF, dependent IDs,
   typed responses, and scenario isolation.
2. **Lifecycle workflow** — create, declared failure, cleanup-client deletion,
   primary-error preservation, and zero leaked resource.
3. **Contract workflow** — Zod transforms, exact/default statuses, dry run,
   cancellation, and secret-safe diagnostics.

Each demonstration includes:

- the runnable Flowtract implementation;
- the equivalent responsibilities a project must own when using raw HTTP or
  Playwright request primitives;
- a factual matrix covering contracts, auth lifecycle, isolation, redaction,
  cleanup, diagnostics, and package/runtime ownership;
- CI evidence and instructions using the published package.

Comparisons must be reproducible and must not claim that Flowtract replaces
Playwright, PactumJS, Karate, Postman, Schemathesis, or every API-testing tool.
Flowtract's claim is narrower: it provides a coherent typed lifecycle for
authenticated, stateful REST workflow contracts.

## Gate 4B handoff

Gate 4A prepares public onboarding and feedback intake. Gate 4B then recruits at
least five real TypeScript QA/backend repositories and measures:

- time to first successful scenario;
- completion without maintainer intervention;
- use on a second real workflow;
- defects, missing capabilities, support effort, and retention;
- whether the authenticated stateful-workflow wedge solves meaningful work.

Gate 4B evidence guides later capability gates. It is not a prerequisite for
publishing `0.1.0`, and the production-ready 90-day criterion is not a
prerequisite for evidence-driven feature work.

## Privacy

Flowtract and its documentation collect no product telemetry. Gate 4B uses
explicit opt-in interviews, issues, discussions, and voluntarily supplied
repository evidence. Public reports must not contain credentials, private
source, endpoint data, or identifiable operational details without permission.
