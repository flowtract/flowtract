---
layout: default
title: Evaluate Flowtract
---

# Evaluate Flowtract

Gate 4B is recruiting five TypeScript QA, SDET, or backend teams to evaluate
the published `flowtract@0.1.0` developer preview against authenticated,
stateful REST workflows.

The dedicated [Flowtract starter](https://github.com/flowtract/flowtract-starter)
uses the public npm package, a generated local session/CSRF service, two
isolated scenarios, typed contracts, secret-aware state, and deterministic
cleanup. It contacts no external API and collects no product telemetry or
analytics.

## Evaluation tasks

1. Run the starter unchanged and record elapsed whole minutes after dependency
   installation.
2. Adapt Flowtract to one real authenticated workflow with state spanning more
   than one REST request.
3. If the first workflow demonstrates value, attempt a second distinct
   workflow.

Plan for 30–60 minutes for the initial evaluation. Private repositories and
services are welcome; repository URLs, endpoints, payloads, credentials,
customer data, and proprietary source are never required.

Submit the structured
[Gate 4B evaluation](https://github.com/flowtract/flowtract/issues/new?template=gate4b-evaluation.yml),
ask usage questions in
[Q&A](https://github.com/flowtract/flowtract/discussions/categories/q-a), or
discuss product direction in
[Ideas](https://github.com/flowtract/flowtract/discussions/categories/ideas).
Report vulnerabilities only through
[private vulnerability reporting](https://github.com/flowtract/flowtract/security/advisories/new).

## Evidence and privacy

Useful evidence includes first-success time, where maintainer help was needed,
real and repeat workflow results, defects, documentation friction, missing
capabilities, support effort, meaningful value, and retention intent.

Flowtract collects no product telemetry or analytics. Public evidence is
opt-in. Never submit credentials, cookies, tokens, private source, endpoint
identities, customer data, proprietary payloads, or identifiable operational
details. Evaluators may select public attribution, anonymized aggregate use, or
aggregate count only.

Gate 4B evaluates a narrow product claim: a coherent typed lifecycle for
authenticated, stateful REST workflow contracts. It is not a beta,
production-readiness, enterprise-readiness, or universal replacement claim.
