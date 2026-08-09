# Acceptance, Recovery, and Evidence

## Repository acceptance

Before any external publication, the final Gate 4A implementation candidate
must pass:

- all Gate 1, Gate 2, and Gate 3 tests;
- at least 90% statements, lines, and functions and 85% branches;
- Windows and Ubuntu Node 22/24 and macOS Node 24;
- TypeScript 5.5.4, 6.0.2, and 7.0.2;
- minimum/latest reviewed Zod 4 and Playwright peers;
- ESM and CommonJS JavaScript and TypeScript consumers;
- root export, source/declaration map, `publint`, and Are the Types Wrong proof;
- exactly 84 approved package files unless an explicit reviewed documentation
  file difference changes the count;
- complete and production audits with zero findings;
- CodeQL, Dependency Review, DCO, secret scan, SBOM, clean-clone, and repository
  integrity;
- publication rehearsal that publishes nothing.

No 15-minute Gate 3 soak rerun is required for documentation/release-only
changes when the runtime, dependencies, package output, and workflows used by
the runtime proof are unchanged. Any such change invalidates this exemption.

## Bootstrap registry acceptance

After `0.1.0-rc.0` is published, a dedicated acceptance workflow installs from
the public npm registry on Windows and Ubuntu Node 24 and requires:

- exact resolution of `flowtract@0.1.0-rc.0`;
- the expected integrity, repository, license, engines, peers, and root export;
- 84 approved files;
- successful ESM, CommonJS, TypeScript ESM, and TypeScript CommonJS scenarios;
- successful authenticated Playwright execution;
- successful minimum/latest peer consumers;
- verified registry signature and provenance attestation;
- zero production audit findings and zero generated-secret occurrence;
- normal termination and a clean temporary consumer.

The bootstrap token is revoked only after this proof succeeds. Failure prevents
trusted-publisher configuration and final publication.

## Final registry acceptance

The same proof runs against exact `flowtract@0.1.0` without using `latest` for
installation. It additionally requires:

- trusted-publisher provenance references the final release workflow and SHA;
- no npm write token was available to the final publish job;
- `latest` and `next` resolve to `0.1.0` after finalization;
- the live documentation quick start uses `0.1.0` and succeeds;
- `v0.1.0` and the GitHub release identify the same source revision;
- package, release, documentation, and completion-record claims agree.

Any candidate-changing push invalidates earlier rehearsal or registry evidence.

## Failure and recovery policy

- **Before publish:** stop without changing registry or tags.
- **Bootstrap publish succeeds but acceptance fails:** leave the immutable
  prerelease available, remove `next` if safe, revoke the token, record the
  failure, and require a new prerelease version after remediation.
- **Final publish succeeds but verification fails:** do not republish or move
  `latest`; compare registry integrity to the expected artifact and treat any
  mismatch as a security incident.
- **Tag/release creation fails after a verified publish:** use the integrity-
  checked completion path defined in Document 01.
- **Documentation deployment fails:** retain the published package, mark Gate
  4A incomplete, fix only the deployment, and rerun registry-backed examples.
- **Incorrect but non-malicious release:** deprecate and issue a higher patch;
  do not reuse or overwrite a version.
- **Credential or artifact compromise:** follow the security policy, revoke all
  affected access, deprecate the release, and publish no replacement until an
  incident review authorizes it.

Unpublishing is reserved for an explicit security or legal decision. Normal
rollback uses deprecation, dist-tags, and a corrected higher version.

## Durable completion record

After final acceptance, a signed documentation-only PR records:

- approved Gate 4A specification and implementation SHAs;
- bootstrap and final workflow run URLs;
- npm package/version URLs, dist-tags, integrity, and provenance references;
- registry-consumer results and supported-version matrix;
- package file count, SBOM, audit, CodeQL, DCO, and Dependency Review evidence;
- GitHub tag/release and documentation URLs;
- bootstrap-token revocation and trusted-publisher configuration confirmation;
- known limitations, Scorecard advisories, and unresolved non-blocking debt;
- the Gate 4A verdict and Gate 4B handoff.

The completion record must contain no token, OIDC payload, recovery code,
private account detail, or secret screenshot.
