import { z } from 'zod';
import {
  defineOperation,
  type FlowtractClient,
  type OperationInput,
  type OperationResult
} from '../../src/index.js';
import { ApiErrorSchema, CreatePart, ListParts, PartSchema } from '../fixtures/operations.js';

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Assert<Condition extends true> = Condition;

type CreateInput = OperationInput<typeof CreatePart>;
type _CreateBodyInput = Assert<
  Equal<
    CreateInput['body'],
    {
      name: string;
      type: 'Assembly' | 'Component';
      description?: string | undefined;
      attributes?: Record<string, unknown> | undefined;
    }
  >
>;

type CreateResult = OperationResult<typeof CreatePart>;
type CreateSuccess = Extract<CreateResult, { status: 201 }>;
type _CreateSuccessBody = Assert<Equal<CreateSuccess['body'], z.output<typeof PartSchema>>>;
type _CreateSuccessHeaders = Assert<Equal<CreateSuccess['headers'], { etag: string }>>;
type CreateFailure = Extract<CreateResult, { status: 400 }>;
type _CreateFailureBody = Assert<Equal<CreateFailure['body'], z.output<typeof ApiErrorSchema>>>;

type ListResult = OperationResult<typeof ListParts>;
type ListDefault = Extract<ListResult, { contractStatus: 'default' }>;
type _ListDefaultBody = Assert<Equal<ListDefault['body'], z.output<typeof ApiErrorSchema>>>;

export async function assertClientTypes(client: FlowtractClient): Promise<void> {
  client.execute(CreatePart, {
    body: { name: 'Engine', type: 'Assembly' }
  });

  // @ts-expect-error body is required
  client.execute(CreatePart, {});

  client.execute(ListParts);

  client.execute(ListParts, {
    query: { page: '2', limit: '10' }
  });

  // @ts-expect-error undeclared request section
  client.execute(ListParts, { body: {} });

  const createResult = await client.execute(CreatePart, {
    body: { name: 'Engine', type: 'Assembly' }
  });
  if (createResult.status === 201) {
    const id: string = createResult.body.id;
    void id;
    // @ts-expect-error success body is not an API error
    const code = createResult.body.code;
    void code;
  }

  const listResult = await client.execute(ListParts);
  if (listResult.contractStatus === 'default') {
    const code: string = listResult.body.code;
    void code;
    // @ts-expect-error default body is not the successful list body
    const items = listResult.body.items;
    void items;
  }
}

defineOperation({
  id: 'valid.head',
  method: 'HEAD',
  path: '/valid',
  responses: { 204: { body: z.undefined() } }
});

defineOperation({
  id: 'invalid.method',
  // @ts-expect-error TRACE is not supported
  method: 'TRACE',
  path: '/invalid',
  responses: { 200: { body: z.string() } }
});

defineOperation({
  id: 'invalid.response-key',
  method: 'GET',
  path: '/invalid',
  responses: {
    // @ts-expect-error response keys must be numeric or default
    unexpected: { body: z.string() }
  }
});
