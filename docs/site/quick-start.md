---
layout: default
title: Five-minute quick start
---

# Five-minute quick start

Install the exact developer preview and its peers:

```bash
npm install flowtract@0.1.0 zod@^4 playwright@^1.62
```

Define a status-discriminated operation, create a runtime, execute one isolated
scenario, and let `runScenario` close every owned resource:

```ts
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

const runtime = createFlowtract({
  baseURL: 'http://127.0.0.1:3000',
  operations: [GetPart]
});

const result = await runtime.runScenario(scenario =>
  scenario.execute(GetPart, { pathParams: { id: 'part-1' } })
);
if (result.status === 200) console.log(result.body.name);
else console.log(result.body.message);
```

The packed README contains an executable local-server version of this example.
Use the [core guide](guide.md) for authentication, state, cancellation, cleanup,
history, diagnostics, and custom transports.
