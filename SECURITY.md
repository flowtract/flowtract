# Security Policy

## Supported versions

Flowtract has not yet published `0.1.0`. The current prototype is not supported
for production use.

| Version               | Supported                  |
| --------------------- | -------------------------- |
| `main` before `0.1.0` | Best-effort security fixes |
| `0.1.x`               | Planned after release      |

After `0.1.0`, the latest minor line and its current patch release will receive
security fixes. The policy will be updated before any support window changes.

## Reporting a vulnerability

Do not create a public issue.

Use GitHub private vulnerability reporting for the `flowtract/flowtract`
repository after transfer. Until transfer, use private vulnerability reporting
on the current repository if enabled. If it is unavailable, contact the
repository owner through their GitHub profile and request a private reporting
channel without disclosing vulnerability details publicly.

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
