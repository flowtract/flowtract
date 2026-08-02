# Gate 3 — Cucumber and CLI

> **Status:** Draft specification; implementation is not authorized
> **Baseline:** Gate 2 merge `cc30efec286c595d185644096fe8a17c0771591d`
> **Target:** Optional Cucumber integration and a safe, deterministic project CLI

Gate 3 turns the accepted runner-neutral execution runtime into a usable
project workflow. It adds explicit configuration discovery, Cucumber lifecycle
integration, a focused CLI, starter generation, testing utilities, redacted
artifacts, and cross-platform process proof.

This package is normative for Gate 3 after repository-owner approval. Until
then it is a review draft. No runtime, package-export, CLI, or generator work
may begin from this draft.

## Documents

1. [TypeScript configuration loader proof](00-typescript-loader-proof.md)
2. [Architecture and boundaries](01-architecture-and-boundaries.md)
3. [Public contracts and configuration](02-public-contracts-and-configuration.md)
4. [Cucumber lifecycle and artifacts](03-cucumber-lifecycle-and-artifacts.md)
5. [CLI, generator, and process model](04-cli-generator-and-process-model.md)
6. [Proof, implementation slices, and approval](05-proof-implementation-and-approval.md)

## Gate 3 completion boundary

Gate 3 is complete only when:

- the specification revision is approved before implementation;
- `flowtract/cucumber` and `flowtract/testing` expose only reviewed symbols;
- configuration loading is deterministic and executes only the selected
  project configuration;
- every Cucumber scenario owns exactly one Flowtract scenario and always
  closes it;
- CLI human and JSON contracts, exit codes, stdout/stderr separation, signal
  forwarding, and child termination are proven on Windows and Ubuntu;
- generator writes are symlink-safe, bounded, deterministic, and never
  overwrite without explicit authorization;
- all artifacts and attachments are already redacted and schema-versioned;
- packed ESM/CommonJS and optional-peer consumers pass;
- a fresh user can scaffold and run both programmatic and Cucumber examples on
  Windows and Ubuntu in under ten minutes;
- Gate 1 and Gate 2 contracts remain green;
- no unresolved correctness, security, portability, packaging, or
  documentation blocker remains.

## Explicit non-goals

Gate 3 does not include npm publication, documentation-site deployment,
design-partner beta claims, OpenAPI import, retries outside Cucumber scenario
retry, custom reporter plugin APIs, HAR capture, browser UI testing, additional
protocols, hosted execution, telemetry, or a production-readiness claim.
