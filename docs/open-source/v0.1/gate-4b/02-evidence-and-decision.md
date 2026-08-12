# Evidence and Decision Contract

## Canonical ledger

The repository maintains one privacy-safe Markdown ledger. Each row contains:

- evaluation ID;
- evidence visibility;
- Flowtract, Node, and operating-system profile;
- starter result and elapsed minutes;
- intervention class;
- real-workflow result;
- repeat-workflow result;
- meaningful-value response;
- retention or reuse intent;
- defect and blocker counts;
- initial response time and support effort;
- public evidence link when authorized;
- one state: `enrolled`, `starter-complete`, `real-workflow`,
  `repeat-workflow`, `blocked`, `withdrawn`, or `complete`.

Evaluation IDs use `G4B-E001`, `G4B-E002`, and sequential values. They do not
encode participant or repository identity.

The ledger must not contain participant names, private repository URLs,
endpoints, credentials, cookies, tokens, payloads, customer data, interview
transcripts, or identifiable operational details unless the participant has
explicitly authorized public attribution.

## Balanced acceptance thresholds

Gate 4B reaches `Market wedge validated` only when all conditions pass:

- five eligible external evaluations are complete;
- at least four complete the unchanged starter without synchronous
  intervention or maintainer-authored code;
- median first-success time is under ten minutes after installation;
- at least three complete one real authenticated and stateful workflow;
- at least two complete a second distinct workflow;
- at least three report meaningful reduction in auth, state, cleanup, or
  contract-composition burden;
- at least two intend to retain Flowtract or use it in another workflow;
- initial maintainer responses meet the two-business-day target;
- no unresolved critical/high security or correctness blocker remains.

The median uses successful eligible starter results only. With an even number
of results, it is the arithmetic mean of the two central values.

## Verdicts

After five eligible evaluations complete:

- **Validated:** every balanced threshold passes.
- **Conditionally validated:** at least three real workflows succeed, but one
  or more timing, intervention, repeat-use, value, retention, or support
  thresholds miss. The completion record must include a bounded remediation
  and reevaluation plan.
- **Not validated:** fewer than three real workflows succeed or fewer than two
  evaluators find enough value to retain or reuse Flowtract.
- **Blocked:** a critical/high security or correctness defect remains
  unresolved. No market verdict is issued until remediation evidence passes.

If fewer than five eligible evaluations complete, status is `Insufficient
external evidence`. A 14-day recruitment checkpoint may adjust discovery and
outreach, but it must not lower the evidence threshold.

Negative and conditional verdicts are valid learning outcomes. Gate 4B must not
reinterpret or omit evidence to force validation.

## Evidence validation

A Node-built-in-only repository check must validate:

- ledger table shape and unique sequential IDs;
- allowed states, results, consent classes, and intervention classes;
- complete rows required for a terminal verdict;
- documented thresholds and verdict terms;
- issue-form fields and required privacy confirmation;
- onboarding, support, security, and documentation links;
- supported package/version claims;
- absence of telemetry or analytics claims.

The check runs in full CI and the Markdown-only lane so routine evidence updates
do not trigger the runtime/package matrix.

## Capability prioritization

Each requested capability is ranked by:

1. independent evaluators affected;
2. severity and adoption impact;
3. fit with authenticated stateful REST workflow testing;
4. workaround quality;
5. public-contract and compatibility impact;
6. security and lifecycle risk;
7. implementation cost.

Documentation and bounded defects may be fixed during Gate 4B. Any npm patch
release requires separate exact-SHA authorization and registry proof. Large
capabilities require their own approved specification.

Command targeting becomes eligible for a later gate only when at least two
independent evaluators identify command workflows as a material need and a
separate public API, threat model, lifecycle integration, package impact, and
acceptance plan are approved.
