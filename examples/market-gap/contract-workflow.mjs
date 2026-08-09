import { createFlowtract, defineOperation } from 'flowtract';
import { z } from 'zod';

const secret = 'contract-demo-generated-secret';
const Operation = defineOperation({
  id: 'contract.execute',
  method: 'POST',
  path: '/items/{id}',
  request: {
    pathParams: z.object({ id: z.coerce.string() }),
    body: z.object({ count: z.coerce.number().int() })
  },
  responses: {
    200: { body: z.object({ count: z.number() }) },
    default: { body: z.object({ message: z.string() }) }
  }
});
let requests = 0;
const transport = {
  async createSession() {
    return {
      async execute(request) {
        requests += 1;
        if (request.signal?.aborted === true) throw request.signal.reason;
        const parsed = JSON.parse(new TextDecoder().decode(request.body));
        return {
          status: parsed.count > 0 ? 200 : 422,
          headers: [['content-type', 'application/json']],
          body: new TextEncoder().encode(
            JSON.stringify(parsed.count > 0 ? { count: parsed.count } : { message: 'invalid' })
          ),
          url: request.url,
          durationMs: 0
        };
      },
      async dispose() {}
    };
  }
};
const runtime = createFlowtract({
  baseURL: 'http://contract.demo',
  operations: [Operation],
  transport
});
await runtime.runScenario(async scenario => {
  scenario.setSecret('token', secret);
  const dry = await scenario.execute(
    Operation,
    { pathParams: { id: 7 }, body: { count: '2' } },
    { dryRun: true }
  );
  if (dry.dryRun !== true || requests !== 0 || !dry.url.endsWith('/items/7')) {
    throw new Error('Dry-run contract failed.');
  }
  const accepted = await scenario.execute(Operation, {
    pathParams: { id: 7 },
    body: { count: '2' }
  });
  const declared = await scenario.execute(Operation, {
    pathParams: { id: 7 },
    body: { count: '0' }
  });
  if (
    accepted.status !== 200 ||
    accepted.body.count !== 2 ||
    declared.contractStatus !== 'default'
  ) {
    throw new Error('Transform or exact/default response contract failed.');
  }
  const controller = new AbortController();
  controller.abort(new Error('caller abort'));
  try {
    await scenario.execute(
      Operation,
      { pathParams: { id: 7 }, body: { count: 1 } },
      { signal: controller.signal }
    );
    throw new Error('Aborted execution unexpectedly succeeded.');
  } catch (error) {
    if (error?.code !== 'FLOWTRACT_TRANSPORT') throw error;
  }
  if (JSON.stringify(scenario.diagnostics()).includes(secret)) {
    throw new Error('Secret escaped into contract diagnostics.');
  }
});
console.log('contract-workflow: passed');
