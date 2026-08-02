# Gate 3 Public Contracts and Configuration

> **Status:** Deferred design; non-normative and not authorized

The types and package subpaths below are design hypotheses only. They are not
part of Gate 3 or the `0.1` root-package compatibility promise.

## Package surfaces

Gate 3 retains every accepted root export and adds only reviewed configuration
types to the root. It adds two explicit subpaths:

```json
{
  ".": "accepted Gate 2 root plus Gate 3 config types",
  "./cucumber": "explicit Cucumber adapter",
  "./testing": "deterministic public test utilities"
}
```

There are no other subpaths or supported deep imports. The CLI binary is named
`flowtract`; the generator binary and package are named `create-flowtract`.

## Additive root configuration

Gate 3 adds these fields to `FlowtractConfig`:

```ts
interface FlowtractConfig {
  readonly cucumber?: CucumberConfig;
  readonly artifacts?: ArtifactConfig;
}

interface CucumberConfig {
  readonly features?: readonly string[];
  readonly support?: readonly string[];
  readonly tags?: string;
  readonly parallel?: number;
  readonly retry?: number;
  readonly failFast?: boolean;
}

interface ArtifactConfig {
  readonly directory?: string;
  readonly messages?: boolean;
  readonly junit?: boolean;
  readonly html?: boolean;
  readonly diagnostics?: boolean;
}
```

Defaults are:

- features: `features/**/*.feature`;
- support: `features/**/*.ts` excluding generated feature files;
- tags: no filter;
- parallel: `1`;
- retry: `0`;
- fail-fast: `false`;
- artifact directory: `<projectRoot>/flowtract-results`;
- messages, JUnit, HTML, and diagnostics: enabled for `flowtract test` unless a
  command-line reporter override explicitly narrows outputs.

Project root is not caller-configurable: it is the canonical directory
containing the selected configuration file. This prevents configuration code
from broadening filesystem authority after selection.

Parallel and retry accept integers from `0` through `64`, except parallel must
be at least `1`. Feature and support patterns must be non-empty relative glob
patterns without NUL, absolute roots, or `..` segments. Artifact directories
must remain under project root. Flowtract-owned arrays and objects are copied
and frozen without freezing callbacks, schemas, transports, or providers.

## Configuration discovery

Without `--config`, the CLI examines only its explicit working directory for
these names in order:

1. `flowtract.config.ts`
2. `flowtract.config.mts`
3. `flowtract.config.cts`
4. `flowtract.config.js`
5. `flowtract.config.mjs`
6. `flowtract.config.cjs`

Zero matches is a configuration error. More than one match is an ambiguity
error; priority never silently chooses between files. `--config` accepts one
explicit file relative to the working directory. Directories, URLs, stdin,
package-name resolution, and upward parent-directory search are unsupported.

The module must have exactly one usable default export: a value accepted by
`defineConfig`, or a zero-argument sync/async factory returning that value.
Named exports are ignored. A factory is invoked exactly once per process.

TypeScript configuration loading uses `tsImport` from the documented public
`tsx/esm/api` export. Gate 3 adds `tsx ^4.23.1` as a direct production
dependency. The selection evidence and constraints are recorded in the
[loader proof](00-typescript-loader-proof.md).

The loader resolves the selected config to an absolute file URL, supplies that
URL as `parentURL`, and passes a validated project-root `tsconfig.json` when it
exists or `tsconfig: false` otherwise. Node loader flags, `require.extensions`,
temporary source rewriting, private paths, and undocumented compiler hooks are
prohibited.

## Environment-file semantics

`--env-file <path>` is CLI-only. The file is resolved under project root and
parsed before configuration import. Existing process environment values win;
the file supplies only missing names. Duplicate file names use the last value
within the file and produce a warning.

The loader rejects malformed names, NUL, invalid UTF-8, files above 1 MiB, and
the process-control names `NODE_OPTIONS`, `NODE_PATH`, `PATH`, `PATHEXT`,
`ComSpec`, and `SHELL`, compared case-insensitively. Values are never emitted in
diagnostics or JSON. The environment is scoped to the command process and its
owned workers; Flowtract does not mutate a caller's environment through a
programmatic API.

## `flowtract/cucumber`

The subpath exports:

```ts
interface AttachmentPolicy {
  readonly diagnostics?: 'never' | 'failed' | 'always';
  readonly maxBytes?: number;
}

interface FlowtractWorld {
  readonly flowtract: FlowtractScenario;
  readonly lastResult: unknown;
  setLastResult(result: unknown): void;
}

interface FlowtractSupportOptions {
  readonly runtime: FlowtractRuntime;
  readonly operations: readonly OperationDefinition[];
  readonly defaultAuth?: string | false;
  readonly attachmentPolicy?: AttachmentPolicy;
}

function createFlowtractWorld(options: FlowtractSupportOptions): CucumberWorldConstructor;
function installFlowtractSupport(options: FlowtractSupportOptions): void;
function registerFlowtractSteps(): void;
function attachFlowtractDiagnostics(world: FlowtractWorld): Promise<void>;
```

The final declarations use public Cucumber types only. `lastResult` remains
`unknown` because a World may execute heterogeneous operations; generic and
domain steps narrow through the operation registry at runtime rather than
publishing `any`. Gate 3 supports the optional Cucumber peer range `^13.0.0`.

Diagnostics attachment defaults to `failed`; `maxBytes` defaults to 256 KiB
and accepts integers from 0 through 256 KiB. `0` disables diagnostic attachment
content without disabling cleanup or lifecycle checks.

Calling an installer twice in one support-library instance is a configuration
error. Import alone does nothing. `installFlowtractSupport` installs the World,
the lifecycle hooks, and diagnostics attachment; generic steps require the
separate explicit call.

## `flowtract/testing`

The subpath exports:

```ts
type MemoryResponder = (
  request: TransportRequest,
  context: { readonly requestIndex: number; readonly sessionId: string }
) => MaybePromise<TransportResponse | TransportResponseInput>;

interface MemoryTransportOptions {
  readonly responses?: readonly TransportResponseInput[];
  readonly responder?: MemoryResponder;
}

interface TransportResponseInput {
  readonly status: number;
  readonly headers?: readonly TransportHeader[];
  readonly json?: unknown;
  readonly text?: string;
  readonly body?: Uint8Array;
  readonly url?: string;
  readonly durationMs?: number;
}

interface MemoryTransport extends HttpTransport {
  readonly requests: readonly TransportRequest[];
  readonly stats: {
    readonly sessionsCreated: number;
    readonly sessionsDisposed: number;
    readonly responsesCreated: number;
  };
  enqueue(response: TransportResponseInput): void;
}

interface ScenarioHarness {
  readonly runtime: FlowtractRuntime;
  readonly scenario: FlowtractScenario;
  close(): Promise<void>;
}

function createMemoryTransport(options?: MemoryTransportOptions): MemoryTransport;
function transportResponse(input: TransportResponseInput): TransportResponse;
function createScenarioHarness(config: FlowtractConfig): Promise<ScenarioHarness>;
function assertRedacted(value: unknown, forbidden: readonly string[]): void;
```

`responses` and `responder` are mutually exclusive. A depleted response queue
fails rather than inventing a success. `json`, `text`, and `body` are mutually
exclusive; JSON serialization and default content type use the Gate 2 rules.
The memory transport records immutable copied requests and exposes deterministic
session/response/disposal counters. It does not expose private runtime classes
or bypass operation identity, authentication, response contracts, cleanup, or
redaction.
