# Gate 3 CLI, Generator, and Process Model

## CLI grammar

```text
flowtract [global options] <command>

flowtract init [directory] [--template programmatic|cucumber] [--yes] [--force]
flowtract test [feature paths...] [--tags expression] [--parallel n]
               [--retry n] [--fail-fast] [--reporter name]
               [--output directory]
flowtract doctor
flowtract operations list
flowtract schema from-curl [--input file] [--output file] [--force]

global: --config file --env-file file --log-level level --json --no-color
```

Unknown commands/options, duplicates of scalar options, invalid numbers, and
conflicting flags fail with exit `2`. Log level is one of `error`, `warn`,
`info`, or `debug`. Reporter is one of `progress`, `summary`, `messages`,
`junit`, or `html`; Gate 3 has no reporter plugin lookup. `--json` disables
color and progress output. `--help` and `--version` do not load configuration.

## Output contract

JSON mode writes exactly one UTF-8 JSON value plus newline to stdout:

```ts
interface CliEnvelope {
  readonly schemaVersion: 1;
  readonly ok: boolean;
  readonly command: string;
  readonly data?: unknown;
  readonly errors: readonly {
    readonly code: string;
    readonly message: string;
    readonly operationId?: string;
    readonly details?: unknown;
  }[];
}
```

The envelope is structurally redacted before serialization. It contains no
stack, cause, raw header/body, environment value, cookie, secret state, or
unbounded preview. stdout contains no other text. Human output and warnings use
stderr; help/version use stdout in non-JSON mode.

Exit codes are stable:

| Code | Meaning                                         |
| ---: | ----------------------------------------------- |
|    0 | Success                                         |
|    1 | Test or operation failure                       |
|    2 | CLI usage error                                 |
|    3 | Configuration or doctor failure                 |
|    4 | Dependency/runtime incompatibility              |
|    5 | Internal Flowtract defect                       |
|  130 | Interrupted by SIGINT or Windows console cancel |
|  143 | Terminated by SIGTERM                           |

When multiple conditions occur, interruption `130`/`143` is primary, test
failure `1` remains primary over cleanup or artifact evidence,
usage/config/dependency errors prevent test start, and an unexpected internal
defect uses `5`.

## Command behavior

### `doctor`

Doctor validates Node/npm compatibility, configuration selection/import,
operation identity and auth references, optional peer compatibility, feature
and support globs, artifact destination safety/writability, insecure TLS, unsafe
validation settings, package/module mode, and child-process launch capability.
Checks have stable IDs and `pass`, `warn`, or `fail`; warnings do not change exit
`0`. Doctor never sends project HTTP requests or creates scenario transports.

### `operations list`

Lists operation ID, method, path, auth selection, timeout, and sorted declared
statuses. It does not instantiate auth or transport. Human output is sorted by
operation ID; JSON data uses the same stable order. Source location is omitted
unless future explicit operation metadata supplies it.

### `test`

Test validates everything before workers launch, resolves feature overrides
under project root, and forwards only reviewed Cucumber options. The parent
owns artifacts and exit selection. Worker protocol messages are length-framed
JSON with schema version and maximum size; arbitrary worker stdout is never
parsed as protocol.

On termination, the parent stops accepting new work, signals all workers,
waits up to five seconds, force-terminates remaining owned process trees, waits
again, finalizes a cancellation summary when possible, and exits `130` for
SIGINT/Windows console cancel or `143` for SIGTERM. Tests assert no child,
handle, pipe, socket, or staging directory remains.

### `schema from-curl`

Input comes from stdin or one `--input` file, never both. The command parses one
HTTP(S) cURL invocation without executing a shell or command. Supported input
is method, URL, repeated headers, `--data`/`--data-raw`, and basic auth.
Unsupported shell expansion, command substitution, file upload, multipart,
proxy, certificates, config files, globbing, multiple URLs, or non-HTTP schemes
fails without partial output.

Authorization, cookies, API keys, CSRF, and basic credentials become named
environment placeholders and are never copied into generated source. Output is
formatted TypeScript for one unregistered operation draft. stdout is default;
`--output` uses the same safe atomic write rules and never overwrites without
`--force`.

## Generator behavior

`flowtract init` and `create-flowtract` call one shared generator service. The
default template is `programmatic`; `cucumber` is explicit. Interactive prompts
are used only on a TTY without `--yes`. Non-interactive ambiguity fails with
exit `2`.

The generator:

- accepts a new directory or an existing empty directory;
- treats ignored files as real content when deciding whether a directory is
  empty;
- rejects filesystem roots, home directories, workspace roots, `.` without
  explicit confirmation, symlink/reparse destinations, and escaping paths;
- stages a complete manifest, verifies every relative path, then renames;
- does not run package managers, scripts, Git, browsers, or network requests;
- emits deterministic UTF-8/LF content except the generated project name;
- includes `.env.example` placeholders and ignores `.env` and artifacts;
- includes exact test, type-check, doctor, and clean commands;
- includes one operation, status contracts, programmatic scenario, cleanup,
  and—when selected—one feature plus domain wrapper.

Without `--force`, any target collision fails before writing. With `--force`,
only files listed in the reviewed template manifest may be replaced; unknown
files and directories are preserved, replacement paths are shown or returned
in JSON, and each replaced file is backed up until the transaction commits.

Generated dependency ranges are derived from the executing package's declared
compatible versions. Clean package proof substitutes the packed candidate
tarball without editing the committed template.
