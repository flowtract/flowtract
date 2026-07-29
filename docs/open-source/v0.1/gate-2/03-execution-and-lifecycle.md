# Execution and Lifecycle Semantics

## Scenario creation

`createScenario` performs:

1. metadata normalization and scenario-ID generation;
2. transport-session creation using the runtime `baseURL` and TLS policy;
3. initialization of empty state, history, diagnostics, auth-instance, and
   cleanup collections.

If transport-session creation fails, no scenario is returned. The error is
`FLOWTRACT_TRANSPORT`.

Auth providers are not created during scenario creation. They initialize lazily
when first selected.

## Option precedence

Precedence is resolved independently per setting.

### Authentication

```text
invocation auth
  → operation auth
  → config defaultAuth
  → false
```

`false` explicitly disables authentication at that level.

### Timeout

```text
invocation timeoutMs
  → operation timeoutMs
  → config timeoutMs
  → 30_000
```

Every resolved timeout is a positive integer. `0`, `Infinity`, negative, and
fractional values fail before transport execution.

### Headers

Operation input headers are the base. Invocation `options.headers` overlay
matching names case-insensitively before request-schema parsing. Authentication
is applied after parsing. An auth provider attempting to replace a
caller-supplied value for the same header or query key fails with
`FLOWTRACT_AUTH`; credential replacement is never silent.

Invocation option headers remain invocation input. If the operation omits a
header schema, supplying any option header fails with
`FLOWTRACT_REQUEST_CONTRACT`. Auth-provider headers are infrastructure material
and are the only Gate 2 exception to the operation header schema.

### TLS

`allowInsecureTls` exists only at project configuration level in Gate 2. It
defaults to `false` and is fixed when the scenario transport session is
created.

## Ordered execution pipeline

For each operation, Flowtract MUST perform this exact sequence:

1. reject a closed scenario or concurrent execution;
2. verify that the exact operation object is registered;
3. resolve auth, timeout, headers, signal, dry-run, and unsafe options;
4. create/setup the selected auth instance, if any;
5. recursively interpolate invocation input and option headers;
6. merge headers case-insensitively;
7. parse request sections through their Zod schemas unless explicitly skipped;
8. render the path and serialize query, headers, and JSON body;
9. allow the selected auth instance to add header/query credentials;
10. produce a redacted request diagnostic;
11. if dry-run, return a redacted `DryRunResult` without target-operation
    transport I/O;
12. execute the transport with the resolved timeout and signal;
13. validate transport output;
14. select the exact response contract, then `default`;
15. decode the response by content type;
16. validate response headers and body through Zod;
17. append an immutable operation summary;
18. return the typed `OperationResult`.

Any failure stops subsequent request/response steps. It does not close the
scenario automatically; the scenario callback may handle an expected failure
and continue. `runScenario` closes after the callback settles.

## Interpolation

Templates use `{{name}}`.

### Resolution rules

- A string consisting only of one reference returns the original state value.
- A reference embedded in other text uses JavaScript `String(value)`.
- Arrays and own enumerable properties of plain objects are resolved
  recursively.
- `Date`, `Map`, `Set`, class instances, functions, symbols, and other exotic
  objects are left as values for contract parsing; Flowtract does not traverse
  them.
- A missing reference raises `FLOWTRACT_INTERPOLATION` with reason `missing`.
- A reference chain may refer to another template-bearing state value.
- A repeated name in the active resolution chain raises reason `cycle`.
- Malformed delimiters raise reason `invalid`.
- Resolution is bounded to 64 nested references and 10,000 visited collection
  nodes per execution. Exceeding either bound raises reason `invalid`.

Interpolation occurs before Zod request parsing so schema coercions,
transformations, defaults, refinements, and validation apply to resolved values.

### Secret taint

When interpolation reads secret state, the destination value/path becomes
secret-tainted:

- a whole-value reference taints the complete destination;
- an embedded reference taints the rendered string;
- taint follows nested arrays and objects;
- transformed request output remains tainted at the containing request section
  unless a narrower mapping can be proven.

Taint is diagnostic metadata only. It is never exposed in operation results.

## Request normalization

### Path

Path parameters come only from parsed `pathParams`. Each value must be a string,
finite number, boolean, or bigint. It is converted with `String`, encoded once
with `encodeURIComponent`, and substituted into the validated `{name}`
placeholder.

The rendered operation path is appended to the normalized `baseURL` path
prefix. Flowtract does not use `new URL(operationPath, baseURL)` semantics that
would silently discard a configured prefix.

An unresolved placeholder, unsupported value, or encoding failure raises
`FLOWTRACT_REQUEST_CONTRACT`.

### Query

The parsed query section must be a plain object. Values may be:

- string, finite number, boolean, or bigint;
- an array of those scalar values, emitted as repeated keys;
- `undefined`, which omits the key;
- `null`, which emits an empty value.

Nested objects, sparse arrays, non-finite numbers, symbols, and functions fail
with `FLOWTRACT_REQUEST_CONTRACT`. Query ordering is deterministic: object key
order, then array order.

### Headers

The parsed header section must be a plain object. Header names are validated
case-insensitively and normalized to lowercase internally. Values may be string,
finite number, or boolean. `undefined` omits the field. Arrays, `null`, CR/LF,
and other values fail with `FLOWTRACT_REQUEST_CONTRACT`.

