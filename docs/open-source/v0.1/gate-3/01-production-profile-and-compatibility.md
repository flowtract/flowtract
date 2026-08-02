# Production Profile and Compatibility

## Supported profiles

The Gate 3 production-candidate matrix is release-blocking:

| Platform | Node.js | Purpose                                        |
| -------- | ------- | ---------------------------------------------- |
| Ubuntu   | 22, 24  | Runtime, package, integration, and clean clone |
| Windows  | 22, 24  | Runtime, process, package, and clean clone     |
| macOS    | 24      | Runtime, package, and transport portability    |

npm 10 or later is supported within the selected Node lines. Current Node and
other operating systems are unproven unless promoted through a specification
amendment.

Declaration consumers must pass with TypeScript 5.5.4, 6.0.2, and 7.0.2.
Packed runtime consumers must pass with both the minimum and latest supported
Zod 4 and Playwright versions. The minimums remain Zod 4.0.0 and Playwright
1.62.0 unless proof demonstrates a required correction before approval.

## Package and module contract

The `flowtract` package remains:

- one root conditional export;
- dual ESM and CommonJS;
- side-effect free;
- Node 22 targeted;
- explicit about packed files;
- shipped with declarations, declaration maps, runtime source maps, license,
  notice, and package README.

Installed ESM JavaScript, CommonJS JavaScript, TypeScript ESM, and TypeScript
CommonJS consumers must compile and execute a real scenario from the tarball.
No consumer may import source paths or undeclared deep exports.

The public export snapshot is the Gate 2 root snapshot. Stress, fault,
conformance, leak, and benchmark helpers remain private test infrastructure.

## `0.1` compatibility promise

Flowtract follows these pre-1.0 rules after a public `0.1.0` exists:

- patch releases preserve documented public behavior and type compatibility;
- a minor release may make a documented breaking change only with migration
  guidance and a deprecation assessment;
- removals require at least one prior minor release of deprecation unless an
  active security issue makes that unsafe;
- accepted error codes and phase literals are public compatibility surfaces;
- `FlowtractError.toJSON()` and `DiagnosticEvent` field meanings are
  schema contracts even though additive optional fields may be introduced;
- diagnostic redaction may become stricter without deprecation;
- security defaults may become stricter with a documented migration note;
- property order, error message prose, timings, generated scenario IDs, and
  undocumented implementation classes are not compatibility contracts;
- undocumented deep imports receive no compatibility guarantee.

Before publication, Gate 3 uses these rules as a change-control discipline,
not as a claim that a public release already exists.

## Public-contract freeze

Gate 3 adds no root symbol or subpath. Existing operation input/output parsing,
status discrimination, auth precedence, timeout precedence, dry-run behavior,
cleanup error attachment, transport port, and state classification remain
compatible.

If implementation reveals that correctness requires a public change, work
stops. The specification must describe the exact type/runtime change,
migration impact, and proof, and the repository owner must approve the amended
revision before coding resumes.

## Dependency policy

Gate 3 adds no production dependency. A new development-only test dependency
requires license, maintenance, install-script, transitive-risk, audit, archive,
and clean-clone review. Deterministic in-repository generators are preferred
when they can provide replayable hostile cases without reducing coverage.

The unused optional Cucumber peer is removed during implementation. The
development `esbuild` range is advanced to a patched release and verified
through the complete package proof. Zod and Playwright remain peer dependencies
and project-owned instances remain outside Flowtract freezing/ownership.

## Claim discipline

Gate 3 may record `Core production-candidate proof: Passed` only on the exact
accepted candidate. The package and project continue to say unpublished and
not production ready. A product-level production-ready claim requires at least
three external teams operating Flowtract in production for 90 days, no open
major correctness/security blocker, and an exercised support and compatibility
policy.
