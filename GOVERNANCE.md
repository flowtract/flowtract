# Flowtract Governance

Flowtract is a community-first Apache-2.0 project. Technical decisions are
made transparently and are subordinate to the approved canonical
specifications.

## Roles

- **Contributor:** anyone with an accepted contribution.
- **Triager:** a trusted contributor who reproduces and categorizes issues and
  helps manage discussions.
- **Maintainer:** a contributor trusted to review and merge changes.
- **Lead maintainer:** owns releases, security coordination, governance, and
  final resolution when consensus cannot be reached.

The project starts with one lead maintainer. Triager and maintainer access is
earned through sustained, accurate, respectful contributions and review.
Appointments and removals are recorded publicly.

## Decisions

Routine changes use pull-request review. Public API, compatibility, security
defaults, package boundaries, governance, or product-scope changes require a
written decision record and matching specification/test updates.

Maintainers seek consensus. If consensus cannot be reached, the lead maintainer
records the decision and rationale. Security matters use the private process in
[SECURITY.md](SECURITY.md).

## Releases

Only maintainers may publish. Releases must pass the gates in the canonical
[v0.1 specification](docs/open-source/v0.1/README.md). No release may claim a
readiness level beyond its executable evidence.

## Inactivity

Authorship remains permanently attributed. Operational permissions may be
removed after six months of inactivity when required for project security.
The individual may return through the normal contribution path.