Duplicate names with different casing collapse according to the documented
precedence. The transport receives one tuple per final request header.

### Body

An omitted or parsed `undefined` body sends no bytes. Every other Gate 2 request
body is JSON serialized and UTF-8 encoded. Flowtract adds
`content-type: application/json` when absent.

JSON serialization failure, `bigint`, cycles, and unsupported values raise
`FLOWTRACT_REQUEST_CONTRACT` before transport execution. A user-supplied
content type incompatible with JSON request encoding raises
`FLOWTRACT_CONFIG`.

## Cancellation and timeout

The invocation signal and resolved timeout are combined:

- an already-aborted signal prevents transport execution;
- caller abort maps to `FLOWTRACT_TRANSPORT` kind `abort`;
- deadline expiry maps to kind `timeout`;
- TLS handshake/certificate failures map to kind `tls`;
- connection, DNS, socket, and redirect failures map to kind `network`;
- unknown adapter failures map to kind `unknown`.

The original adapter error is retained as `cause` but is redacted before any
diagnostic serialization. Timeout/abort does not close the scenario; later
operations may execute if the transport session remains usable.

The Playwright adapter uses `failOnStatusCode: false`, the resolved timeout,
`maxRetries: 0`, `maxRedirects: 20`, the scenario `APIRequestContext`, and TLS
verification unless explicitly disabled. It does not retry. Redirect overflow
maps to transport kind `network`.

After a response arrives, the adapter copies status, final URL, header tuples,
body bytes, and duration, then disposes the Playwright `APIResponse` in a
`finally` path. Scenario close separately disposes the `APIRequestContext`.

## Response selection

Flowtract validates status before contract selection:

1. exact numeric response contract;
2. `default`, if declared;
3. otherwise `FLOWTRACT_UNDECLARED_STATUS`.

HTTP status class has no special success/error behavior. A declared `500`
response is a valid typed result.

## Header normalization and validation

Raw transport headers are normalized to lowercase. Repeated values are joined
with `, ` in arrival order for the Gate 1 public
`Readonly<Record<string, string>>` result shape.

When a response header schema exists, Flowtract parses the normalized complete
header record and returns its Zod output. Otherwise it returns the normalized
record.

`set-cookie` may exist in the result record but is always redacted from
diagnostics. Because the accepted Gate 1 result shape is scalar, Gate 2 does not
promise lossless parsing of multiple `set-cookie` fields; cookie persistence is
owned by the transport session. A future reviewed contract may add a multimap
without changing the transport port.

## Content type and body decoding

- Zero response bytes produce `undefined`, regardless of content type.
- `application/json` and media types ending in `+json` use strict UTF-8 JSON
  decoding and `JSON.parse`.
- `text/*` uses fatal UTF-8 decoding.
- A contract-declared `contentType` is matched case-insensitively against the
  media type without parameters before decoding.
- A missing or unsupported content type with non-empty bytes raises
  `FLOWTRACT_RESPONSE_PARSE`.
- Malformed JSON or invalid UTF-8 raises `FLOWTRACT_RESPONSE_PARSE`.

After decoding, the selected body schema parses the value. The parsed Zod
output—not the raw decoded value—is returned.

Content-type mismatch is `FLOWTRACT_RESPONSE_CONTRACT` with a body issue code
of `content_type`. Body or header Zod failures retain the Gate 1 detail shapes.

## Response previews

Parse/contract errors may contain at most 2 KiB of decoded preview after
redaction. The bound is measured in Unicode code points after decoding. Raw
bytes, full bodies, cookies, and auth headers are never attached.

## Cleanup

`registerCleanup` validates a non-empty label and pushes an action onto the
scenario stack. Registration after close begins fails with `FLOWTRACT_CONFIG`.

Close performs:

1. all registered cleanup actions in reverse registration order;
2. initialized auth-provider disposal in reverse initialization order;
3. transport-session disposal;
4. final redacted diagnostic snapshot;
5. permanent transition to closed.

Every action is attempted even after earlier failures. Failures are normalized
to `{ label, message }` in execution order and aggregated into one
`CleanupError`.

Provider-disposal failures use labels `auth:<profile>`. Transport disposal uses
`transport`. Secret values and nested causes are redacted.

`close()` throws `FLOWTRACT_CLEANUP` only after all disposal attempts finish.
Repeated `close()` calls return the same fulfilled or rejected promise.

## Primary and cleanup failure composition

`runScenario` normalizes non-`Error` thrown values to an `Error`. If its callback
fails:

- cleanup succeeds: rethrow the callback error;
- cleanup fails: attach the `CleanupError` as a non-enumerable, read-only
  `cleanupError` property and rethrow the same callback error object.

This keeps assertion/type checks and the original stack primary while retaining
ordered cleanup evidence. If the primary error object is non-extensible,
Flowtract wraps it in a standard `Error` whose `cause` is the original and whose
`cleanupError` property contains the cleanup failure.

`hasCleanupError` is the public type guard for this attachment. The property is
excluded from ordinary enumeration and error JSON but remains available to
runner adapters and diagnostics after redaction.
