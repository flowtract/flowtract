# Gate 3 Cucumber Lifecycle and Artifacts

> **Status:** Deferred design; non-normative and not authorized

This lifecycle proposal is retained for later review after core
production-candidate acceptance. It authorizes no adapter implementation.

## Hook ordering

The installed support library uses public Cucumber APIs and deterministic hook
ordering:

1. `BeforeAll`: validate static support options only; no scenario transport.
2. `Before`: create one Flowtract scenario using pickle ID, name, and tags.
3. Steps: use only the World-owned scenario.
4. final `After`: capture primary status, close the Flowtract scenario, compose
   cleanup evidence, then attach redacted diagnostics.
5. `AfterAll`: assert the adapter owns no active scenario or pending attachment.

The adapter's `After` hook is registered with a documented order/name so it
runs after user steps and remains predictable with user hooks. The
specification does not promise ordering against arbitrary user hooks that use
the same order; documentation requires user resource cleanup to use Flowtract's
cleanup stack when it depends on Flowtract transport access.

A World cannot execute before its `Before` hook, after close, or from another
scenario. A missing or replaced World scenario is a configuration/lifecycle
error, not an implicit recreation.

## Generic steps

The opt-in vocabulary covers:

- select an auth profile for subsequent generic execution;
- execute a registered operation by exact ID;
- provide JSON body/query/path/header input through doc strings or data tables;
- assert exact status or contract status;
- assert a response field against JSON scalar/object input;
- capture a response field into ordinary or explicitly secret state;
- execute an explicitly named unsafe request-validation variant.

Operation lookup uses the configured registry and returns a bounded list of
known IDs on failure. Field paths use the same Gate 2 literal dot segments,
numeric indices, and single-segment `*` grammar; arbitrary JSONPath and escaping
are unsupported.

Doc strings are strict JSON unless the step explicitly represents text. Data
tables reject duplicate keys. Missing fields, unsupported values, malformed
JSON, and unsafe variants without the word `unsafe` fail visibly. Generic steps
never infer credentials, cookie names, auth profiles, operation IDs, or cleanup
behavior.

## Domain wrappers

Documentation and the generated Cucumber template include one domain wrapper
that calls registered operations through the World scenario. Domain wrappers
are the recommended durable interface. They do not reach internal registries,
construct a second runtime, or mutate adapter globals.

## Retry and parallel behavior

Retry is Cucumber scenario retry, default `0`, and creates a completely new
World and Flowtract scenario for every attempt. State, cookies, auth instances,
cleanup registrations, history, and transport contexts are never reused across
attempts.

Parallelism uses Cucumber worker processes controlled by `flowtract test`.
Each worker imports configuration once and owns its runtime. Artifact events
include worker and attempt identity so aggregation is deterministic.

## Attachment policy

Attachments are produced only from already-redacted immutable diagnostics.
Default attachments contain:

- schema version;
- scenario/pickle ID and attempt;
- operation ID, phase, status, duration, outcome, and stable error code;
- cleanup failure labels with redacted messages.

They omit raw headers, cookies, bodies, state, environment, stacks, causes, and
absolute local paths. A bounded optional preview may be attached only if Gate 2
redaction has already processed it. Attachment formatting never calls getters,
`toJSON`, or arbitrary `toString` on user values.

## Artifact transaction

`flowtract test` creates a unique run staging directory under the configured
artifact directory. Workers write framed Cucumber messages and diagnostics to
worker-specific files. After all workers terminate, the parent validates and
aggregates them into:

```text
flowtract-results/
├── summary.json
├── cucumber-messages.ndjson
├── junit.xml
├── report.html
└── diagnostics/
```

The final run directory is atomically replaced only after all requested outputs
are complete. Existing results are moved to a bounded same-root backup and
restored if finalization fails. No browser opens automatically.

`summary.json` begins at schema version `1` and contains run ID, tool/runtime
versions, start/end/duration, command options without secrets, scenario and
attempt counts, operation/contract outcomes, stable error-code counts, cleanup
status, and artifact-relative paths. Ordering is stable by feature URI, pickle
line, attempt, and operation start time.

## Artifact limits and failures

- individual diagnostics event: 64 KiB after redaction;
- individual attachment: 256 KiB;
- aggregate diagnostics per scenario attempt: 2 MiB;
- artifact path length and filename components use platform-safe bounds;
- malformed or oversized worker output fails the run;
- formatter or finalization failure yields CLI exit `5` unless a test failure
  already yields `1`, in which case artifact failure is retained in the JSON
  error list and human stderr.

Maintained Cucumber formatters generate Cucumber messages, JUnit, and HTML.
Flowtract does not implement an independent feature parser or report renderer.
