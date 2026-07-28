# Contributing to Flowtract

Thank you for helping build Flowtract.

## Before contributing

- Read the [Code of Conduct](CODE_OF_CONDUCT.md).
- Read the canonical [v0.1 specification](docs/open-source/v0.1/README.md).
- Use an issue or discussion before making public API, security, package, or
  product-boundary changes.
- Do not include credentials, proprietary API payloads, or customer data.

## Development baseline

Flowtract is a developer preview. Node.js 22 and 24 are the release-blocking
runtime lines. Install the locked dependencies and run the complete contributor
gate:

```bash
npm ci --ignore-scripts
npm run qa
npm run type-matrix
```

The package archive can be checked independently with
`npm run package:check`. Tests and packaging must not change tracked files.

## Pull requests

Pull requests must:

- be narrowly scoped;
- explain behavior and compatibility impact;
- include tests for behavior changes;
- update relevant documentation;
- leave no tracked fixture changes;
- pass required CI;
- use signed-off commits.

## Developer Certificate of Origin

Flowtract uses the [Developer Certificate of Origin 1.1](https://developercertificate.org/).
Sign every commit:

```bash
git commit -s -m "Describe the change"
```

The sign-off certifies that you have the right to submit the contribution under
the project license. A CLA is not required.

## Reporting security issues

Do not open public security issues. Follow [SECURITY.md](SECURITY.md).
