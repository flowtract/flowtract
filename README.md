# Flowtract

> **Developer preview:** Flowtract is under active development and is not yet
> published or claimed as production- or enterprise-ready.

**Test contracts in motion.**

Flowtract is an Apache-2.0 TypeScript framework for schema-verified, stateful
REST API workflows. It is designed for QA engineers, SDETs, and backend teams
testing authenticated APIs whose meaningful behavior spans multiple requests.

Gate 1 currently provides the typed contract and package foundation:

- explicit `defineOperation` contracts using Zod 4 public APIs;
- typed request inputs and transformed outputs;
- exact and default status-discriminated result unions;
- stable public error codes;
- dual ESM/CommonJS builds with declarations and source maps;
- clean package-consumer proofs across TypeScript 5.5, 6.0, and 7.0.

HTTP execution, authentication, scenario state, configuration, Cucumber
integration, and the CLI remain future gates. See the
[canonical v0.1 specification](docs/open-source/v0.1/README.md) for implemented
behavior, target behavior, and non-goals.

## Development

Flowtract requires Node 22 or 24.

```bash
npm ci
npm run qa
npm run type-matrix
```

The workspace contains two private pre-release packages:

```text
packages/
├── flowtract/
└── create-flowtract/
```

Neither package is currently published. Only the `flowtract` root entry point
exists during Gate 1.

## Community

Read [CONTRIBUTING.md](CONTRIBUTING.md), [GOVERNANCE.md](GOVERNANCE.md), and
[SECURITY.md](SECURITY.md) before contributing or reporting a vulnerability.
Contributions use DCO sign-off and do not require a CLA.

## License

Apache License 2.0. See [LICENSE](LICENSE) and [NOTICE](NOTICE).
