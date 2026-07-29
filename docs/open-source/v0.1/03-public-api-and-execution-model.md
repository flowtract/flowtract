# Public API and Execution Model

## Public entry points

The main `flowtract` entry point exports:

- `defineOperation`;
- `defineConfig`;
- `createFlowtract`;
- `FlowtractRuntime`;
- `FlowtractClient`;
- `FlowtractScenario`;
- `HttpTransport` and transport request/response types;
- `AuthProvider` and built-in auth factories;
- result, configuration, and error types;
- `emptyBody`.

`flowtract/cucumber` and `flowtract/testing` are specified separately.

The decision-complete Gate 2 signatures and lifecycle refinements are proposed
in the [Gate 2 public contracts](gate-2/02-public-contracts.md). They remain
unimplemented until the Gate 2 approval record is completed.

## Operation definition

An operation is immutable, runner-neutral, and explicit:

```ts
const CreatePart = defineOperation({
  id: 'parts.create',
  method: 'POST',
  path: '/api/parts',
  auth: 'session',
  timeoutMs: 20_000,
  request: {
    headers: z.object({
      'x-request-id': z.string().optional()
    }),
    query: z.object({}),
    pathParams: z.object({}),
    body: CreatePartBody
  },
  responses: {
    201: { body: Part },
    400: { body: ApiError },
    403: { body: ApiError }
  }
});
```

`id`, `method`, `path`, and at least one response are required. Request sections
are optional. Omitted sections accept no user-supplied values.

Supported methods are `GET`, `POST`, `PUT`, `PATCH`, `DELETE`, `HEAD`, and
`OPTIONS`.

## Request contract

`headers`, `query`, `pathParams`, and `body` accept Zod 4 schemas. Flowtract
MUST call public parsing APIs and send the parsed output so defaults,
coercions, refinements, and transformations take effect.

For each request section:

- absent input is parsed as `undefined`;
- a parse failure raises `FLOWTRACT_REQUEST_CONTRACT`;
- issues identify the request section and schema path;
- values are not logged unless verbose diagnostics are enabled;
- verbose diagnostics remain redacted.

Path placeholders use `{name}`. Every placeholder MUST have a corresponding
parsed path parameter, and unused path parameters are configuration errors.
Values are URL-component encoded exactly once.

`GET` and `HEAD` do not receive special validation exemptions. A body MAY be
defined for another method only when the operation explicitly declares one.

## Response contract

Each response entry has this extensible shape:

```ts
{
  body: ZodType;
  headers?: ZodType;
  contentType?: string | string[];
}
```

Response lookup uses the exact numeric status first, then optional `default`.
An unlisted status without `default` raises `FLOWTRACT_UNDECLARED_STATUS`.

`emptyBody()` is required for responses that intentionally have no body:

```ts
responses: {
  204: { body: emptyBody() },
}
```

JSON content types include `application/json` and structured `+json` media
types. Invalid JSON raises `FLOWTRACT_RESPONSE_PARSE`; it is never replaced
with an empty object. Text responses are decoded as UTF-8. Empty responses are
represented as `undefined`.

Contract validation failure raises `FLOWTRACT_RESPONSE_CONTRACT` and preserves
status, headers, duration, and a bounded redacted preview.

## Type behavior

`defineOperation` preserves literal operation IDs, methods, and status keys.
`execute` returns a discriminated union. Every result records both the actual
HTTP status and the response contract that matched:

```ts
const result = await client.execute(CreatePart, {
  body: { name: 'Engine', type: 'Assembly' }
});

if (result.status === 201) {
  result.body.id; // Part output type
} else {
  result.body.message; // declared error output type
}
```

Request input uses `z.input`; values exposed after parsing and all result bodies
use `z.output`.

For an exact response, `status` and `contractStatus` are the same numeric
literal. For a response matched through `default`, `status` is the actual
numeric status and `contractStatus` is `"default"`. TypeScript cannot subtract
specific numeric literals from the broad `number` type, so operations without a
`default` contract narrow through `status`, while default-capable operations
narrow soundly through `contractStatus`.

HTTP error statuses are ordinary declared results. Only configuration,
contract, parsing, authentication, interpolation, transport, and cleanup
problems throw Flowtract errors.

## Execution options and precedence

The client accepts:

