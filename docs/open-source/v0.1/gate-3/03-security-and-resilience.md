# Security and Resilience

## Trust model

Flowtract validates data and coordinates project-owned code; it is not a
sandbox. Treat these as untrusted data:

- invocation input, interpolated values, URLs, headers, query values, and
  response bytes;
- transport responses and errors;
- remote status, content type, redirect location, and header tuples;
- values crossing an error, diagnostic, history, dry-run, or cleanup boundary.

Treat operation schemas, transform callbacks, auth providers, transports, and
cleanup callbacks as trusted project code that may nevertheless be buggy or
hostile. Flowtract must contain their failures, preserve cleanup, and avoid
executing incidental getters or coercion hooks while producing diagnostics.

## Threats and required controls

### Secret disclosure

Ordinary state, secret state, auth material, cookies, CSRF values, header/query
credentials, transformed values, causes, URLs, and cleanup failures can carry
secrets. One scenario-local tracker applies structural/taint redaction and
longest-first literal replacement before diagnostic exposure.

Public errors and diagnostics must never include raw headers, bodies, state,
stacks, causes, cookie values, or secret query values by default. Preview
bounds apply after decoding and before exposure. Redaction failures fail closed
with an omitted or `[REDACTED]` value, not original input.

### Hostile JavaScript values

Redaction, error normalization, interpolation, freezing, and serialization
must be cycle-safe and bounded. They must not invoke user getters, setters,
`toJSON`, custom inspection, proxy enumeration traps when avoidable, or
arbitrary `toString`. Symbols, functions, accessors, proxies, sparse arrays,
deep objects, oversized strings, non-extensible errors, and thrown primitives
receive deterministic bounded treatment.

### Object and request integrity

Only arrays and plain objects are recursively interpolated. Owned maps must not
allow `__proto__`, `prototype`, or `constructor` data to mutate prototypes.
Header names/values, URLs, paths, and response tuples are validated before use.
CR/LF header injection and auth collisions fail closed.

### Network and cancellation

TLS verification remains enabled by default; insecure TLS is explicit and
diagnosed. Caller abort, timeout, TLS, redirect overflow, DNS, socket, and
unknown failures retain stable classifications. A pre-aborted signal prevents
transport execution. Aborted or timed-out requests still dispose response and
session resources exactly once.

## Error and diagnostic boundary

Every public Flowtract error must be:

- a stable existing code with the correct phase/kind;
- JSON-safe and bounded;
- redacted before construction or exposure;
- free of raw nested cause and stack in `toJSON()`;
- immutable where the public contract promises immutability.

Diagnostic arrays and events are immutable snapshots. Mutation of returned
values, configuration inputs, transport tuples, or provider results must not
change later errors or diagnostics.

Hostile-input proof scans error objects, JSON, diagnostics, history, test
output, package fixtures, and captured logs for every generated secret.

## Supply-chain proof

The candidate requires:

- zero production audit vulnerabilities;
- no unapproved critical/high development vulnerability;
- successful Dependency Review and CodeQL JavaScript/TypeScript analysis;
- zero new open CodeQL alert attributable to the final branch;
- successful secret scan and repository-boundary check;
- license and archive review for every dependency change;
- an untracked CycloneDX SBOM generated from the final candidate;
- a successful package publication dry run without actual publication.

The SBOM and GitHub run URLs are acceptance evidence; generated SBOM files do
not enter the source tree or npm archive.

## Security failure policy

A secret occurrence, incorrect trust-boundary classification, TLS-default
regression, auth collision bypass, prototype mutation, skipped cleanup,
resource leak, CodeQL alert, or critical/high unapproved dependency finding
blocks acceptance. Tests, bounds, scans, or profiles must not be weakened to
make the candidate pass.
