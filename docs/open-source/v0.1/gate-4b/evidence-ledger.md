# Gate 4B Evidence Ledger

> **Status:** Insufficient external evidence — cohort not launched

This ledger contains consented, privacy-safe aggregate evidence only. It must
not contain participant names, private repository URLs, endpoint identities,
credentials, cookies, tokens, payloads, customer data, interview transcripts,
or identifiable operational details unless public attribution is explicitly
authorized.

Allowed visibility values are `public`, `anonymized`, and `aggregate-only`.
Allowed states are `enrolled`, `starter-complete`, `real-workflow`,
`repeat-workflow`, `blocked`, `withdrawn`, and `complete`.

| ID  | Visibility | Profile | Starter | Minutes | Intervention | Real workflow | Repeat workflow | Value | Retention | Defects | Blockers | Response hours | Support minutes | Evidence | State |
| --- | ---------- | ------- | ------- | ------: | ------------ | ------------- | --------------- | ----- | --------- | ------: | -------: | -------------: | --------------: | -------- | ----- |

Add one row per eligible evaluation using sequential IDs beginning with
`G4B-E001`. Use `-` only where evidence is not yet available. Public evidence
links require participant consent; otherwise use `-`.

Row values use these exact tokens:

- starter: `pending`, `pass`, `fail`, or `withdrawn`;
- intervention: `pending`, `none`, `documentation`, `synchronous`,
  `maintainer-code`, or `abandoned`;
- real/repeat workflow: `pending`, `pass`, `fail`, `not-attempted`, or
  `withdrawn`;
- value/retention: `pending`, `yes`, `no`, `unsure`, or `withdrawn`;
- numeric fields: a non-negative integer or `-`; starter minutes must be a
  positive integer after success;
- profile: `flowtract 0.1.0; Node 22|24; Windows|Linux|macOS|Other`;
- evidence: an approved public Flowtract issue/discussion URL or `-`.

## Current aggregate

- Eligible completed evaluations: 0 of 5.
- Unchanged starter successes without disqualifying intervention: 0 of 4.
- Median first-success time: unavailable.
- Real authenticated workflow successes: 0 of 3.
- Repeat workflow successes: 0 of 2.
- Meaningful-value confirmations: 0 of 3.
- Retention or reuse intentions: 0 of 2.
- Two-business-day response target: not yet exercised.
- Unresolved critical/high blockers: 0.
- Current verdict: `Insufficient external evidence`.
