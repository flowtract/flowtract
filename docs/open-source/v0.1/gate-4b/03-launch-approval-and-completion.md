# Launch, Approval, and Completion

## Delivery model

Implementation uses:

- one signed branch and ready-for-review PR in `flowtract/flowtract`;
- one privately staged `flowtract/flowtract-starter` repository;
- targeted local checks and one fail-closed protected PR matrix;
- no local clean-clone, compiler matrix, soak, benchmark, release rehearsal, or
  registry proof repetition;
- one exact launch authorization after both candidate SHAs are green.

The main branch is `codex/flowtract-gate-4b-launch`, created from protected
`e98ac6ff021cd9d5c243268dedeb9fb30e70d010` without modifying the historical
local `main`.

## Implementation authorization

Specification approval authorizes:

- the main-repository evaluation intake, ledger, documentation, validation
  script, and cost-aware CI integration;
- correction of stale support and security publication status;
- private creation and validation of the starter repository;
- signed commits, side-branch pushes, and one non-draft launch PR.

It does not authorize:

- merging the launch PR;
- making the starter public or marking it as a template;
- creating public labels, milestones, announcements, or invitations;
- modifying or publishing an npm version;
- beginning direct outreach to named people or repositories.

## Main-repository proof

During implementation run only:

```powershell
npm run format:check
npm run docs:site:check
npm run gate4b:check
npm run repository:check
npm run secret:check
git diff --check
```

Because scripts, issue forms, and CI change, the final PR runs one full
protected matrix. Every candidate-changing push invalidates prior PR evidence.

The PR is:

- base: `main`;
- head: `codex/flowtract-gate-4b-launch`;
- title: `feat: launch Gate 4B external evaluation`;
- labels: `enhancement`, `documentation`, and `github_actions`.

## Ready-to-launch boundary

The implementation action ends when:

- this specification has an approved exact SHA;
- the main launch PR is green and mergeable on its final SHA;
- the private starter's Ubuntu/Node 22 and Windows/Node 24 lanes pass on one
  immutable SHA;
- no public announcement, recruitment, or direct invitation has occurred;
- the verdict is `Ready to launch Gate 4B`.

The final report names both candidate SHAs. One repository-owner authorization
naming both SHAs may authorize the exact launch sequence:

1. squash-merge the main PR;
2. verify post-merge CI and CodeQL;
3. make the starter public and mark it as a GitHub template;
4. apply starter protection and topics;
5. create the approved labels and `Gate 4B external evaluation` milestone;
6. verify the protected-main Pages deployment;
7. publish one opt-in announcement in the existing Announcements category.

Direct invitations require a user-supplied target list and separate outbound
message approval.

## Private starter implementation evidence

| Field               | Recorded result                                                                                    |
| ------------------- | -------------------------------------------------------------------------------------------------- |
| Repository          | `flowtract/flowtract-starter`                                                                      |
| Visibility          | Private; issues, Discussions, projects, and wiki disabled                                          |
| Template status     | Disabled until launch authorization                                                                |
| Candidate           | `b81c4cac05f76b708e3917dbdf81e87d6b5cb61d`                                                         |
| Proof               | [Starter run 31559046420](https://github.com/flowtract/flowtract-starter/actions/runs/31559046420) |
| Ubuntu / Node 22    | Passed                                                                                             |
| Windows / Node 24   | Passed                                                                                             |
| Registry contract   | Exact `flowtract@0.1.0`, `zod@4.4.3`, and `playwright@1.62.1`                                      |
| Audit and integrity | Zero production findings; repository clean after execution                                         |

GitHub returned HTTP 403 when branch protection was requested while the starter
was private because the organization's current plan enables that feature only
for public repositories. The repository remains private and unprotected rather
than weakening visibility authorization. Main protection with the two accepted
starter checks is therefore a mandatory launch step immediately after public
conversion and before the announcement.

## Completion boundary

Gate 4B completes only when five eligible evaluations yield a defined verdict
and a Markdown-only completion record is merged. The record contains aggregate
participant profiles, timing, intervention, real/repeat workflow, defects,
support, value, retention, security, capability-ranking, verdict, and next
action evidence.

## Approval record

| Field             | Value                                                                  |
| ----------------- | ---------------------------------------------------------------------- |
| Decision          | Approved                                                               |
| Approved by       | `iamprasanna-dev`                                                      |
| Approval date     | 2026-08-12                                                             |
| Approved revision | `a46d365c5a0d630914909b6254691780e048317c`                             |
| Authorization     | Gate 4B repository implementation and private starter preparation only |

This approval does not authorize PR merge, public starter conversion, labels,
milestones, announcements, direct outreach, npm publication, or a Gate 4B
market verdict.
