# Flowtract

> **Developer preview:** Flowtract is under active development and is not yet
> published or claimed as production- or enterprise-ready.

**Test contracts in motion.**

Flowtract is an Apache-2.0 TypeScript framework for schema-verified, stateful
REST API workflows. It is designed for QA engineers, SDETs, and backend teams
testing authenticated APIs whose meaningful behavior spans multiple requests.

The Gate 2 execution foundation now provides:

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
- clean package-consumer proofs across TypeScript 5.5, 6.0, and 7.0.

Cucumber integration, the CLI, configuration-file loading, retries, reporting,
and npm publication remain future gates. See the
[canonical v0.1 specification](docs/open-source/v0.1/README.md) for implemented
behavior, target behavior, and non-goals.

## Development

Flowtract requires Node 22 or 24.

```bash
npm ci
npm run gate2:qa
npm run type-matrix
npm run clean-clone:check
```

The workspace contains two private pre-release packages:

```text
packages/
├── flowtract/
└── create-flowtract/
```

Neither package is currently published. Only the `flowtract` root entry point
exists during Gate 2.

## Community

Read [CONTRIBUTING.md](CONTRIBUTING.md), [GOVERNANCE.md](GOVERNANCE.md), and
[SECURITY.md](SECURITY.md) before contributing or reporting a vulnerability.
Contributions use DCO sign-off and do not require a CLA.

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
