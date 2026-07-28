# Packaging, CLI, and Cucumber

## Repository layout

The repository uses npm workspaces with two publishable packages:

```text
packages/
├── flowtract/
└── create-flowtract/
examples/
├── quickstart/
└── enterprise-session-csrf/
```

Tests, documentation, and examples are private workspaces. Gate 2 creates a new
temporary in-memory authenticated CRUD service for runtime proof; the archived
prototype mock is not copied into the public repository.

## `flowtract` package

Package requirements:

- package name `flowtract`;
- version `0.1.0` at public preview;
- Apache-2.0;
- Node engine `^22.0.0 || ^24.0.0`;
- dual ESM/CommonJS conditional exports;
- declaration files and declaration maps;
- source maps;
- explicit `files`;
- executable `flowtract` binary;
- side effects disabled except CLI/support registration entry points.

Public exports are limited to:

```json
{
  ".": "...",
  "./cucumber": "...",
  "./testing": "..."
}
```

Deep imports are unsupported. An export-surface contract test fails when
unreviewed symbols become public.

Zod 4 and Playwright are peer dependencies and development dependencies.
Cucumber is an optional peer dependency used only by `flowtract/cucumber` and
`flowtract test`.

Gate 1 uses TypeScript 7 for source checking and declaration emission. Tools
that still require the compiler API use the official TypeScript 6 compatibility
package. Consumer declarations are checked with TypeScript 5.5, 6.0, and 7.0.
Node 22 and 24 are the only release-blocking runtime lines for `0.1`.

## `create-flowtract` package

`create-flowtract` creates a project in a new or explicitly confirmed empty
directory. It supports interactive prompts and deterministic flags for CI:

```text
npm create flowtract@latest my-api-tests
npx create-flowtract my-api-tests --template cucumber --yes
```

The generated project includes:

- typed Flowtract configuration;
- one operation and status-specific contracts;
- one programmatic test;
- one Cucumber feature and domain wrapper step;
- `.env.example` without credentials;
- scripts for test, type-check, and doctor;
- a short README with exact next commands.

The generator does not overwrite files without `--force`, and `--force`
requires an explicit non-interactive flag or interactive confirmation.

## CLI contract

The `flowtract` binary exposes:

```text
flowtract init
flowtract test [feature paths]
flowtract doctor [--json]
flowtract operations list [--json]
flowtract schema from-curl
```

Global options include `--config`, `--env-file`, `--log-level`, `--json`, and
`--no-color`.

### Exit codes

| Code | Meaning                            |
| ---: | ---------------------------------- |
|    0 | Success                            |
|    1 | Test or operation failure          |
|    2 | CLI usage error                    |
|    3 | Configuration/doctor failure       |
|    4 | Dependency/runtime incompatibility |
|    5 | Internal Flowtract defect          |

JSON mode emits one stable envelope with `schemaVersion`, `ok`, `command`,
`data`, and `errors`. Human diagnostics go to stderr; machine output goes to
stdout.

### `init`

Initializes the current directory using the same templates and safety checks as
`create-flowtract`.

### `test`

Supports:

- feature path overrides;
- `--tags`;
- `--parallel`;
- `--env-file`;
- output directory;
- reporter selection;
- fail-fast;
- Cucumber scenario retry.

It loads configuration once per worker, validates operation IDs, uses child
process argument arrays, forwards termination signals, and waits for children
to exit. Windows and POSIX process handling have contract tests.

### `doctor`

Checks:

- supported Node version;
- configuration loading and validation;
- required and optional peer dependencies;
- unique operation IDs;
- auth profile references;
- artifact directory writability;
- insecure TLS;
- unsafe request-validation defaults;
- supported package/module mode.

### `operations list`

Lists ID, method, path, auth profile, declared statuses, and source location
when available. JSON mode is stable and secret-free.

### `schema from-curl`

Generates an operation draft using the security rules in the security
specification. It does not auto-register or silently edit project files.

## Cucumber adapter

`flowtract/cucumber` exports:

- `createFlowtractWorld`;
- `installFlowtractSupport`;
- `registerFlowtractSteps`;
- `FlowtractWorld` types;
- attachment/report helpers.

Each Cucumber scenario creates a fresh `FlowtractScenario` in `Before` and
closes it in `After`. Cleanup and transport disposal run even when a step,
hook, or attachment fails.

The adapter uses modern Cucumber import/configuration mechanisms and supports
parallel workers. It does not own or discover user features outside paths
declared in configuration.

## Generic onboarding vocabulary

The adapter provides steps equivalent to:

```gherkin
Given I use auth profile "session"
When I execute operation "parts.create" with body:
Then the response status should be 201
Then I capture response field "id" as "partId"
Then the response field "name" should equal "Engine"
```

File payloads are resolved against a configured project root and cannot escape
that root unless explicitly allowed.

Negative request testing uses a visibly unsafe step variant and skips request
validation only for that execution.

Generic steps exist for onboarding and low-ceremony tests. Documentation MUST
teach domain wrappers for durable suites:

```gherkin
When I release the engineering change
Then the change should be active
```

Domain steps call the same registered operations and client API; they do not
create a second execution model.

## Testing utilities

`flowtract/testing` exports:

- an in-memory `HttpTransport`;
- deterministic transport response builders;
- scenario/test factories;
- diagnostic and redaction assertions;
- package-consumer fixtures intended for extension authors.

It does not export private runtime internals.
