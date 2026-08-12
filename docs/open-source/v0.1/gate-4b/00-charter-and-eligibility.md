# Charter and Participant Eligibility

## Objective

Gate 4B answers one product question:

> Can an external TypeScript QA or backend team install the released package,
> model a real authenticated and stateful REST workflow, obtain useful results,
> and choose to use Flowtract again?

The proposed wedge is deliberately narrow: Flowtract provides a coherent typed
lifecycle for authenticated, stateful REST workflow contracts. Gate 4B does
not claim that Flowtract replaces Playwright, Postman, PactumJS, Karate,
Schemathesis, or every API-testing tool.

## Eligible evaluators

An evaluation is eligible only when all of the following are true:

- the evaluator is a TypeScript QA engineer, SDET, backend developer, or a team
  performing equivalent work;
- the evaluator uses Node 22 or Node 24;
- the repository, service, or intended workflow is not controlled by a
  Flowtract maintainer;
- the intended workflow uses the public `flowtract@0.1.0` registry artifact;
- the real-workflow attempt includes authentication and state spanning more
  than one REST request;
- the evaluator opts in to the evidence protocol and removes credentials,
  endpoints, payloads, customer data, and private source from public material.

Private repositories and services are eligible. Repository URLs, organization
names, endpoint identities, credentials, proprietary payloads, and operational
details are never required.

Maintainer-owned examples, forks that only repeat the starter, automated npm
downloads, stars, and unauthenticated one-request examples do not count as
eligible external evaluations.

## Cohort and responsibilities

The first cohort contains five eligible external repository evaluations.
Evaluators are asked to:

1. run the dedicated starter unchanged;
2. adapt Flowtract to one real authenticated and stateful workflow;
3. attempt a second distinct workflow when the first demonstrates value;
4. report time, intervention, defects, missing capabilities, repeat use, and
   retention intent through the approved intake;
5. avoid submitting secrets or identifiable private operational data.

The maintainer must:

- acknowledge questions and evaluation reports within two business days;
- distinguish documentation clarification from live intervention or
  maintainer-authored code;
- preserve participant privacy and consent choices;
- classify defects separately from capability requests;
- avoid promising private features or prioritization in exchange for
  participation;
- stop public processing of evidence when a participant withdraws consent.

## Evidence tracks

Gate 4B measures:

- discovery and first-success time;
- completion without synchronous maintainer intervention;
- success on one real authenticated workflow;
- success on a second distinct workflow;
- whether Flowtract reduces auth, state, cleanup, and contract-composition
  burden;
- retention or reuse intent;
- defects, documentation friction, support effort, and missing capabilities.

Stars and download counts may describe discovery, but they are not adoption or
readiness evidence.

## Privacy and consent

Flowtract adds no telemetry or analytics. Evidence is opt-in through GitHub
issues, Discussions, interviews, and voluntarily supplied summaries.

Public evidence links are recorded only when the participant selects public
attribution or anonymized public summary. Private interview notes remain
outside the repository. Only consented aggregates that cannot identify a
participant, repository, service, endpoint, or customer may enter the canonical
record.

GitHub Security Advisories are reserved for vulnerability reports and must not
be used as a private market-feedback channel.

## Explicit exclusions

Gate 4B does not authorize a new npm version, Cucumber, a project CLI,
configuration loading, generators, reporters, command execution, OpenAPI
generation, additional protocols, telemetry, hosted services, or beta,
production-candidate, production-ready, or enterprise-ready claims.
