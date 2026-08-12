# Community and Governance

## Principles

Flowtract is community-first open source. Governance optimizes for:

- transparent technical decisions;
- reviewable evidence instead of marketing claims;
- welcoming, secure contribution paths;
- predictable maintenance and release communication;
- no proprietary `0.1` capability boundary.

## License and contribution certification

The project uses Apache License 2.0. Contributions use Developer Certificate of
Origin sign-off. A Contributor License Agreement is not required.

All pull requests MUST:

- include signed-off commits;
- explain user-visible behavior and compatibility impact;
- add or update tests proportionate to risk;
- update canonical/public documentation when behavior changes;
- pass required CI and review.

## Roles

### Contributor

Any participant with an accepted contribution.

### Triager

A contributor who has demonstrated sustained issue reproduction, respectful
community participation, and accurate categorization. Triagers may manage issue
labels and discussions but do not merge releases.

### Maintainer

A contributor with sustained high-quality code/documentation review, sound
security judgment, and demonstrated alignment with the project boundary.
Maintainers may merge changes and participate in releases.

### Lead maintainer

Owns release signing/publishing, security coordination, governance changes, and
final resolution when maintainer consensus cannot be reached.

Role changes are documented publicly. Inactivity does not erase authorship but
may remove operational permissions after a documented review.

## Decision process

- Routine fixes use pull-request review.
- Public API, security defaults, compatibility, package boundaries, governance,
  and roadmap expansion require a written decision record.
- Maintainers seek consensus.
- When consensus is not possible, the lead maintainer records the decision and
  rationale.
- Security-sensitive discussions use the private reporting process.

Canonical v0.1 semantics cannot be changed incidentally in implementation pull
requests; the specification and tests change together.

## Issue and discussion policy

Use:

- issues for reproducible defects and approved feature work;
- discussions for questions, ideas, use cases, and design-partner feedback;
- private vulnerability reporting for security;
- pull requests for concrete reviewed changes.

Beginner issues MUST include context, acceptance criteria, relevant files or
interfaces, and verification commands.

## Support expectations

During developer preview:

- support is best-effort;
- maintainers target an initial response within two business days;
- security reports receive priority acknowledgment;
- supported behavior is limited to documented versions and entry points;
- undocumented deep imports receive no compatibility guarantee.

## Community health

The project tracks:

- first-success onboarding time;
- external repositories using Flowtract;
- design-partner completion and retention;
- issue response and closure times;
- external contributors and repeat contributors;
- security and release reliability.

Stars and downloads are useful discovery indicators but are not readiness
proof.

## Design partners

With Gate 4A and `0.1.0` published, Gate 4B recruits at least five TypeScript
QA/backend teams. Partners receive no private feature entitlement. Their role
is to:

- run the starter without maintainer intervention;
- model one real authenticated workflow;
- report missing diagnostics and unclear documentation;
- validate Windows/Linux and CI behavior;
- confirm whether the product wedge solves meaningful work.

Feedback that expands protocols or product categories is recorded for future
evaluation and does not automatically enter `0.1`.

Gate 4B evidence may authorize later capability gates before the separate
production-ready evidence track completes. The three-team/90-day criterion
gates only a production-ready claim.

## Branding and project identity

The intended community home is `flowtract/flowtract` under a Flowtract GitHub
organization. Repository transfer preserves history.

Before transfer or announcement:

- complete trademark and domain diligence;
- reserve npm package names through an approved release/reservation mechanism;
- record maintainers and recovery owners for GitHub, npm, and documentation;
- require strong authentication for publishing identities.

The project name does not imply affiliation with Zod, Playwright, or Cucumber.
Their names describe integrations only.
