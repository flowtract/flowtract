# Command-Target Feasibility Brief

> **Status:** Non-normative feasibility candidate; implementation is not authorized
> **Dependency:** Revisit only after Gate 3 core production-candidate acceptance

## Strategic question

Flowtract currently verifies stateful REST workflows. A command target could
extend the same contract-oriented model to local executables so projects can
verify CLIs and compose bounded build, release, migration, deployment-check,
or infrastructure-validation workflows.

The candidate position is **contract-verified workflows across APIs and
commands**. Flowtract would validate invocation, exit, output, state,
diagnostics, secrets, cancellation, and cleanup. It would not become a general
CI/CD scheduler or infrastructure orchestrator.

## Candidate use cases

- verify a CLI's arguments, exit codes, stdout, and stderr;
- run a compiler, package, release, or policy check as one workflow operation;
- execute a migration tool and validate its declared outcomes;
- combine HTTP setup/verification with a bounded local command;
- run deployment or infrastructure readiness checks with typed results.

These cases require a later user study and executable prototype. Listing them
does not promise a public API.

## Mandatory safety boundary

Any viable command adapter must:

- spawn with `shell: false`;
- accept an executable and atomic argument array, never an interpolated command
  string;
- reject implicit shell parsing, pipes, redirection, command substitution,
  glob expansion, and shell operators;
- use an explicit controlled working directory;
- construct a bounded environment from reviewed inputs rather than inheriting
  secrets indiscriminately;
- classify environment values as ordinary or secret and redact secret-derived
  stdout, stderr, diagnostics, history, previews, and errors;
- bound stdout/stderr bytes and define overflow behavior before spawning;
- support explicit timeout and caller cancellation;
- terminate the owned process tree and wait for exit before disposal finishes;
- contract exact exit codes with an optional default outcome;
- treat non-zero declared exits as typed results, not transport failures;
- make dry run return a redacted executable/argument/environment description
  without starting a process.

Flowtract must distinguish spawn, missing executable, permission, timeout,
abort, signal exit, output overflow, decode, and unknown failures. Encoding and
line-ending behavior must be explicit and cross-platform.

## Cross-platform proof questions

A future prototype must prove on Windows and POSIX:

- atomic preservation of spaces, quotes, empty arguments, Unicode, and paths;
- executable lookup and explicit-path behavior;
- UTF-8 stdout/stderr decoding and malformed-byte policy;
- cancellation and timeout process-tree termination;
- signal/exit normalization without pretending Windows and POSIX are identical;
- bounded output without pipe deadlock;
- working-directory containment and environment isolation;
- cleanup after spawn, parse, validation, callback, and parent-process failure;
- zero child process, handle, generated file, or secret leakage.

The proof must include a purpose-built fixture executable rather than relying
on shell built-ins whose behavior differs by platform.

## Architecture questions for the later specification

The later gate must decide, with prototype evidence:

- whether HTTP and command operations share one generic target abstraction or
  use separate definitions behind common scenario lifecycle services;
- exact public definition/result types and error taxonomy;
- stdout/stderr schema and transformation model;
- environment, working-directory, executable allowlist, and effect metadata;
- interaction with state interpolation, auth-like credential providers,
  diagnostics, history, dry run, and cleanup;
- package/export placement and whether the adapter is built in or optional.

Names such as `defineCommandOperation` and `CommandTransport` are illustrative
hypotheses only. This brief does not finalize or reserve them.

## Explicit non-goals

The candidate excludes:

- interactive TTYs or prompt automation;
- detached or background services;
- arbitrary shell scripts or command strings;
- SSH, remote agents, or remote command execution;
- container, Kubernetes, Terraform, or Ansible orchestration;
- CI scheduling, secrets management, approvals, or artifact storage;
- automatic rollback or claims that dry run predicts external side effects.

## Promotion gate

Command targeting may enter an implementation gate only after:

- Gate 3 core production-candidate acceptance;
- user evidence that the named use cases are valuable;
- a cross-platform, untracked prototype validates argument and process-tree
  feasibility;
- a dedicated threat model and effect boundary are approved;
- public API, lifecycle integration, package impact, non-goals, and acceptance
  proof are decision-complete in a separate canonical specification.

Until then, no command runtime, production dependency, package export, CLI, or
automation claim is authorized.
