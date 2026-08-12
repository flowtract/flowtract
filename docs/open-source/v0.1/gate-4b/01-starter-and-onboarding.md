# Starter and Onboarding Protocol

## Dedicated starter

Gate 4B uses a dedicated `flowtract/flowtract-starter` repository so an
evaluator does not need to understand or clone the Flowtract monorepo. It is
prepared privately and becomes a public GitHub template only after exact Gate
4B launch authorization.

The starter must:

- install `flowtract@0.1.0` from the public npm registry, never a workspace
  build, tarball, Git URL, or local link;
- commit a lockfile with `zod@4.4.3`, `playwright@1.62.1`, and the conventional
  `typescript@5.9.3` compiler;
- declare Node `^22.0.0 || ^24.0.0`;
- bind a local HTTP service to `127.0.0.1` on an ephemeral port;
- generate every credential, cookie, session ID, and CSRF token at runtime;
- use only public Flowtract exports;
- execute login, create, get, and delete contracts with `sessionAuth`;
- prove two scenario-isolated sessions and cross-scenario access denial;
- use secret state, interpolation, typed status narrowing, declared errors,
  redacted diagnostics, and cleanup-client deletion;
- end with zero live entities, sockets, sessions, transport contexts, or
  generated-secret occurrences;
- terminate normally and print `flowtract-starter: passed`.

The starter collects no telemetry, writes no evidence automatically, publishes
no package, contacts no external API, and requires no static credential or
environment secret.

## Evaluator commands

The supported onboarding path is:

```text
npm ci
npm run type-check
npm run demo
npm run check
```

`npm run check` verifies TypeScript, the exact registry dependency, execution,
cleanup, audit status, and tracked-file integrity.

The starter is accepted on two low-cost lanes:

- Ubuntu / Node 22;
- Windows / Node 24.

Both lanes use immutable action pins, locked installation, the real default
Playwright transport, a production audit, and repository-integrity proof.

## Timing definition

The first-success timer begins after dependency installation completes. It ends
when the unchanged starter prints `flowtract-starter: passed`.

Installation, browser downloads not required by the HTTP-only starter, reading
the introductory README, and later real-workflow adaptation are excluded from
the first-success timer. The evaluator reports elapsed whole minutes, rounded
up. A reported zero-minute result is invalid.

## Intervention classes

- **None:** the evaluator uses only tracked starter and documentation material.
- **Documentation clarification:** the maintainer points to existing material
  or explains an already-documented contract without writing evaluator code.
- **Synchronous intervention:** live diagnosis, configuration changes, or
  step-by-step guidance is needed for completion.
- **Maintainer-authored code:** the maintainer supplies project-specific code
  or a Flowtract patch required for success.
- **Abandoned:** the evaluator stops before starter or real-workflow completion.

For the no-intervention threshold, `None` and `Documentation clarification`
qualify. The other classes do not.

## Real and repeat workflow definitions

A real workflow succeeds when the evaluator uses `flowtract@0.1.0` against a
non-maintainer-controlled API and verifies authenticated state across at least
two dependent REST requests. It may run against a local, test, staging, or
approved production-like environment.

A repeat workflow is a distinct second workflow with a different business
purpose or operation sequence. Re-running the same starter or changing only an
identifier does not qualify.

The evaluator is never required to expose the repository, endpoint, payload,
credential, customer, or organization involved.

## Starter support boundary

Questions, evaluation reports, and capability proposals are centralized in
`flowtract/flowtract`. Issues and Discussions remain disabled in the starter
repository. Vulnerabilities use Flowtract's private reporting process.
