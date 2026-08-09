---
layout: default
title: Core guide
---

# Core guide

## Supported profiles

- Node.js `^22.0.0 || ^24.0.0` on Windows, Ubuntu, and macOS.
- TypeScript 5.5.4, 6.0.2, and 7.0.2.
- Zod `^4.0.0`; reviewed minimum 4.0.0 and latest 4.4.3.
- Playwright `^1.62.0`; reviewed minimum 1.62.0 and latest 1.62.1.
- Root import only: `flowtract`.

## Lifecycle

Create one immutable runtime and one scenario per isolated workflow. Each
scenario owns state, secrets, authentication instances, cookies, history,
diagnostics, and one transport session. Only one external operation may be in
flight per scenario.

Authentication precedence is invocation, operation, runtime `defaultAuth`, then
`false`. Bearer, API key, basic, and session/CSRF factories fail closed on
caller collisions.

Use `set` for ordinary values and `setSecret` for credentials. `{{name}}`
interpolation preserves whole-reference types and propagates secret taint.

Dry run validates and normalizes without sending the target operation.
Cancellation accepts an `AbortSignal`. Closing waits for active work, runs LIFO
cleanup through a restricted client, disposes auth in reverse initialization
order, and disposes the transport.

History contains immutable exchange summaries. Diagnostics are immutable,
bounded, and already redacted. Application response bodies remain caller-owned
data.

Custom transports implement one session per scenario and must dispose every
owned request/response resource exactly once.
