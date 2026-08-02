# Gate 3 Architecture and Boundaries

> **Status:** Deferred design; non-normative and not authorized

This document describes the superseded Cucumber/CLI Gate 3 proposal. It must
be revalidated against the accepted core before any later implementation.

## Baseline that must not regress

Gate 3 builds on the accepted Gate 2 runtime. It does not create another HTTP,
authentication, interpolation, cleanup, redaction, or response-validation
engine. Programmatic tests, Cucumber steps, CLI commands, and generated projects
all call the same public runtime and registered operation objects.

Gate 2 guarantees remain normative:

- exact operation-object identity;
- one external operation in flight per scenario;
- scenario-local transport, cookies, auth, state, secrets, history, and cleanup;
- secure TLS and no automatic transport retry;
- close-scoped cleanup clients and deterministic disposal;
- redacted immutable diagnostics and stable Flowtract errors;
- root-only package exports until Gate 3 explicitly adds subpaths.

## Component ownership

```text
project config
  -> config loader
     -> Flowtract runtime
        -> programmatic callback
        -> Cucumber worker support

flowtract CLI
  -> argument and environment validation
  -> selected project config
  -> command service
     -> Cucumber worker process for test
     -> in-process inspection for doctor and operations list
     -> bounded source generation for schema from-curl

create-flowtract
  -> shared generator service
  -> reviewed templates
  -> destination safety checks
```

The CLI is an adapter around command services. Command services do not call
`process.exit`, write to global stdout/stderr, or read implicit current
directories. They receive explicit paths, environment, clocks, streams, and
process-launch ports so unit tests remain deterministic.

## Trust boundaries

### Project configuration

A selected configuration file is trusted project code and may execute normal
JavaScript during import. Flowtract does not claim to sandbox it. Flowtract
MUST select exactly one file, resolve it to a canonical path, report that path,
and never search outside the project root.

Configuration values, operation callbacks, auth providers, Cucumber support
files, and custom project steps are trusted code. Request/response data,
environment-file values, cURL input, feature text, doc strings, data tables,
artifact paths, CLI arguments, and generated destination paths are untrusted
data.

### Package imports

Importing `flowtract`, `flowtract/cucumber`, or `flowtract/testing` has no
registration, filesystem, process, or network side effect. Cucumber hooks and
steps are installed only by calling an exported installer. The CLI and
`create-flowtract` binaries are the only automatic entry points.

### Filesystem

All user paths are resolved from an explicit project root. Before a read or
write, the implementation walks existing ancestors and rejects symbolic links,
junctions, reparse points, or canonical paths outside the allowed root unless
a narrowly named option explicitly permits external reads. Gate 3 never
permits external writes.

Artifact and generator writes use a sibling temporary file or directory,
flush/close it, then rename into place. Teardown removes only exact temporary
paths created by the current process.

### Processes

Only `flowtract test` may create worker child processes. It uses executable and
argument arrays without a shell, a bounded worker count, an explicit sanitized
environment, piped stdio, and one owner for shutdown. SIGINT/SIGTERM and Windows
console termination initiate graceful shutdown, then a documented bounded
forced termination if children do not exit.

## Scenario and worker ownership

Configuration is loaded once in each worker process. One immutable Flowtract
runtime may serve multiple sequential scenarios in that worker. Every Cucumber
pickle creates one `FlowtractScenario` in `Before` and closes that exact
scenario in the final `After` hook.

The adapter stores scenario state on its World instance, never in module-global
mutable state. Parallel workers share neither runtime scenario state nor
transport contexts. A hook/step/attachment failure remains primary; close
failure is attached with the accepted Gate 2 cleanup composition rules.

## Failure policy

Gate 3 fails closed for:

- ambiguous or escaping configuration paths;
- malformed CLI arguments or JSON output requests;
- unknown operation IDs or auth profiles;
- unsafe destination or artifact paths;
- non-redacted attachment/artifact candidates;
- worker launch, signal forwarding, or termination failure;
- unsupported cURL syntax;
- optional Cucumber use when the peer dependency is unavailable or incompatible.

Gate 3 MUST NOT silently skip a feature, hook, artifact, cleanup, compiler,
package consumer, or operating-system lane to obtain acceptance.
