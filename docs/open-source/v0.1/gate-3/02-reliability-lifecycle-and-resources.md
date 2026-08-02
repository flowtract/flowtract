# Reliability, Lifecycle, and Resources

## Scenario state machine

A scenario has three externally visible lifecycle states:

```text
open -> closing -> closed
```

- `open` accepts at most one external operation at a time.
- `close()` moves to `closing` synchronously and rejects new external work.
- `closing` waits for the current external operation, runs cleanup clients in
  LIFO order, disposes auth instances in reverse initialization order, and
  disposes the transport session.
- repeated or concurrent `close()` calls share one promise.
- `closed` rejects all operations and cleanup registration.
- a cleanup client exists only for its action, may execute operations through
  the same scenario resources, cannot register cleanup, and is invalidated
  when the action settles.

No race may reopen a scenario, start disposal twice, initialize auth after auth
disposal begins, or allow cleanup transport I/O to outlive transport disposal.

## Concurrency invariants

Parallelism belongs across scenarios. Each scenario owns its transport session,
cookies, auth instances, ordinary and secret state, taint tracker, history,
diagnostics, and cleanup stack. No owned mutable collection is shared.

Gate 3 must prove:

- execute/execute rejects the second external operation deterministically;
- execute/close waits and then disposes once;
- abort/response has one stable winner and one recorded operation outcome;
- concurrent auth demand creates and sets up one provider instance;
- close during auth setup still performs all required disposal;
- a failed cleanup operation does not skip later cleanup or disposal;
- an unawaited cleanup-client operation is tracked before disposal;
- scenario identity never grants authority or cross-scenario state access.

Each race family runs through at least 100 deterministic schedules. Tests use
explicit barriers rather than wall-clock sleeps and print the schedule on
failure.

## Fault-injection matrix

Internal test doubles must inject synchronous throws, asynchronous rejection,
non-`Error` values, non-extensible errors, hostile causes, aborts, and delayed
settlement at every applicable boundary:

- configuration and operation registration;
- interpolation and request validation/transformation;
- auth provider create, setup, apply, and dispose;
- transport session create, request, response validation, and dispose;
- response status selection, decoding, and schema validation;
- cleanup callback and cleanup-client operation;
- history/diagnostic construction and public error serialization.

For every injected failure, proof asserts the stable public code/phase, bounded
redacted representation, primary-error preservation, ordered cleanup evidence,
complete later disposal attempts, and zero leaked resource.

## Stress profiles

The default Gate 3 QA includes:

- 1,000 sequential create/execute/close cycles using a deterministic custom
  transport;
- 64 concurrent isolated custom-transport scenarios;
- at least 16 concurrent Playwright session-authenticated CRUD scenarios with
  unique cookies and CSRF tokens;
- cross-scenario access denial and cleanup deletion for every created entity;
- at least 10,000 fixed-seed hostile cases across interpolation, redaction,
  normalization, errors, and response decoding.

Generated-case failures print the seed, case index, and a bounded redacted
counterexample. Replaying a reported seed executes exactly the same case.

## Resource accounting

Proof infrastructure counts every created and disposed transport session,
Playwright response, HTTP request, socket, auth instance, cleanup action, and
proof-service entity. Acceptance requires balanced ownership and zero active
resources after teardown, including failure and abort paths.

Resource counters are internal test evidence and are not public APIs. Tests do
not infer correctness from process exit alone and do not inspect unstable
private Playwright fields.

## Soak profile

`core:soak` runs on Windows and Ubuntu Node 24 for at least 15 minutes and at
least 10,000 completed operations. It mixes success, declared HTTP failures,
auth setup, abort, timeout, cleanup, and scenario churn using fixed seeds.

The report records environment, candidate SHA, seed, elapsed time, operation
counts, incorrect results, active resources, disposal counts, generated-secret
scan, and heap samples after warm-up and forced garbage collection.

Acceptance requires:

- zero incorrect result or unexpected rejection;
- zero generated-secret occurrence;
- zero live Flowtract/proof resource after final teardown;
- no monotonic post-warm-up retained-heap growth across the final five samples;
- normal process termination.

Raw RSS is reported only as context and never used as a cross-platform gate.

## Performance profile

After warm-up, 10,000 custom-transport operations must finish within 10 seconds
on the acceptance host. The candidate must also remain within 20% of the
same-host Gate 2 baseline. Both absolute and relative requirements apply.

The normal runtime/coverage proof and package proof each retain their existing
60-second threshold. Installation and package compilation remain excluded only
where the current proof already excludes them.
