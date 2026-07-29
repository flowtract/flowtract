# Authentication, Secrets, and Diagnostics

## Auth selection and lifecycle

Authentication is selected per execution through the precedence in
[03-execution-and-lifecycle.md](03-execution-and-lifecycle.md).

For each selected profile in a scenario:

1. create one provider instance;
2. run `setup` at most once;
3. run `apply` for every operation using that profile;
4. run `dispose` once when the scenario closes.

Creation and setup are single-flight. Concurrent scenario execution is
disallowed, but provider initialization still guards against re-entry from auth
setup callbacks.

An auth setup operation always executes with `auth: false`. It cannot select
another provider, including through the login operation definition. This
prevents recursive auth graphs and makes session initialization deterministic.

## Authentication collision policy

Credential injection never silently overwrites caller data.

- If the request already contains the auth provider's target header/query key,
  `apply` fails with `FLOWTRACT_AUTH`.
- Header matching is case-insensitive.
- Query matching is exact and case-sensitive.
- Two built-in credentials cannot target the same location in one profile.
- A custom provider receives the same collision-enforcing request facade.

Projects that intentionally send their own credential use `auth: false`.

## Cookies and sessions

Flowtract does not read or copy cookies into scenario state. The default
Playwright `APIRequestContext` owns cookie processing and persistence.

- A session-login response may set one or more cookies.
- Those cookies are sent only by the same scenario's transport session.
- A second scenario starts with an empty cookie jar.
- Closing the scenario disposes the context and its cookies.
- Cookies and `set-cookie` values never appear in default diagnostics.

Custom transports must provide equivalent scenario isolation to conform to the
port.

## Secret state

`setSecret` marks a value as sensitive for the complete scenario lifetime.
Secret classification cannot be downgraded by writing the same name through
`set`.

Secret values:

- are available to interpolation and auth providers;
- are never returned by history or diagnostics;
- are not included in `FlowtractError.toJSON`;
- are removed when the scenario closes;
- remain ordinary JavaScript memory inside the process and are not protected
  against a compromised runtime.

Documentation must not describe in-process storage as encryption or a secrets
vault.

Empty string secrets are rejected because they cannot be redacted safely.

## Built-in redaction

Header matching is case-insensitive. These headers are always protected:

- `authorization`;
- `proxy-authorization`;
- `cookie`;
- `set-cookie`;
- `x-api-key`;
- `x-csrf-token`.

These key names are protected case-insensitively at every object depth:

- `password`;
- `passwd`;
- `secret`;
- `token`;
- `accessToken`;
- `refreshToken`;
- `apiKey`;
- `sessionId`.

Configuration may add protected header names and dot-delimited JSON paths. It
cannot remove built-ins.

The replacement marker is exactly `[REDACTED]`.

## Redaction algorithm

Redaction is applied before a value crosses a diagnostic boundary:

1. structurally clone arrays and plain objects;
2. replace protected header/key/path values;
3. replace secret-tainted interpolation destinations;
4. replace registered non-empty secret string literals inside rendered text;
5. bound string previews;
6. freeze the exposed diagnostic value.

Literal replacement uses longest secret first and escapes regular-expression
metacharacters. It applies to messages, URLs, previews, and normalized nested
causes. Non-string secrets rely on structural/taint redaction and are never
stringified into diagnostics by default.

Redaction MUST be cycle-safe and MUST NOT call user-defined getters,
`toJSON`, or `toString` while traversing arbitrary error details. Unknown
objects are represented by a safe type label.

## URLs

Default diagnostics include method and a redacted URL.

- Userinfo is forbidden in `baseURL`.
- Query values whose key is protected are replaced.
- Query values derived from secret interpolation are replaced.
- Fragments are never sent or logged.
- Other query values may appear only in verbose diagnostics.
- Default diagnostics show origin, path, and query key names without values.

## Error normalization

Transport, provider, callback, and cleanup code may throw any JavaScript value.
Flowtract normalizes external failures without serializing arbitrary objects.

Public errors:

- retain the accepted stable `code`;
- retain safe structured details defined in Gate 1;
- retain the original failure as in-memory `cause` when available;
- exclude `cause`, stacks, request data, and response data from `toJSON`;
- pass their message/details through redaction before diagnostic exposure.

Flowtract does not rewrite user assertion errors returned by `runScenario`,
except for the non-extensible/non-`Error` composition case described in the
lifecycle specification.

## Diagnostic policy

Default events may contain:

- scenario and operation identifiers;
- method;
- redacted URL shape;
- selected auth profile name;
- status and matched contract status;
- duration;
- stable error code;
- lifecycle phase.

Default events MUST NOT contain:

- request or response bodies;
- raw headers;
- cookies;
- provider state;
- ordinary scenario state;
- auth setup inputs;
- cleanup callback values;
- stack traces.

Gate 2 keeps diagnostics in memory. Console reporters, Cucumber attachments,
artifact files, and verbose CLI rendering are later-gate consumers of the same
already-redacted event contract.

## Dry-run security

Dry-run output:

- is marked `dryRun: true`;
- contains method, redacted URL, header names, body presence, timeout, operation
  ID, and auth profile name;
- does not contain raw header/query/body values;
- never calls transport execution;
- may initialize auth because final request construction is being proved;
- still disposes auth and transport resources when the scenario closes.

A dry-run that uses `sessionAuth` may execute the configured login operation
during provider setup. Documentation and the result MUST state this explicitly:
dry-run means the target operation is not sent, not that auth setup is
network-free. Projects requiring zero network I/O use an auth provider whose
setup is network-free or `auth: false`.

## Insecure TLS

`allowInsecureTls: true`:

- is explicit in imported project configuration;
- creates a warning diagnostic for every scenario;
- is present in dry-run metadata as a boolean warning, never as a hidden
  adapter option;
- does not disable response contracts, redaction, or timeouts.

The Gate 2 programmatic API does not require interactive confirmation. Gate 3
`doctor` and CLI presentation own user-facing warnings.

## Security failure conditions

Gate 2 is rejected for any of:

- a credential, cookie, CSRF token, password, or secret-derived value in test
  output, error JSON, diagnostic JSON, or package fixtures;
- shared cookies or auth state between scenarios;
- caller-injected credential overwrite by an auth provider;
- TLS verification disabled by default;
- an unbounded response preview;
- full raw payloads attached to errors;
- automatic retry of a non-idempotent request;
- a test credential committed outside an explicitly fake proof fixture.
