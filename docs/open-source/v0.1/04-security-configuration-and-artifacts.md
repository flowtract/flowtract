# Security, Configuration, and Artifacts

## Configuration surface

`flowtract.config.ts` is the canonical project configuration:

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
  cucumber: {
    features: ['features/**/*.feature'],
    parallel: 1
  },
  redaction: {
    jsonPaths: ['password', 'token', 'secret']
  },
  artifacts: {
    directory: 'flowtract-results'
  }
});
```

Flowtract MUST NOT auto-load magic credentials or provide fallback usernames
and passwords. A project may load an environment file through the CLI or use
`process.env` explicitly in configuration.

Configuration is validated before test execution. Unknown operation IDs,
duplicate IDs, invalid paths, missing response contracts, unknown auth
profiles, non-positive timeouts, and unwritable artifact targets fail with
`FLOWTRACT_CONFIG`.

## Secure transport defaults

- TLS certificate verification is enabled.
- Insecure TLS requires `allowInsecureTls: true`.
- `flowtract doctor` reports insecure TLS as a warning.
- Redirect behavior uses the transport's safe default and remains bounded.
- Timeouts default to 30 seconds; `0` is rejected instead of disabling timeout.
- HTTP statuses do not throw at the transport layer.
- No request retry occurs automatically.

## Secret sources

Secrets may come from:

- explicit environment lookups in project configuration;
- a user-provided async secret function;
- authentication provider output stored via `setSecret`.

Secrets MUST NOT be accepted as committed example defaults. Generated projects
include only placeholder names in `.env.example`; `.env` is ignored.

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

- console output;
- structured diagnostics;
- dry-run output;
- Cucumber attachments;
- errors and nested causes;
- request/response previews;
- generated reports.

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

## cURL import security

`flowtract schema from-curl`:

- accepts stdin or an explicit input file;
- emits generated source to stdout by default;
- writes only when `--output` is supplied;
- never executes the cURL command;
- strips authorization, cookies, API keys, and CSRF values;
- generates environment placeholders for detected credentials;
- safely escapes TypeScript identifiers and string literals;
- reports unsupported syntax without guessing.

## Artifacts

The default artifact layout is:

```text
flowtract-results/
├── summary.json
├── cucumber-messages.ndjson
├── junit.xml
├── report.html
└── diagnostics/
```

`summary.json` has a `schemaVersion` beginning at `1`. It contains run timing,
scenario outcomes, operation counts, contract outcomes, and stable error codes.
It excludes raw secrets and full request/response bodies.

Diagnostic events also have a schema version and include timestamp, scenario,
operation ID, phase, duration, status, error code, and redacted preview when
enabled.

Cucumber message, JUnit, and HTML output use maintained Cucumber formatters.
Reports never open a browser automatically. HAR is outside `0.1.0`.

## Supply-chain requirements

- The npm lockfile is committed.
- CI uses `npm ci`.
- Direct dependencies use maintained supported major versions.
- Critical/high audit findings fail a release unless an exception identifies
  owner, affected path, mitigation, and expiry date.
- Packages publish with npm provenance/trusted publishing.
- Release archives contain only declared package files.
- Generated packages undergo license and package-content inspection.

## Telemetry and privacy

Flowtract collects no telemetry in `0.1.0`. It makes no network requests other
than requests explicitly made by tests, npm/package operations initiated by
the user, and optional Cucumber behavior explicitly enabled by the project.
