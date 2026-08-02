export const packageJson = {
  name: 'flowtract-gate2-consumer',
  version: '1.0.0',
  private: true,
  type: 'module'
};

export const esmRuntime = `
import { createServer } from 'node:http';
import { bearerToken, createFlowtract, defineOperation } from 'flowtract';
import { z } from 'zod';

const operation = defineOperation({
  id: 'secured.get',
  method: 'GET',
  path: '/secured',
  auth: 'bearer',
  responses: { 200: { body: z.object({ ok: z.literal(true) }) } }
});
const server = createServer((request, response) => {
  const ok = request.headers.authorization === 'Bearer packed-secret';
  response.writeHead(ok ? 200 : 401, { 'content-type': 'application/json' });
  response.end(JSON.stringify({ ok }));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
try {
  const address = server.address();
  if (address === null || typeof address === 'string') throw new Error('Missing address');
  const runtime = createFlowtract({
    baseURL: \`http://127.0.0.1:\${address.port}\`,
    operations: [operation],
    auth: { bearer: bearerToken({ token: 'packed-secret' }) }
  });
  const result = await runtime.runScenario(scenario => scenario.execute(operation));
  if (result.status !== 200 || result.body.ok !== true) {
    throw new Error('ESM Flowtract consumer failed');
  }
} finally {
  await new Promise((resolve, reject) =>
    server.close(error => error === undefined ? resolve() : reject(error))
  );
}
`;

export const cjsRuntime = `
const { createFlowtract, defineOperation } = require('flowtract');
const { z } = require('zod');

const operation = defineOperation({
  id: 'health.get',
  method: 'GET',
  path: '/health',
  responses: { 200: { body: z.object({ ok: z.literal(true) }) } }
});

const transport = {
  async createSession() {
    return {
      async execute(request) {
        return {
          status: 200,
          headers: [['content-type', 'application/json']],
          body: new TextEncoder().encode(JSON.stringify({ ok: true })),
          url: request.url,
          durationMs: 1
        };
      },
      async dispose() {}
    };
  }
};

createFlowtract({
  baseURL: 'http://consumer.local',
  operations: [operation],
  transport
}).runScenario(scenario => scenario.execute(operation)).then(result => {
  if (result.status !== 200 || result.body.ok !== true) {
    throw new Error('CommonJS Flowtract consumer failed');
  }
});
`;

export const typescriptEsm = `
import { z } from 'zod';
import {
  defineOperation,
  type AuthErrorDetails,
  type AuthSetupContext,
  type CleanupErrorDetails,
  type CleanupFailure,
  type ConfigErrorDetails,
  type ContractIssue,
  type DuplicateOperationErrorDetails,
  type FlowtractClient,
  type FlowtractConfig,
  type FlowtractErrorCode,
  type FlowtractErrorJson,
  type FlowtractErrorOptions,
  type HttpMethod,
  type HttpTransport,
  type FlowtractRuntime,
  type FlowtractScenario,
  type InterpolationErrorDetails,
  type OperationDefinition,
  type OperationInput,
  type OperationResult,
  type RequestContractErrorDetails,
  type ResponseContractErrorDetails,
  type ResponseParseErrorDetails,
  type TransportErrorDetails,
  type TransportRequest,
  type TransportResponse,
  type UndeclaredStatusErrorDetails
} from 'flowtract';

const operation = defineOperation({
  id: 'parts.create',
  method: 'POST',
  path: '/parts',
  request: {
    body: z.object({
      quantity: z.coerce.number().int().positive()
    })
  },
  responses: {
    201: { body: z.object({ id: z.string() }) },
    400: { body: z.object({ code: z.string() }) },
    default: { body: z.object({ message: z.string() }) }
  }
});

declare const client: FlowtractClient;
declare const authSetup: AuthSetupContext;
declare const runtime: FlowtractRuntime;
declare const scenario: FlowtractScenario;
declare const transport: HttpTransport;
type Result = OperationResult<typeof operation>;
const checkResult = (result: Result): string => {
  if (result.contractStatus === 201) return result.body.id;
  if (result.contractStatus === 400) return result.body.code;
  return result.body.message;
};

type PublicTypes = [
  AuthErrorDetails,
  AuthSetupContext,
  CleanupErrorDetails,
  CleanupFailure,
  ConfigErrorDetails,
  ContractIssue,
  DuplicateOperationErrorDetails,
  FlowtractErrorCode,
  FlowtractErrorJson<'FLOWTRACT_CONFIG', ConfigErrorDetails>,
  FlowtractErrorOptions<ConfigErrorDetails>,
  FlowtractConfig,
  HttpMethod,
  InterpolationErrorDetails,
  OperationDefinition,
  OperationInput<typeof operation>,
  RequestContractErrorDetails,
  ResponseContractErrorDetails,
  ResponseParseErrorDetails,
  TransportErrorDetails,
  TransportRequest,
  TransportResponse,
  UndeclaredStatusErrorDetails
];
declare const publicTypes: PublicTypes;
void publicTypes;
void runtime;
void scenario;
void transport;

if (false) {
  client.execute(operation, { body: { quantity: '4' } }).then(checkResult);
  client.execute(
    operation,
    { body: { quantity: '4' } },
    { dryRun: true }
  ).then(result => result.dryRun);
  authSetup.execute(operation, { body: { quantity: '4' } });
  // @ts-expect-error auth setup cannot dry-run or override authentication
  authSetup.execute(operation, { body: { quantity: '4' } }, { dryRun: true });
}
`;

export const typescriptCjs = `
import { z } from 'zod';
import { defineOperation, type OperationInput } from 'flowtract';

const operation = defineOperation({
  id: 'parts.get',
  method: 'GET',
  path: '/parts/{partId}',
  request: {
    pathParams: z.object({ partId: z.string() })
  },
  responses: {
    200: { body: z.object({ id: z.string() }) }
  }
});

const input: OperationInput<typeof operation> = {
  pathParams: { partId: 'part-1' }
};

void input;
`;

export const tsconfigEsm = {
  compilerOptions: {
    target: 'ES2022',
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    strict: true,
    noEmit: true,
    skipLibCheck: false
  },
  include: ['consumer.ts']
};

export const tsconfigCjs = {
  compilerOptions: {
    target: 'ES2022',
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    strict: true,
    noEmit: true,
    skipLibCheck: false
  },
  include: ['consumer.cts']
};
