# TypeScript Configuration Loader Proof

## Decision

Gate 3 uses the documented `tsImport` export from `tsx/esm/api` to import
TypeScript project configuration. `tsx` becomes a direct production dependency
of the `flowtract` package with compatible range `^4.23.1`.

This decision applies only to trusted project configuration and its trusted
imports. It does not make untrusted TypeScript execution safe or sandboxed.

## Evidence recorded 2026-08-02

The npm registry reports for `tsx@4.23.1`:

- MIT license;
- Node engine `>=18.0.0`, which includes Flowtract's Node 22/24 support;
- public conditional export `./esm/api` for import and require consumers;
- public type declarations exporting `tsImport(specifier, options)`;
- direct dependency `esbuild ~0.28.0`.

An isolated untracked proof installed `tsx@4.23.1` with scripts disabled. A
TypeScript config imported a sibling TypeScript operation module and returned
an async default factory. Both consumers succeeded through the public API:

```text
node load.mjs
{"operationId":"spike.operation","loaded":true}

node load.cjs
{"operationId":"spike.operation","loaded":true}
```

The CommonJS consumer used `require('tsx/esm/api')`; the package's reviewed
conditional export selected its CommonJS implementation. Neither proof used a
Node loader flag, `require.extensions`, a private path, source rewriting, or a
child process.

## Required implementation constraints

- Import only `tsx/esm/api` and call `tsImport`; no default loader import.
- Resolve the selected config to an absolute file URL before import.
- Set `parentURL` explicitly to that config URL.
- Pass the project-root `tsconfig.json` when present and validated under the
  root; otherwise pass `tsconfig: false`.
- Invoke a default config factory exactly once.
- Do not retry a failed import or fall back to another config file.
- Normalize import and factory failures to redacted `FLOWTRACT_CONFIG` output.
- Prove `.ts`, `.mts`, `.cts`, `.js`, `.mjs`, and `.cjs` from packed ESM and
  CommonJS CLI consumers on Windows/Ubuntu Node 22/24.
- Treat `tsx` and transitive `esbuild` updates as dependency-review events;
  archive, license, audit, CodeQL, and clean-clone proof remain mandatory.

The proof is sufficient for specification selection. Production acceptance
still requires the full cross-platform matrix; this document is not runtime
acceptance evidence.
