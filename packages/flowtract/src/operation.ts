import { z } from 'zod';
import { ConfigError } from './errors.js';
import type {
  OperationDefinition,
  OperationDefinitionInput,
  OperationRequestContract,
  ResponseContract
} from './operation-types.js';

const HTTP_METHODS = new Set(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']);

const OPERATION_MARKER = Symbol('flowtract.operation');
const PATH_PARAMETER_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const RESPONSE_STATUS = /^(?:[1-5]\d{2})$/;

type InvalidResponseKeys<Input extends OperationDefinitionInput> = Exclude<
  keyof Input['responses'],
  number | 'default'
>;

type ResponseKeyConstraint<Input extends OperationDefinitionInput> = [
  InvalidResponseKeys<Input>
] extends [never]
  ? unknown
  : {
      readonly responses: Input['responses'] & Record<InvalidResponseKeys<Input>, never>;
    };

function configurationError(message: string, path: string, operationId?: string): never {
  throw new ConfigError(message, {
    ...(operationId === undefined ? {} : { operationId }),
    details: { path, issues: [message] }
  });
}

function extractPathParameterNames(path: string, operationId?: string): Set<string> {
  const parameters = new Set<string>();
  const completeTemplate = /\{([^{}]+)\}/g;
  let match: RegExpExecArray | null;

  while ((match = completeTemplate.exec(path)) !== null) {
    const name = match[1];
    if (name === undefined || !PATH_PARAMETER_NAME.test(name)) {
      configurationError(
        `Path parameter "${name ?? ''}" is not a valid identifier.`,
        'path',
        operationId
      );
    }
    parameters.add(name);
  }

  const withoutTemplates = path.replace(completeTemplate, '');
  if (withoutTemplates.includes('{') || withoutTemplates.includes('}')) {
    configurationError('Path contains a malformed parameter template.', 'path', operationId);
  }

  return parameters;
}

function validatePathParameters(
  path: string,
  request: OperationRequestContract | undefined,
  operationId?: string
): void {
  const placeholders = extractPathParameterNames(path, operationId);
  const schema = request?.pathParams;

  if (placeholders.size > 0 && !(schema instanceof z.ZodObject)) {
    configurationError(
      'A Zod object pathParams schema is required for path placeholders.',
      'request.pathParams',
      operationId
    );
  }

  if (schema === undefined) {
    return;
  }

  const schemaKeys = new Set(schema.keyof().options);
  const missing = [...placeholders].filter(name => !schemaKeys.has(name));
  const unused = [...schemaKeys].filter(name => !placeholders.has(name));

  if (missing.length > 0 || unused.length > 0) {
    const issues = [
      ...(missing.length === 0 ? [] : [`Missing pathParams schema keys: ${missing.join(', ')}`]),
      ...(unused.length === 0 ? [] : [`Unused pathParams schema keys: ${unused.join(', ')}`])
    ];
    throw new ConfigError('Path placeholders and pathParams schema keys must match.', {
      ...(operationId === undefined ? {} : { operationId }),
      details: { path: 'request.pathParams', issues }
    });
  }
}

function cloneResponseContract(contract: ResponseContract): Readonly<ResponseContract> {
  const contentType = Array.isArray(contract.contentType)
    ? Object.freeze([...contract.contentType])
    : contract.contentType;
  return Object.freeze({
    body: contract.body,
    ...(contract.headers === undefined ? {} : { headers: contract.headers }),
    ...(contentType === undefined ? {} : { contentType })
  });
}

function validateResponses(
  responses: OperationDefinitionInput['responses'],
  operationId?: string
): Readonly<OperationDefinitionInput['responses']> {
  const entries = Object.entries(responses);
  if (entries.length === 0) {
    configurationError('At least one response contract is required.', 'responses', operationId);
  }

  const cloned: Record<string, Readonly<ResponseContract>> = {};
  for (const [key, contract] of entries) {
    if (key !== 'default' && !RESPONSE_STATUS.test(key)) {
      configurationError(
        `Response key "${key}" must be an HTTP status from 100 to 599 or "default".`,
        `responses.${key}`,
        operationId
      );
    }
    if (
      contract === null ||
      typeof contract !== 'object' ||
      !('body' in contract) ||
      !(contract.body instanceof z.ZodType)
    ) {
      configurationError(
        `Response "${key}" must define a Zod body schema.`,
        `responses.${key}.body`,
        operationId
      );
    }
    cloned[key] = cloneResponseContract(contract);
  }

  return Object.freeze(cloned);
}

export function defineOperation<const Input extends OperationDefinitionInput>(
  definition: Input & ResponseKeyConstraint<Input>
): OperationDefinition<Input> {
  const operationId = definition.id;
  if (operationId.trim().length === 0) {
    configurationError('Operation id must not be empty.', 'id');
  }
  if (operationId.trim() !== operationId) {
    configurationError(
      'Operation id must not contain leading or trailing whitespace.',
      'id',
      operationId
    );
  }
  if (!HTTP_METHODS.has(definition.method)) {
    configurationError(
      `Unsupported HTTP method "${String(definition.method)}".`,
      'method',
      operationId
    );
  }
  if (!definition.path.startsWith('/')) {
    configurationError('Operation path must start with "/".', 'path', operationId);
  }
  if (definition.path.includes('?') || definition.path.includes('#')) {
    configurationError(
      'Operation path must not contain a query string or fragment.',
      'path',
      operationId
    );
  }
  if (
    definition.timeoutMs !== undefined &&
    (!Number.isInteger(definition.timeoutMs) || definition.timeoutMs <= 0)
  ) {
    configurationError('Operation timeoutMs must be a positive integer.', 'timeoutMs', operationId);
  }
  if (
    definition.auth !== undefined &&
    definition.auth !== false &&
    definition.auth.trim().length === 0
  ) {
    configurationError('Operation auth profile must not be an empty string.', 'auth', operationId);
  }

  validatePathParameters(definition.path, definition.request, operationId);
  const responses = validateResponses(definition.responses, operationId);
  const request =
    definition.request === undefined ? undefined : Object.freeze({ ...definition.request });

  const operation = {
    ...definition,
    ...(request === undefined ? {} : { request }),
    responses
  };
  Object.defineProperty(operation, OPERATION_MARKER, {
    enumerable: false,
    value: true
  });

  return Object.freeze(operation) as unknown as OperationDefinition<Input>;
}
