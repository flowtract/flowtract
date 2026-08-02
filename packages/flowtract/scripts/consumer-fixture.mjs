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
  createFlowtract,
  defineOperation,
  type AuthApplyContext,
  type AuthCreateContext,
  type AuthErrorDetails,
  type AuthProvider,
  type AuthProviderInstance,
  type AuthStateAccess,
  type AuthSetupContext,
  type CleanupErrorDetails,
  type CleanupFailure,
  type ConfigErrorDetails,
  type ContractIssue,
  type DuplicateOperationErrorDetails,
  type DryRunResult,
  type ErrorWithCleanup,
  type FlowtractClient,
  type FlowtractConfig,
  type FlowtractErrorCode,
  type FlowtractErrorJson,
  type FlowtractErrorOptions,
  type FlowtractExecutionOptions,
  type HttpMethod,
  type HttpTransport,
  type HttpTransportSession,
  type FlowtractRuntime,
  type FlowtractScenario,
  type InterpolationErrorDetails,
  type MutableAuthRequest,
  type OperationDefinition,
  type OperationInput,
  type OperationResult,
  type OperationSummary,
  type RedactionConfig,
  type RequestContractErrorDetails,
  type ResponseContractErrorDetails,
  type ResponseParseErrorDetails,
  type ScenarioMetadata,
  type SessionAuthOptions,
  type DiagnosticEvent,
  type TransportErrorDetails,
  type TransportHeader,
  type TransportRequest,
  type TransportResponse,
  type TransportSessionOptions,
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

const transport: HttpTransport = {
  async createSession() {
    return {
      async execute(request) {
        return {
          status: 201,
          headers: [['content-type', 'application/json']],
          body: new TextEncoder().encode('{"id":"typed-esm"}'),
          url: request.url,
          durationMs: 1
        };
      },
      async dispose() {}
    };
  }
};
const runtime = createFlowtract({
  baseURL: 'http://typed-esm.local',
  operations: [operation],
  transport
});
type Result = OperationResult<typeof operation>;
const checkResult = (result: Result): string => {
  if (result.contractStatus === 201) return result.body.id;
  if (result.contractStatus === 400) return result.body.code;
  return result.body.message;
};

type PublicTypes = [
  AuthApplyContext,
  AuthCreateContext,
  AuthErrorDetails,
  AuthProvider,
  AuthProviderInstance,
  AuthStateAccess,
  AuthSetupContext,
  CleanupErrorDetails,
  CleanupFailure,
  ConfigErrorDetails,
  ContractIssue,
  DuplicateOperationErrorDetails,
  DryRunResult<typeof operation>,
  ErrorWithCleanup,
  FlowtractClient,
  FlowtractErrorCode,
  FlowtractErrorJson<'FLOWTRACT_CONFIG', ConfigErrorDetails>,
  FlowtractErrorOptions<ConfigErrorDetails>,
  FlowtractConfig,
  FlowtractExecutionOptions,
  FlowtractRuntime,
  FlowtractScenario,
  HttpMethod,
  HttpTransport,
  HttpTransportSession,
  InterpolationErrorDetails,
  MutableAuthRequest,
  OperationDefinition,
  OperationInput<typeof operation>,
  OperationSummary,
  RedactionConfig,
  RequestContractErrorDetails,
  ResponseContractErrorDetails,
  ResponseParseErrorDetails,
  ScenarioMetadata,
  SessionAuthOptions<typeof operation>,
  DiagnosticEvent,
  TransportErrorDetails,
  TransportHeader,
  TransportRequest,
  TransportResponse,
  TransportSessionOptions,
  UndeclaredStatusErrorDetails
];
type _PublicTypesAreReachable = PublicTypes;

const result = await runtime.runScenario(scenario =>
  scenario.execute(operation, { body: { quantity: '4' } })
);
if (checkResult(result) !== 'typed-esm') throw new Error('TypeScript ESM consumer failed');
const dry = await runtime.runScenario(scenario =>
  scenario.execute(operation, { body: { quantity: '4' } }, { dryRun: true })
);
if (dry.dryRun !== true) throw new Error('TypeScript ESM dry run failed');

const checkSetup = (authSetup: AuthSetupContext, client: FlowtractClient): void => {
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
};
void checkSetup;
`;

export const typescriptCjs = `
import { z } from 'zod';
import { createFlowtract, defineOperation, type OperationInput } from 'flowtract';

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

const transport = {
  async createSession() {
    return {
      async execute(request: { url: string }) {
        return {
          status: 200,
          headers: [['content-type', 'application/json']] as const,
          body: new TextEncoder().encode('{"id":"part-1"}'),
          url: request.url,
          durationMs: 1
        };
      },
      async dispose() {}
    };
  }
};

async function main(): Promise<void> {
  const result = await createFlowtract({
    baseURL: 'http://typed-cjs.local',
    operations: [operation],
    transport
  }).runScenario(scenario => scenario.execute(operation, input));
  if (result.body.id !== 'part-1') throw new Error('TypeScript CommonJS consumer failed');
}
void main();
`;

export const tsconfigEsm = {
  compilerOptions: {
    target: 'ES2022',
    module: 'NodeNext',
    moduleResolution: 'NodeNext',
    strict: true,
    outDir: 'dist-esm',
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
    outDir: 'dist-cjs',
    skipLibCheck: false
  },
  include: ['consumer.cts']
};
