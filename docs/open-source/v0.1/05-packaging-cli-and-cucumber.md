# Packaging and Deferred Adapters/Tooling

> **Current status:** Root package only
> **Deferred:** Cucumber, project CLI, generator, and public testing utilities

## Current package

The repository uses npm workspaces. Only `packages/flowtract` is an implemented
runtime package. It remains private until a separately authorized publication
action.

The package contract is:

- package name `flowtract`;
- Apache-2.0;
- Node engine `^22.0.0 || ^24.0.0`;
- one root conditional export;
- dual ESM/CommonJS runtime files;
- ESM/CommonJS declarations and declaration maps;
- runtime source maps;
- explicit archive files;
- `sideEffects: false`;
- no binary and no supported deep import.

Zod 4 and Playwright are peers and development dependencies. The unused
optional Cucumber peer is removed during Gate 3 core hardening. Gate 3 adds no
production dependency.

The installed-package proof compiles and executes ESM JavaScript, CommonJS
JavaScript, TypeScript ESM, and TypeScript CommonJS consumers from the tarball.
Declarations are checked with TypeScript 5.5.4, 6.0.2, and 7.0.2. Gate 3 also
proves minimum/latest supported Zod and Playwright peer combinations.

## Deferred surfaces

The following are not part of Gate 3 or the `0.1` root-package compatibility
promise:

- `flowtract/cucumber`;
- `flowtract/testing`;
- a `flowtract` binary;
- `create-flowtract` publication;
- configuration discovery/loading;
- Cucumber World/hooks/steps/attachments;
- artifact or reporter files;
- cURL import;
- generator templates and overwrite behavior.

The original proposal is retained as
[non-normative future design](../future/cucumber-cli/README.md). It must be
revalidated against the accepted core and receive a separate specification,
threat review, public API review, implementation plan, and proof before work
begins.

## Command targeting

Executing local commands is a different target/backend concern, not the
project CLI frontend described above. Its
[feasibility brief](../future/command-target/README.md) is non-authorizing and
does not add an API, transport, package, or automation claim.

## Packaging safety

Every archive is allowlisted and inspected with `publint` and Are the Types
Wrong. Proof services, tests, caches, generated reports, SBOM files, future
design documents, secrets, and repository metadata must not ship.

Publication requires a later explicit authorization, trusted publishing,
provenance, release notes, changelog, limitations, and validation of the
published artifact. Gate 3 package proof does not publish anything.
