# Flowtract Open-Source v0.1 Canonical Specification

> **Status:** Gate 2 accepted; Gate 3 specification in progress
> **Product:** Flowtract
> **Release target:** `0.1.0` developer preview
> **Positioning:** Test contracts in motion.

This directory is the decision source for Flowtract. Runtime work must remain
inside the approved gate boundaries recorded here.

## Product boundary

Flowtract is an open-source TypeScript framework for schema-verified, stateful
REST API workflows. It is optimized first for QA engineers, SDETs, and backend
developers testing authenticated APIs whose meaningful behavior spans multiple
dependent requests.

The `0.1.0` release supports:

- REST requests and JSON, text, and empty responses;
- Zod-first request and status-specific response contracts;
- Playwright-backed HTTP execution behind a transport port;
- scenario-local state, secrets, authentication, response history, and cleanup;
- a runner-neutral programmatic API;
- an optional Cucumber adapter;
- a focused CLI and `create-flowtract` starter;
- redacted diagnostics and standard Cucumber artifacts.

The `0.1.0` release does not support GraphQL, SOAP, gRPC, WebSockets, SSE,
multipart, binary streaming, database assertions, UI testing, load testing,
hosted services, or a low-code interface.

## Specification map

1. [Product and scope](01-product-and-scope.md)
2. [Current baseline and gaps](02-current-baseline-and-gaps.md)
3. [Public API and execution model](03-public-api-and-execution-model.md)
4. [Security, configuration, and artifacts](04-security-configuration-and-artifacts.md)
5. [Packaging, CLI, and Cucumber](05-packaging-cli-and-cucumber.md)
6. [Testing and release gates](06-testing-and-release-gates.md)
7. [Community and governance](07-community-and-governance.md)
8. [Roadmap and success measures](08-roadmap-and-success-measures.md)
9. [Gate 0 review and approval](09-gate-0-review-and-approval.md)
10. [Gate 1.5 clean repository extraction](10-gate-1-5-clean-repository.md)
11. [Gate 2 execution foundation](gate-2/README.md)
12. [Gate 3 Cucumber and CLI](gate-3/README.md)

## Normative language

`MUST`, `MUST NOT`, `SHOULD`, and `MAY` describe release requirements. Each
document distinguishes:

- **Current:** behavior proven in the repository today;
- **v0.1 Target:** required before publishing `0.1.0`;
- **Future:** explicitly outside the `0.1.0` compatibility promise.

## Gate 0 approval record

Gate 0 is complete only when:

- every document in this directory is reviewed;
- unresolved decisions are removed;
- the product boundary and public API are approved;
- repository identity and license choices are confirmed;
- approval is recorded below.

| Field             | Value            |
| ----------------- | ---------------- |
| Decision          | Approved         |
| Approved by       | Repository owner |
| Approval date     | 2026-07-28       |
| Approved revision | `a9a7a45`        |

Gate 1 was accepted at source revision `fc304b1`. Gate 1.5 replaced the
repository-transfer assumption with a reviewed clean extraction and completed
public activation at `090ec2e`. The Gate 2 specification was approved for
implementation on 2026-07-29 against signed revision `269b787` (the
tree-identical DCO rewrite of `ca990a9`), including the close-scoped
cleanup-client amendment. Gate 2 was accepted through PR
[#9](https://github.com/flowtract/flowtract/pull/9) and squash-merged as
`cc30efe` on 2026-08-02 after semantic review and the Windows/Ubuntu Node 22/24
matrix passed. Gate 3 remains specification-only until its owner approval. npm
publication remains separately gated.
