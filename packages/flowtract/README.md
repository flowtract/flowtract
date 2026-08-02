# Flowtract

Flowtract is a TypeScript-first core for contract-verified, stateful REST API
workflows. It combines Zod input/output contracts, isolated scenarios,
Playwright HTTP sessions, authentication, secret-aware interpolation,
diagnostics, dry runs, cancellation, and deterministic cleanup.

> Gate 3 core production candidate. The package remains private and
> unpublished. This is not a production-readiness claim; Cucumber, a project
> CLI, configuration loading, command execution, retries, and reporting remain
> outside this release.

## Supported versions

- Node.js `^22.0.0 || ^24.0.0` on Windows, Ubuntu, and macOS.
- TypeScript 5.5.4, 6.0.2, and 7.0.2.
- Zod `^4.0.0` (reviewed from 4.0.0 through 4.4.3).
- Playwright `^1.62.0` (reviewed from 1.62.0 through 1.62.1).
- Root import only: `flowtract`. Deep imports are unsupported.

Install the package with its peers after it is made available through an
authorized distribution channel:

```text
npm install flowtract zod playwright
```

## Five-minute quick start

This complete example starts a local HTTP service, executes a typed operation
with the default Playwright transport, narrows the response by status, and
closes both scenario and server resources.

```js flowtract-example=run
import { createServer } from 'node:http';
import { createFlowtract, defineOperation } from 'flowtract';
import { z } from 'zod';

const GetPart = defineOperation({
  id: 'parts.get',
  method: 'GET',
  path: '/parts/{id}',
  request: { pathParams: z.object({ id: z.string() }) },
  responses: {
    200: { body: z.object({ id: z.string(), name: z.string() }) },
    404: { body: z.object({ message: z.string() }) }
  }
});

const server = createServer((request, response) => {
  const found = request.url === '/parts/part-1';
  response.writeHead(found ? 200 : 404, { 'content-type': 'application/json' });
  response.end(
    JSON.stringify(found ? { id: 'part-1', name: 'bearing' } : { message: 'not found' })
  );
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

try {
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Server did not bind.');
  const runtime = createFlowtract({
    baseURL: `http://127.0.0.1:${address.port}`,
    operations: [GetPart]
  });
  const result = await runtime.runScenario(scenario =>
    scenario.execute(GetPart, { pathParams: { id: 'part-1' } })
  );
  if (result.status === 200) console.log(result.body.name);
  else console.log(result.body.message);
} finally {
  await new Promise((resolve, reject) =>
    server.close(error => (error === undefined ? resolve() : reject(error)))
  );
}
```

`createFlowtract` snapshots and freezes Flowtract-owned configuration
containers. Every `createScenario` receives new state, auth instances, cookies,
history, diagnostics, and a transport session. A scenario permits one external
operation at a time and `close()` is idempotent.

## Authentication

Built-in factories fail on caller/auth collisions instead of overwriting
headers or query values. Session authentication performs login through the
same scenario transport and leaves token/cookie extraction to the project.

```ts flowtract-example=compile
import { apiKey, basicAuth, bearerToken, sessionAuth, type AuthProvider } from 'flowtract';
import { z } from 'zod';
import { defineOperation } from 'flowtract';

const Login = defineOperation({
  id: 'auth.login',
  method: 'POST',
  path: '/login',
  request: { body: z.object({ username: z.string(), password: z.string() }) },
  responses: { 200: { body: z.object({ csrf: z.string() }) } }
});
const syntheticPassphrase = ['example', 'only'].join('-');

const providers: Record<string, AuthProvider> = {
  bearer: bearerToken({ token: state => String(state.require('token')) }),
  headerKey: apiKey({ in: 'header', name: 'x-api-key', value: 'key' }),
  queryKey: apiKey({ in: 'query', name: 'api_key', value: 'key' }),
  basic: basicAuth({ username: 'user', password: syntheticPassphrase }),
  session: sessionAuth({
    login: Login,
    input: { body: { username: 'user', password: syntheticPassphrase } },
    afterLogin(result, state) {
      if (result.status === 200) state.setSecret('csrf', result.body.csrf);
    },
    csrf: { state: 'csrf', header: 'x-csrf-token' }
  })
};

void providers;
```

Auth precedence is invocation option, operation, runtime `defaultAuth`, then
`false`. Provider creation/setup is lazy and single-flight per profile and
scenario. Providers dispose in reverse initialization order.

## State, interpolation, and redaction

Use `set` for ordinary data and `setSecret` for credentials. A name cannot
change classification. Whole `{{name}}` references preserve type; embedded
references render supported primitives. Missing, cyclic, malformed, too-deep,
or oversized interpolation fails with `FLOWTRACT_INTERPOLATION`.

```ts flowtract-example=compile
import type { FlowtractScenario } from 'flowtract';

