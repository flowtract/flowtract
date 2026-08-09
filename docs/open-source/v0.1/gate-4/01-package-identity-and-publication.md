# Package Identity and Trusted Publication

## Release identity

Gate 4A publishes exactly one package:

| Field          | Contract                                 |
| -------------- | ---------------------------------------- |
| Package        | `flowtract`                              |
| Bootstrap      | `0.1.0-rc.0` on dist-tag `next`          |
| Final          | `0.1.0` on dist-tag `latest`             |
| Registry       | `https://registry.npmjs.org/`            |
| Visibility     | Public                                   |
| Repository     | `https://github.com/flowtract/flowtract` |
| Workflow       | `.github/workflows/release.yml`          |
| Runtime engine | `^22.0.0 \|\| ^24.0.0`                   |
| Exports        | Existing root conditional export only    |
| License        | Apache-2.0                               |

The workspace root remains private. `create-flowtract` remains private and is
not packed, published, or represented as implemented.

`packages/flowtract/package.json` will:

- set version `0.1.0` in the accepted implementation candidate;
- remove `private`;
- add `publishConfig.access: "public"` and
  `publishConfig.provenance: true`;
- preserve the exact repository URL, license, files, exports, engines, peers,
  side-effect metadata, and scripts unless this specification says otherwise.

Release scripts derive `0.1.0-rc.0` in a temporary release workspace for the
bootstrap publish. They do not commit a prerelease version to `main`.

## Why bootstrap is separate

npm requires a package to exist before a trusted publisher can be configured.
Therefore the first publication cannot use the final OIDC trust relationship.
Gate 4A uses one controlled bootstrap prerelease, then removes token-based
publishing before the final release.

## Release workflow contract

`release.yml` is manual-only and accepts:

- `expected_sha`: required full 40-character commit SHA;
- `channel`: exactly `bootstrap` or `final`;
- `rehearsal_run_id`: the successful exact-SHA no-publish rehearsal whose
  attested artifact will be published;
- `recover_existing`: false by default and true only for an explicitly
  authorized identical-artifact recovery.

The workflow must:

1. run only from `main` on a GitHub-hosted Ubuntu runner;
2. verify `github.sha`, `expected_sha`, and current `origin/main` are identical;
3. reject a dirty checkout, missing tag protection, unexpected package name,
   version, files, exports, peers, or repository URL;
4. use Node 24 and exactly npm `11.19.0`, which supports OIDC trusted
   publishing and the `npm trust` verification path;
5. disable npm dependency caching in release jobs;
6. accept only a successful manual rehearsal on the same main-branch SHA and
   channel;
7. verify the GitHub artifact attestation and tarball SHA-512, then publish the
   exact rehearsed artifact without rebuilding it;
8. publish only after approval through the matching protected environment;
9. emit no token, OIDC claim, secret, package body, or generated credential;
10. upload only already-public or redacted evidence with SHA-pinned actions.

Pull requests, pushes, tags, releases, schedules, reusable workflows, and fork
events must not invoke a publish job.

The separate manual `release-rehearsal.yml` performs locked installation,
complete audit, contract/package inspection, SBOM, secret-safe publication dry
run, exact channel packing, and GitHub artifact attestation without any npm
write credential.

## Bootstrap publication

The `bootstrap` channel uses protected environment `npm-bootstrap` and publishes
`flowtract@0.1.0-rc.0` with dist-tag `next`.

Because the package does not yet exist, bootstrap may use one temporary granular
npm token. It must:

- belong to the lead maintainer with account 2FA enabled;
- have the narrowest available publish scope and an expiry no longer than one
  day;
- exist only as an environment secret;
- be exposed only to the publish step;
- publish with provenance from the public GitHub-hosted workflow;
- be revoked and removed immediately after the prerelease is verified.

Bootstrap stops if the package name or `0.1.0-rc.0` already exists. It never
overwrites, unpublishes, or silently adopts an unexpected package.

## Trust transition

After bootstrap verification, the repository owner configures npm trusted
publishing with these exact claims:

- provider: GitHub Actions;
- organization: `flowtract`;
- repository: `flowtract`;
- workflow filename: `release.yml`;
- environment: `npm-production`;
- allowed operation: `npm publish` only.

The owner then:

- verifies the trust relationship through npm package settings or `npm trust`;
- sets publishing access to require 2FA and disallow traditional tokens;
- revokes and removes the bootstrap token;
- records screenshots or redacted command output outside tracked source until
  the final completion record is written.

## Final publication

The `final` channel uses protected environment `npm-production` and must have no
`NODE_AUTH_TOKEN` or other npm write credential. It publishes
`flowtract@0.1.0` using GitHub OIDC trusted publishing.

After publication, the workflow verifies:

- `npm view flowtract@0.1.0` reports the expected repository and engines;
- `latest` resolves to `0.1.0`;
- npm displays provenance linked to the exact GitHub workflow and SHA;
- registry integrity matches the locally reviewed tarball;
- signatures and attestations verify with the reviewed npm CLI;
- the 84-file allowlist and root export remain unchanged.

After final verification, `next` is moved to `0.1.0` and the prerelease is
deprecated with a message directing users to `0.1.0`. Those registry-management
operations require interactive maintainer authentication and 2FA; they are not
performed through the OIDC publish job.

## Tag and release ordering

Publication precedes creation of the immutable `v0.1.0` tag and GitHub release.
If npm succeeds but tag/release creation fails, recovery mode must:

- rebuild the expected artifact from `expected_sha`;
- compare its integrity and package contents to the existing registry version;
- complete the tag/release only if they are identical;
- stop as a security incident if they differ.

The workflow never republishes an existing version. The GitHub release links
the npm package, provenance, SBOM evidence, documentation, changelog, supported
versions, and explicit developer-preview limitations.
