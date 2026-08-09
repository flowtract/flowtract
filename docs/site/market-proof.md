---
layout: default
title: Market-gap proof
---

# Market-gap proof

Run the three tracked demonstrations after installing workspace dependencies:

```bash
npm run build
npm run market-proof:check
```

| Workflow      | Flowtract owns coherently                                                | A raw HTTP or Playwright project must compose                            |
| ------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Authenticated | Login contract, cookie isolation, CSRF extraction, secret state, cleanup | Cookie contexts, token extraction, collision policy, teardown, redaction |
| Lifecycle     | Declared errors, primary-error preservation, LIFO cleanup, disposal      | Error composition, cleanup registry, resource accounting, close races    |
| Contract      | Zod transforms, exact/default status, dry run, abort, diagnostics        | Validation order, result discrimination, cancellation mapping, safe logs |

The comparison is deliberately narrow. Flowtract uses Playwright as its default
HTTP transport; it does not replace Playwright, PactumJS, Karate, Postman,
Schemathesis, or every API-testing tool. Its proposed wedge is a coherent typed
lifecycle for authenticated, stateful REST workflow contracts.
