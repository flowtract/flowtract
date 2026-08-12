# Flowtract

> **Developer preview:** [`flowtract@0.1.0`](https://www.npmjs.com/package/flowtract)
> is published with provenance and registry-consumer proof. Gate 4A is accepted;
> Flowtract is not claimed as production- or enterprise-ready.

**Test contracts in motion.**

Flowtract is an Apache-2.0 TypeScript framework for schema-verified, stateful
REST API workflows. It is designed for QA engineers, SDETs, and backend teams
testing authenticated APIs whose meaningful behavior spans multiple requests.

The Gate 3 core production-candidate proof accepted through
[PR #11](https://github.com/flowtract/flowtract/pull/11) now provides:

- explicit `defineOperation` contracts using Zod 4 public APIs;
- typed request inputs and transformed outputs;
- exact and default status-discriminated result unions;
- stable public error codes;
- immutable runtime configuration and isolated scenario state;
- Playwright-backed HTTP execution behind a public transport port;
- bearer, API-key, basic, and session/CSRF authentication;
- bounded interpolation, secret tracking, and redacted diagnostics;
- deterministic cleanup through a close-scoped restricted client;
- dual ESM/CommonJS builds with declarations and source maps;
- clean package-consumer proofs across TypeScript 5.5, 6.0, and 7.0;
- hostile-input and fault containment with 10,000 fixed-seed property cases;
- deterministic lifecycle-race, resource, stress, benchmark, and soak proof;
- reviewed peer profiles, macOS CI, SBOM, and publication-dry-run proof;
- executable packed documentation and IntelliSense coverage for every root export.

Cucumber integration, the CLI, configuration-file loading, generators, command
targeting, retries, and reporting remain future gates. Gate 4B now performs
external evaluation of the published developer preview. See the
[canonical v0.1 specification](docs/open-source/v0.1/README.md) for implemented
behavior, target behavior, and non-goals.

Install the published root package with `npm install flowtract`. The executable
guides are deployed at the [Flowtract documentation site](https://flowtract.github.io/flowtract/),
and immutable release evidence is attached to
[`v0.1.0`](https://github.com/flowtract/flowtract/releases/tag/v0.1.0).

## Development

Flowtract requires Node 22 or 24.

```bash
npm ci
npm run gate4:qa
npm run type-matrix
npm run clean-clone:check
```

The workspace contains the published root package and one private deferred
package:

```text
packages/
├── flowtract/
└── create-flowtract/
```

Only `packages/flowtract` is published. `create-flowtract` remains private and
unpublished, and the public package continues to expose only its root entry
point.

## Community

Read [CONTRIBUTING.md](CONTRIBUTING.md), [GOVERNANCE.md](GOVERNANCE.md), and
[SECURITY.md](SECURITY.md) before contributing or reporting a vulnerability.
Contributions use DCO sign-off and do not require a CLA.

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
