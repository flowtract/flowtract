export const packageJson = {
  name: 'flowtract-gate1-consumer',
  version: '1.0.0',
  private: true,
  type: 'module'
};

export const esmRuntime = `
import { defineOperation, emptyBody } from 'flowtract';
import { z } from 'zod';

const operation = defineOperation({
  id: 'health.get',
  method: 'GET',
  path: '/health',
  responses: { 204: { body: emptyBody() } }
});

if (operation.id !== 'health.get' || operation.responses[204].body.parse(undefined) !== undefined) {
  throw new Error('ESM Flowtract consumer failed');
}
`;

export const cjsRuntime = `
const { defineOperation, emptyBody } = require('flowtract');

const operation = defineOperation({
  id: 'health.get',
  method: 'GET',
  path: '/health',
  responses: { 204: { body: emptyBody() } }
});

if (operation.id !== 'health.get' || operation.responses[204].body.parse(undefined) !== undefined) {
  throw new Error('CommonJS Flowtract consumer failed');
}
`;

export const typescriptEsm = `
import { z } from 'zod';
import {
  defineOperation,
  type AuthErrorDetails,
  type CleanupErrorDetails,
  type CleanupFailure,
  type ConfigErrorDetails,
  type ContractIssue,
  type DuplicateOperationErrorDetails,
  type FlowtractClient,
  type FlowtractErrorCode,
  type FlowtractErrorJson,
  type FlowtractErrorOptions,
  type HttpMethod,
  type InterpolationErrorDetails,
  type OperationDefinition,
  type OperationInput,
  type OperationResult,
  type RequestContractErrorDetails,
  type ResponseContractErrorDetails,
  type ResponseParseErrorDetails,
  type TransportErrorDetails,
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
type Result = OperationResult<typeof operation>;
const checkResult = (result: Result): string => {
  if (result.contractStatus === 201) return result.body.id;
  if (result.contractStatus === 400) return result.body.code;
  return result.body.message;
};

type PublicTypes = [
  AuthErrorDetails,
  CleanupErrorDetails,
  CleanupFailure,
  ConfigErrorDetails,
  ContractIssue,
  DuplicateOperationErrorDetails,
  FlowtractErrorCode,
  FlowtractErrorJson<'FLOWTRACT_CONFIG', ConfigErrorDetails>,
  FlowtractErrorOptions<ConfigErrorDetails>,
  HttpMethod,
  InterpolationErrorDetails,
  OperationDefinition,
  OperationInput<typeof operation>,
  RequestContractErrorDetails,
  ResponseContractErrorDetails,
  ResponseParseErrorDetails,
  TransportErrorDetails,
  UndeclaredStatusErrorDetails
];
declare const publicTypes: PublicTypes;
void publicTypes;

if (false) {
  client.execute(operation, { body: { quantity: '4' } }).then(checkResult);
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
