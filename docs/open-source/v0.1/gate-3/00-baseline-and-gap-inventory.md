# Baseline and Gap Inventory

## Accepted baseline

Gate 3 starts from the Gate 2 merge
`cc30efec286c595d185644096fe8a17c0771591d`. PR #9 passed semantic review and
the protected Windows/Ubuntu Node 22/24 matrix.

The accepted root package provides:

- Zod 4 operation definitions with exact/default status result unions;
- immutable runtime configuration and operation-object identity;
- isolated scenarios with state, secrets, auth, history, diagnostics, and
  LIFO cleanup;
- request interpolation, parsing, normalization, dry run, and response
  validation;
- a public HTTP transport port and default Playwright implementation;
- bearer, header/query API key, basic, and project-defined session/CSRF auth;
- secure TLS defaults, timeout and caller-abort distinction, bounded response
  previews, and redacted stable errors;
- dual ESM/CommonJS builds, declarations, declaration maps, and source maps.

The accepted candidate passed:

| Evidence                    | Gate 2 result                                                      |
| --------------------------- | ------------------------------------------------------------------ |
| Tests                       | 94                                                                 |
| Coverage                    | 93.67% statements, 95.71% lines, 94.73% functions, 87.76% branches |
| Package archive             | 80 approved files                                                  |
| TypeScript consumers        | 5.5.4, 6.0.2, and 7.0.2                                            |
| Runtime matrix              | Windows/Ubuntu with Node 22 and 24                                 |
| Production dependency audit | Zero vulnerabilities                                               |
| Branch CodeQL alerts        | Zero open alerts                                                   |
| Repository integrity        | Clean-clone, secret scan, DCO, and Dependency Review passed        |

Gate 2 also proved eight concurrent session-authenticated CRUD scenarios,
unique cookie/CSRF state, cross-scenario denial, cleanup I/O, TLS policy,
timeout/abort behavior, and complete proof-service disposal.

## Evidence levels

Claims use these distinct levels:

1. **Implemented** — behavior exists in source.
2. **Repository proven** — deterministic local and CI tests exercise it.
3. **Core production candidate** — all Gate 3 profiles, operational proofs,
   compatibility checks, and security gates pass on an immutable candidate.
4. **Production ready** — multiple external teams have operated the released
   product for the required period and the support policy has been exercised.

Passing Gate 3 reaches level 3 only for the root core. Percent-complete
estimates and green unit coverage do not substitute for the named evidence.

## Missing evidence

Gate 2 does not yet prove:

- deterministic repeated scheduling of lifecycle races;
- systematic fault injection across every external callback and disposal
  phase;
- property/hostile-input testing with reproducible seeds;
- high-count sequential and concurrent operation stability;
- a long-running soak with resource and heap-trend evidence;
- macOS runtime proof;
- minimum and latest supported Zod/Playwright peer combinations;
- explicit performance regression evidence;
- an executable, comprehensive root-package quick start;
- complete IntelliSense documentation and an actionable error catalog;
- SBOM generation or publish-dry-run evidence;
- external design-partner or sustained production evidence.

These are Gate 3 work. External adoption remains a later gate.

## Bounded implementation debt

The full development audit recorded on 2026-08-02 contains two findings while
the production audit remains zero:

- high `GHSA-mh99-v99m-4gvg` in `brace-expansion <1.1.17` through the
  unsupported ESLint 8 dependency tree;
- low `GHSA-g7r4-m6w7-qqqr` in direct development dependency
  `esbuild >=0.27.3 <0.28.1`.

Gate 3 must migrate the lint stack to ESLint 10.8.0 with the existing
compatible `@typescript-eslint` 8.65.0 line and update direct `esbuild` to
0.28.1. It must then repeat lint, dependency, build, archive, and consumer
proof. These findings affect repository tooling, not the shipped runtime, but
the high finding blocks a production-candidate verdict until removed.

The `flowtract` package also declares an unused optional Cucumber peer while no
Cucumber export exists. Gate 3 must remove that peer and prove that the root
runtime remains installable and executable without Cucumber.

Neither cleanup authorizes a production dependency or a new public export.

## Baseline preservation

Before runtime implementation, the approved revision must be reproduced from
a clean checkout. The implementation branch must record test, coverage,
archive, compiler, package, audit, and repository-integrity results. Tests and
proofs use temporary or in-memory state and leave no tracked mutation.
