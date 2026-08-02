# Security, Configuration, and Artifacts

## Configuration surface

Programmatic `defineConfig` input is the canonical Gate 3 configuration:

```ts
export default defineConfig({
  baseURL: process.env.API_BASE_URL,
  operations: [Login, CreatePart, GetPart],
  transport: playwrightTransport({
    timeoutMs: 30_000
  }),
  auth: {
    session: sessionAuth({
      // project-owned login and extraction behavior
    })
  },
  redaction: {
    jsonPaths: ['password', 'token', 'secret']
  }
});
```

Flowtract MUST NOT auto-load configuration, magic credentials, or fallback
usernames/passwords. A project passes programmatic configuration explicitly
and may read `process.env` in project-owned code.

Configuration is validated before test execution. Unknown operation IDs,
duplicate IDs, invalid paths, missing response contracts, unknown auth
profiles, invalid redaction settings, and non-positive timeouts fail with
`FLOWTRACT_CONFIG`.

## Secure transport defaults

- TLS certificate verification is enabled.
- Insecure TLS requires `allowInsecureTls: true`.
- diagnostics report explicit insecure TLS as a warning.
- Redirect behavior uses the transport's safe default and remains bounded.
- Timeouts default to 30 seconds; `0` is rejected instead of disabling timeout.
- HTTP statuses do not throw at the transport layer.
- No request retry occurs automatically.

## Secret sources

Secrets may come from:

- explicit environment lookups in project configuration;
- a user-provided async secret function;
- authentication provider output stored via `setSecret`.

Secrets MUST NOT be accepted as committed example defaults. Documentation uses
generated placeholders and never embeds working credentials.

## Redaction

Header matching is case-insensitive. The default protected headers are:

- `authorization`;
- `proxy-authorization`;
- `cookie`;
- `set-cookie`;
- `x-api-key`;
- `x-csrf-token`.

Default protected key names include `password`, `passwd`, `secret`, `token`,
`accessToken`, `refreshToken`, `apiKey`, and `sessionId`. Projects may add
header names and JSON paths but may not remove built-in protections.

Redaction applies to:

- structured diagnostics;
- dry-run output;
- errors and nested causes;
- request/response previews.

Redaction uses the literal string `[REDACTED]`. Secret state values are redacted
by identity even if their key name is not in the default list.

## Logging

Default logging includes operation ID, method, redacted URL, status, duration,
and contract outcome. Bodies and request headers are omitted.

Verbose logging MAY include bounded request/response previews after redaction.
It MUST NOT weaken redaction. Debug mode is a verbosity choice, not a security
bypass.

## Response parsing

Parsing uses content type:

- JSON and `+json` → strict JSON parsing;
- text media types → UTF-8 text;
- empty body → `undefined`;
- unsupported binary media types → configuration/runtime error in `0.1.0`.

Parse errors include at most a configurable bounded preview, default 2 KiB,
after redaction. Full raw payloads are never attached automatically.

## Deferred import and artifact behavior

cURL import, configuration-file loading, Cucumber attachments, report files,
and artifact schemas are future design. Gate 3 keeps immutable already-redacted
diagnostics in memory and adds no file writer or reporter surface.

## Supply-chain requirements

- The npm lockfile is committed.
- CI uses `npm ci`.
- Direct dependencies use maintained supported major versions.
- Critical/high audit findings fail a release unless an exception identifies
  owner, affected path, mitigation, and expiry date.
- A later publication uses npm provenance/trusted publishing.
- Release archives contain only declared package files.
- Generated packages undergo license and package-content inspection.

## Telemetry and privacy

Flowtract collects no telemetry in `0.1.0`. It makes no network requests other
than requests explicitly made by tests and npm/package operations initiated by
the user.
