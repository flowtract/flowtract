import type { z } from 'zod';

/** HTTP methods supported by Flowtract's REST operation contract. */
export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type FlowtractSchema = z.ZodType;

export interface OperationRequestContract {
  readonly headers?: FlowtractSchema;
  readonly query?: FlowtractSchema;
  readonly pathParams?: z.ZodObject;
  readonly body?: FlowtractSchema;
}

export interface ResponseContract {
  readonly body: FlowtractSchema;
  readonly headers?: FlowtractSchema;
  readonly contentType?: string | readonly string[];
}

export type OperationResponses = Partial<Record<number, ResponseContract>> & {
  readonly default?: ResponseContract;
};

export interface OperationDefinitionInput {
  readonly id: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly auth?: string | false;
  readonly timeoutMs?: number;
  readonly request?: OperationRequestContract;
  readonly responses: OperationResponses;
}

declare const operationDefinitionMarker: unique symbol;

/** An immutable operation definition created by {@link defineOperation}. */
export type OperationDefinition<Input extends OperationDefinitionInput = OperationDefinitionInput> =
  Readonly<Input> & {
    readonly [operationDefinitionMarker]: true;
  };

type DefinitionInputOf<Operation> =
  Operation extends OperationDefinition<infer Input> ? Input : never;

type RequestOf<Operation> =
  DefinitionInputOf<Operation> extends { readonly request: infer Request }
    ? Request
    : Record<never, never>;

type SchemaAt<Request, Key extends PropertyKey> = Key extends keyof Request
  ? Request[Key] extends FlowtractSchema
    ? Request[Key]
    : never
  : never;

type InputSection<Request, Key extends 'headers' | 'query' | 'pathParams' | 'body'> = [
  SchemaAt<Request, Key>
] extends [never]
  ? { readonly [Property in Key]?: never }
  : undefined extends z.input<SchemaAt<Request, Key>>
    ? { readonly [Property in Key]?: z.input<SchemaAt<Request, Key>> }
    : { readonly [Property in Key]: z.input<SchemaAt<Request, Key>> };

type OutputSection<Request, Key extends 'headers' | 'query' | 'pathParams' | 'body'> = [
  SchemaAt<Request, Key>
] extends [never]
  ? { readonly [Property in Key]?: never }
  : { readonly [Property in Key]: z.output<SchemaAt<Request, Key>> };

type Simplify<Value> = { readonly [Key in keyof Value]: Value[Key] };

/** The caller-facing, pre-Zod input inferred from an operation definition. */
export type OperationInput<Operation extends OperationDefinition> = Simplify<
  InputSection<RequestOf<Operation>, 'headers'> &
    InputSection<RequestOf<Operation>, 'query'> &
    InputSection<RequestOf<Operation>, 'pathParams'> &
    InputSection<RequestOf<Operation>, 'body'>
>;

export type ParsedOperationInput<Operation extends OperationDefinition> = Simplify<
  OutputSection<RequestOf<Operation>, 'headers'> &
    OutputSection<RequestOf<Operation>, 'query'> &
    OutputSection<RequestOf<Operation>, 'pathParams'> &
    OutputSection<RequestOf<Operation>, 'body'>
>;

type ResponsesOf<Operation> =
  DefinitionInputOf<Operation> extends { readonly responses: infer Responses } ? Responses : never;

type BodyOutput<Contract> = Contract extends { readonly body: infer Schema extends FlowtractSchema }
  ? z.output<Schema>
  : never;

type HeaderOutput<Contract> = Contract extends {
  readonly headers: infer Schema extends FlowtractSchema;
}
  ? z.output<Schema>
  : Readonly<Record<string, string>>;

type OperationId<Operation> =
  DefinitionInputOf<Operation> extends { readonly id: infer Id extends string } ? Id : string;

type ExactResult<Operation, Status extends number, Contract> = {
  readonly operationId: OperationId<Operation>;
  readonly status: Status;
  readonly contractStatus: Status;
  readonly body: BodyOutput<Contract>;
  readonly headers: HeaderOutput<Contract>;
  readonly durationMs: number;
};

type DefaultResult<Operation, Contract> = {
  readonly operationId: OperationId<Operation>;
  readonly status: number;
  readonly contractStatus: 'default';
  readonly body: BodyOutput<Contract>;
  readonly headers: HeaderOutput<Contract>;
  readonly durationMs: number;
};

type ResponseResultMember<Operation, Responses, Key extends keyof Responses> = Key extends number
  ? ExactResult<Operation, Key, Responses[Key]>
  : Key extends 'default'
    ? DefaultResult<Operation, Responses[Key]>
    : never;

/** The status-discriminated, post-Zod result of a sent operation. */
export type OperationResult<Operation extends OperationDefinition> = {
  [Key in keyof ResponsesOf<Operation>]: ResponseResultMember<
    Operation,
    ResponsesOf<Operation>,
    Key
  >;
}[keyof ResponsesOf<Operation>];

/** Per-execution overrides; invocation values take precedence over operation and runtime defaults. */
export interface FlowtractExecutionOptions {
  readonly auth?: string | false;
  readonly timeoutMs?: number;
  readonly headers?: Readonly<Record<string, unknown>>;
  readonly signal?: AbortSignal;
  readonly unsafe?: {
    readonly skipRequestValidation?: boolean;
  };
}

/** A redacted description returned when `dryRun: true` prevents target-operation transport I/O. */
export interface DryRunResult<Operation extends OperationDefinition> {
  readonly operationId: OperationId<Operation>;
  readonly dryRun: true;
  readonly method: Operation['method'];
  readonly url: string;
  readonly headerNames: readonly string[];
  readonly bodyPresent: boolean;
  readonly timeoutMs: number;
  readonly auth: string | false;
  readonly warnings: readonly string[];
}

export type ExecuteArguments<
  Operation extends OperationDefinition,
  Options extends FlowtractExecutionOptions & { readonly dryRun?: boolean }
> =
  Record<string, never> extends OperationInput<Operation>
    ? readonly [input?: OperationInput<Operation>, options?: Options]
    : readonly [input: OperationInput<Operation>, options?: Options];

export type DryRunExecuteArguments<Operation extends OperationDefinition> =
  Record<string, never> extends OperationInput<Operation>
    ? readonly [
        input: OperationInput<Operation> | undefined,
        options: FlowtractExecutionOptions & { readonly dryRun: true }
      ]
    : readonly [
        input: OperationInput<Operation>,
        options: FlowtractExecutionOptions & { readonly dryRun: true }
      ];

/** The restricted operation-execution surface shared by scenarios and close-scoped cleanup clients. */
export interface FlowtractClient {
  execute<const Operation extends OperationDefinition>(
    operation: Operation,
    ...arguments_: DryRunExecuteArguments<Operation>
  ): Promise<DryRunResult<Operation>>;

  execute<const Operation extends OperationDefinition>(
    operation: Operation,
    ...arguments_: ExecuteArguments<
      Operation,
      FlowtractExecutionOptions & { readonly dryRun?: false }
    >
  ): Promise<OperationResult<Operation>>;
}
