# Gate 1.5 Clean Repository Extraction

## Decision

| Field                  | Value                                      |
| ---------------------- | ------------------------------------------ |
| Decision               | Approved                                   |
| Approved by            | Repository owner                           |
| Approval date          | 2026-07-28                                 |
| Accepted Gate 1 source | `fc304b12f88bd1f8cb7ae56d66220fad68769e72` |
| Destination            | `flowtract/flowtract`                      |
| Migration model        | Clean snapshot                             |

Gate 1.5 supersedes the Gate 0 assumption that the prototype repository would
be transferred with its history. The new repository begins from a reviewed
allowlist of the accepted Gate 1 tree. The old repository remains private and
is archived after public activation succeeds.

## Rationale

The prototype repository mixed the Flowtract package foundation with legacy
runtime code, mutable fixtures, examples, generated schemas, and obsolete
dependencies. A clean extraction establishes a smaller public security and
maintenance boundary before Gate 2 adds execution behavior.

## Carried foundation

- `flowtract` typed contracts, tests, build, and package proofs;
- private `create-flowtract` placeholder;
- canonical specification and community governance;
- framework-only npm workspace and lockfile;
- cross-platform CI and public security automation.

Legacy source, feature files, mutable data, mock services, generated artifacts,
prototype configuration, and Git history are intentionally excluded.

## Gate boundary

Gate 1.5 changes repository identity and project hygiene only. It does not add
HTTP execution, authentication, scenario state, configuration, Cucumber, CLI,
generator, or npm publication behavior.

Gate 2 may begin only after:

- private clean-clone and package gates pass;
- the repository is public;
- public CI, CodeQL, dependency review, and Scorecard activation pass;
- the archived prototype remains private and recoverable.
