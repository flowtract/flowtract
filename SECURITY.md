# Security Policy

## Supported versions

Flowtract publishes `0.1.x` as a developer preview. It is not supported as a
production- or enterprise-ready release.

| Version | Supported                                    |
| ------- | -------------------------------------------- |
| `0.1.x` | Latest patch receives best-effort fixes      |
| `main`  | Development branch; no release support claim |

The latest `0.1.x` patch receives best-effort security fixes during developer
preview. The policy will be updated before any support window changes.

## Reporting a vulnerability

Do not create a public issue.

Use [GitHub private vulnerability reporting](https://github.com/flowtract/flowtract/security/advisories/new)
for the public `flowtract/flowtract` repository. If it is unavailable, contact
the repository owner through their GitHub profile and request a private channel
without disclosing vulnerability details publicly.

Include:

- affected revision/version;
- reproduction or proof of concept;
- impact and prerequisites;
- known mitigations;
- whether credentials or third-party data are involved.

Maintainers target acknowledgment within two business days. Timelines for
validation, remediation, disclosure, and credit are coordinated privately.

## Security boundaries

Flowtract executes user-authored tests with the user's OS permissions. Project
configuration, custom auth providers, step definitions, and imported modules
are trusted code.

Flowtract's security responsibilities include:

- not leaking secrets through default diagnostics or artifacts;
- secure TLS and timeout defaults;
- safe CLI argument and file handling;
- deterministic dependency and release provenance;
- clear warnings for explicitly unsafe configuration.

Flowtract is not a sandbox for untrusted tests or configuration.
