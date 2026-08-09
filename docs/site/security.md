---
layout: default
title: Security and compatibility
---

# Security and compatibility

TLS verification is enabled by default. `allowInsecureTls` is only for an
explicitly controlled test endpoint and emits a warning diagnostic.

Built-in secrets and secret-tainted destinations are structurally redacted.
Errors and diagnostics omit raw headers, bodies, state, stacks, and causes by
default. Do not treat operation results as automatically redacted application
data.

The `0.1` line preserves reviewed root export names, stable error codes,
diagnostic schema version 1, and accepted operation/result semantics. Normal
SemVer applies; undocumented deep imports receive no compatibility guarantee.

Report vulnerabilities privately through the repository's
[security policy](https://github.com/flowtract/flowtract/security/policy).

Flowtract is not a general infrastructure orchestrator and does not yet include
Cucumber, a project CLI, configuration loading, command execution, retries,
reporting, telemetry, or additional protocols.
