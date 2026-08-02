# Roadmap and Success Measures

## Evidence-gated sequence

The roadmap is ordered by proof, not calendar dates.

### Accepted foundation

- Gate 0: canonical product/security/governance specification;
- Gate 1/1.5: typed operation contracts, package consumers, and clean public
  repository;
- Gate 2: immutable runtime, transport, scenario lifecycle, auth, state,
  interpolation, cleanup, redaction, diagnostics, and parallel HTTP proof.

### Gate 3 — core production-candidate hardening

- freeze the root compatibility boundary;
- prove hostile inputs and every external failure phase;
- prove deterministic lifecycle races and resource ownership;
- add stress, benchmark, and Windows/Ubuntu soak evidence;
- add macOS and minimum/latest peer compatibility;
- complete root-runtime DX, package, SBOM, and security proof.

Gate 3 may produce the technical verdict `Core production-candidate proof:
Passed`. It does not publish a package or claim the product is production
ready.

### Gate 4 — developer preview and external evaluation

Subject to separate authorization:

- publish the root package with provenance and documented limitations;
- deploy documentation and executable examples;
- recruit at least five real-world repositories/design partners;
- measure first-success time, defects, support load, and missing core
  capabilities;
- resolve release-blocking user evidence before expanding adapters.

### Later evidence-gated capabilities

Subject to user evidence and separate canonical specifications:

- optional Cucumber adapter and domain-step guidance;
- project CLI, configuration loader, generator, and artifact/report surfaces;
- local command-target execution;
- OpenAPI import/export and contract-coverage reports;
- polling/eventual-consistency helpers and validated extension interfaces;
- multipart/form and bounded binary support;
- additional protocols or hosted services.

These items are not part of the `0.1` root-package compatibility promise until
an approved release decision says otherwise.

## External success measures

After publication, measure:

- median first successful root-runtime scenario under ten minutes;
- at least five external real-world repositories;
- at least three production design partners before a production-ready claim;
- initial maintainer response within two business days;
- zero unresolved critical/high security findings;
- compatibility and migration evidence across actual releases.

## Production-ready gate

Flowtract may claim production ready only when:

- public API stability has been exercised across at least two minor releases;
- at least three teams have used it in production for at least 90 days;
- cross-platform package, transport, lifecycle, and resource reliability is
  demonstrated on released artifacts;
- compatibility, deprecation, support, and security-response policies have
  been exercised;
- no major correctness or security blocker remains;
- migration and limitation material is complete.

## Separate-spec requirement

Runner adapters, command execution, configuration loaders, CLIs, generators,
GraphQL, SOAP, gRPC, WebSockets/SSE, UI/load/database testing, schema-neutral
adapters, and hosted services require separate specifications and approval.
They must not enter core hardening opportunistically.

## Claim ladder

Use only the highest proven project label:

1. **Prototype** — repository-local proof;
2. **Developer preview** — published package with documented limitations;
3. **Beta** — external design-partner proof;
4. **Production candidate** — production profiles plus operational and external
   evidence;
5. **Production ready** — sustained production evidence and support policy.

Gate 3's bounded core verdict does not skip this project-level ladder.