```ts
{
  auth?: string | false;
  timeoutMs?: number;
  headers?: Record<string, unknown>;
  signal?: AbortSignal;
  dryRun?: boolean;
  unsafe?: {
    skipRequestValidation?: boolean;
  };
}
```

Precedence is invocation option → operation option → project configuration →
library default.

`unsafe.skipRequestValidation` bypasses only request schema parsing. Response
contracts, authentication, interpolation, redaction, and transport behavior
remain active. Dry-run performs configuration, interpolation, auth
application, and request validation but does not execute transport.

## Scenario lifecycle

`createFlowtract(config)` creates a reusable configured runtime.
`runtime.createScenario(metadata?)` creates isolated execution state.

A scenario owns:

- one transport session/cookie jar;
- named ordinary values;
- named secret values;
- the selected auth profile and provider state;
- ordered response summaries;
- a LIFO cleanup stack;
- diagnostic events.

The lifecycle is:

1. validate configuration and registered operation IDs;
2. create isolated transport state;
3. create scenario state;
4. execute operations;
5. run all cleanup actions in LIFO order;
6. dispose auth and transport resources;
7. finalize redacted artifacts.

Cleanup always runs. If the scenario and cleanup both fail, the primary failure
remains primary and cleanup failures are attached. Multiple cleanup failures
produce `FLOWTRACT_CLEANUP` with ordered causes.

## Scenario state and interpolation

The scenario exposes:

```ts
scenario.set('partId', value);
scenario.setSecret('csrfToken', value);
scenario.get('partId');
scenario.require('partId');
scenario.has('partId');
scenario.registerCleanup('delete created part', async () => {});
```

`{{name}}` references state:

- when the entire value is a reference, the original runtime type is retained;
- embedded references convert to strings;
- references are resolved recursively in arrays and plain objects;
- a missing value raises `FLOWTRACT_INTERPOLATION`;
- secret references are usable in requests but redacted in diagnostics;
- recursive/cyclic state references fail deterministically.

Path parameters are supplied through `pathParams`; interpolation is not a
substitute for path contract validation.

## Transport port

`HttpTransport` separates Flowtract semantics from HTTP execution:

```ts
interface HttpTransport {
  createSession(options: TransportSessionOptions): Promise<HttpTransportSession>;
}

interface HttpTransportSession {
  execute(request: TransportRequest): Promise<TransportResponse>;
  dispose(): Promise<void>;
}
```

The transport receives fully parsed, interpolated, and authenticated request
parts. It returns raw status, headers, bytes, URL, and duration. It MUST NOT
perform contract validation or convert HTTP error statuses into exceptions.

The default Playwright transport:

- creates one isolated `APIRequestContext` per scenario;
- retains cookies only within that scenario;
- defaults to a 30-second timeout;
- verifies TLS by default;
- uses `failOnStatusCode: false`;
- disposes every context exactly once;
- maps transport failures to `FLOWTRACT_TRANSPORT`.

No automatic request retry exists in `0.1.0`.

## Authentication port

An `AuthProvider` has scenario-local `setup`, `apply`, and optional `dispose`
hooks. It may update ordinary or secret scenario state and request parts, but
MUST NOT mutate an operation definition.

Built-ins:

- `bearerToken`;
- `apiKey`;
- `basicAuth`;
- `sessionAuth`.

`sessionAuth` accepts a user login callback/operation plus a typed post-login
callback. Playwright owns cookies; token extraction and CSRF injection are
explicit configuration. Flowtract does not assume response field names.

Unknown profiles, provider failures, or missing required auth state raise
`FLOWTRACT_AUTH`.

## Error taxonomy

Every public error extends `FlowtractError` and includes `code`, `message`,
`operationId` when applicable, `details`, and optional `cause`.

Stable `0.1` codes:

- `FLOWTRACT_CONFIG`;
- `FLOWTRACT_DUPLICATE_OPERATION`;
- `FLOWTRACT_REQUEST_CONTRACT`;
- `FLOWTRACT_TRANSPORT`;
- `FLOWTRACT_UNDECLARED_STATUS`;
- `FLOWTRACT_RESPONSE_PARSE`;
- `FLOWTRACT_RESPONSE_CONTRACT`;
- `FLOWTRACT_AUTH`;
- `FLOWTRACT_INTERPOLATION`;
- `FLOWTRACT_CLEANUP`.

Messages are human-readable. Codes and JSON detail shapes are the automation
contract.
