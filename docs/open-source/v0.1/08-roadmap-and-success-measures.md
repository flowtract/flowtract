# Roadmap and Success Measures

## Twelve-week delivery

### Weeks 1–2

- approve this canonical package;
- establish project identity, license, governance, and security foundation;
- reserve names after diligence;
- record baseline and migration mapping.

### Weeks 3–4

- establish npm workspaces and package exports;
- implement operation DSL, types, errors, and Zod 4 parsing;
- port example operations;
- pass installed-consumer type proof.

### Weeks 5–6

- implement transport, Playwright adapter, scenario lifecycle, auth, state,
  interpolation, cleanup, configuration, and redaction;
- prove authenticated parallel CRUD without tracked mutations.

### Weeks 7–8

- implement Cucumber adapter, domain wrapper example, CLI, generator, and
  deterministic process lifecycle;
- prove ten-minute onboarding on Windows and Linux.

### Weeks 9–10

- complete documentation site, API reference, examples, packaging/security
  automation, and beta;
- run five design-partner evaluations.

### Week 11

- resolve beta blockers;
- freeze `0.1` public API;
- publish and validate release candidate.

### Week 12

- publish `0.1.0` with provenance;
- deploy documentation and examples;
- open public discussions and evidence-gated roadmap.

## First 90-day success measures

- median first successful run under ten minutes;
- at least five external real-world repositories;
- at least three production design partners before any production-readiness
  claim;
- at least two external contributors;
- at least ten meaningful issues/discussions;
- initial maintainer response within two business days;
- monthly patch/minor release rhythm where changes exist;
- zero unresolved critical/high security findings.

## v0.2 candidates

Subject to user evidence:

- OpenAPI import/export;
- contract coverage reports;
- polling/eventual-consistency helpers;
- validated extension interfaces;
- richer operation discovery.

OpenAPI work MUST preserve Flowtract's explicit workflow model rather than
turning generated endpoint coverage into the only test model.

## v0.3 candidates

Subject to user evidence:

- multipart and form requests;
- bounded binary download support;
- richer test-data lifecycle;
- optional native-fetch transport after parity proof;
- expanded diagnostics/reporting.

## v1.0 gate

`1.0.0` is evidence-driven, not calendar-driven. It requires:

- public API stability across at least two minor releases;
- three teams using Flowtract in production for at least 90 days;
- cross-platform package and process reliability;
- documented compatibility/deprecation policy;
- no major correctness or security blocker;
- stable extension interfaces used outside the repository;
- complete migration material.

## Separate-spec requirements

GraphQL, SOAP, gRPC, WebSockets/SSE, UI testing, load testing, database
assertions, schema-neutral adapters, and hosted services require separate
canonical specifications and approval. They MUST NOT be added as opportunistic
`0.1` extensions.

## Release claim ladder

Use only the highest proven label:

1. **Prototype** — repository-local proof;
2. **Developer preview** — published package with documented limitations;
3. **Beta** — external design-partner proof;
4. **Production candidate** — production profiles and operational proof;
5. **Production ready** — sustained production evidence and support policy.

`0.1.0` targets **Developer preview**.