declare const scenario: FlowtractScenario;
scenario.set('partId', 'part-1');
scenario.setSecret('token', 'generated-token');
const input = {
  pathParams: { id: '{{partId}}' },
  headers: { authorization: 'Bearer {{token}}' }
};
void input;
```

Secrets are replaced longest-first in diagnostics and error previews. Built-in
credential headers/keys are always structurally redacted. Diagnostics omit raw
bodies, raw headers, state, stacks, and causes. Operation results remain
application data; callers must handle them according to their own security
policy.

## Dry run, cancellation, and cleanup

Dry run validates and normalizes the invocation, may lazily perform auth setup,
but does not send the target operation. Cancellation uses the caller's
`AbortSignal`. Closing immediately rejects new external work, waits for current
work, then runs LIFO cleanup, reverse auth disposal, and transport disposal.

```ts flowtract-example=compile
import type { FlowtractScenario, OperationDefinition } from 'flowtract';

declare const scenario: FlowtractScenario;
declare const operation: OperationDefinition;
const controller = new AbortController();

if (false) {
  const dry = await scenario.execute(operation, undefined, { dryRun: true });
  console.log(dry.url, dry.headerNames);
  await scenario.execute(operation, undefined, { signal: controller.signal });
  scenario.registerCleanup('delete-created-resource', async cleanup => {
    await cleanup.execute(operation);
  });
}
```

Cleanup clients are valid only while their action runs, share the scenario's
state/auth/cookies/transport, allow one operation at a time, and cannot register
more cleanup. All cleanup and disposal failures are aggregated without skipping
later attempts.

## Custom transport

Use a custom transport for deterministic tests or an alternate HTTP stack. One
session is created per scenario; it owns every response/request resource and
must make `dispose()` safe to call exactly once through Flowtract.

```ts flowtract-example=compile
import { type HttpTransport } from 'flowtract';

const transport: HttpTransport = {
  async createSession() {
    return {
      async execute(request) {
        return {
          status: 200,
          headers: [['content-type', 'application/json']],
          body: new TextEncoder().encode('{"ok":true}'),
          url: request.url,
          durationMs: 0
        };
      },
      async dispose() {}
    };
  }
};

void transport;
```

## History and diagnostics

`history()` returns immutable successful exchange summaries with `auth`,
`operation`, or `cleanup` phase. `diagnostics()` returns immutable, redacted
schema-version-1 events. Both return snapshots; neither exposes mutable runtime
state.

## Errors and troubleshooting

Every Flowtract error has a stable `code`. `toJSON()` is bounded, JSON-safe,
cause-free, and stack-free.

| Code                            | Typical phases                        | Corrective action                                                                                             |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `FLOWTRACT_CONFIG`              | configuration, scenario lifecycle     | Fix the named path, register the exact operation object, or stop using a closing scenario.                    |
| `FLOWTRACT_DUPLICATE_OPERATION` | registration                          | Give each operation a unique ID.                                                                              |
| `FLOWTRACT_REQUEST_CONTRACT`    | request validation/normalization      | Inspect `details.section` and issues; declare option headers and use serializable scalar/query/header shapes. |
| `FLOWTRACT_TRANSPORT`           | session, request                      | Inspect `details.kind`; distinguish timeout, caller abort, TLS, network, and unknown failures.                |
| `FLOWTRACT_UNDECLARED_STATUS`   | response selection                    | Add an exact status or `default` response contract.                                                           |
| `FLOWTRACT_RESPONSE_PARSE`      | response decoding                     | Correct content type, UTF-8, or JSON; previews are bounded and redacted.                                      |
| `FLOWTRACT_RESPONSE_CONTRACT`   | response validation                   | Correct the server response or Zod response schema.                                                           |
| `FLOWTRACT_AUTH`                | `create`, `setup`, `apply`, `dispose` | Check the profile and phase; remove header/query collisions and validate extracted credentials.               |
| `FLOWTRACT_INTERPOLATION`       | state/interpolation                   | Define the reference, remove cycles/malformed templates, or keep values within bounds.                        |
| `FLOWTRACT_CLEANUP`             | cleanup/disposal                      | Inspect every ordered failure; later cleanup/disposal attempts have already run.                              |

When a scenario callback fails and closing also fails, Flowtract preserves the
primary `Error` and attaches a non-enumerable `cleanupError`. Use
`hasCleanupError(error)` to narrow it. Non-`Error` or non-extensible failures
are wrapped only when cleanup evidence otherwise could not be retained.

TLS certificate verification is enabled by default. Set `allowInsecureTls`
only for an explicitly controlled test endpoint; Flowtract emits a warning
diagnostic when it is enabled.

## Compatibility and non-goals

The `0.1` line preserves root export names, stable error codes, diagnostic
schema version 1, and accepted operation/result semantics. Normal SemVer rules
apply; deprecations must precede removal where practical. Undocumented deep
imports receive no compatibility guarantee.

Flowtract is not a general infrastructure orchestrator. Gate 3 adds no
Cucumber adapter, project CLI, configuration loader, generator, reporter,
retry, command target, additional protocol, telemetry, npm publication, or
production-ready claim.
