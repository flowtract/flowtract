import { z } from 'zod';
import { ConfigError } from './errors.js';
import type {
  OperationDefinition,
  OperationDefinitionInput,
  OperationRequestContract,
  ResponseContract
} from './operation-types.js';
import {
  defineSafeData,
  safeArrayValues,
  safeIsArray,
  safeOwnEntries,
  type SafeOwnEntry
} from './internal/safe-inspection.js';

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

function inspectDataRecord(
  value: unknown,
  path: string,
  operationId?: string
): readonly SafeOwnEntry[] {
  if (value === null || (typeof value !== 'object' && typeof value !== 'function')) {
    configurationError(`${path} must be an object with data properties.`, path, operationId);
  }
  const inspected = safeOwnEntries(value);
  if (!inspected.ok || inspected.entries.some(entry => entry.kind !== 'data')) {
    configurationError(
      `${path} must be inspectable without invoking accessors or proxy traps.`,
      path,
      operationId
    );
  }
  return inspected.entries;
}

function entryValue(entries: readonly SafeOwnEntry[], key: string): unknown {
  return entries.find(entry => entry.key === key)?.value;
}

function cloneEnumerableData(entries: readonly SafeOwnEntry[]): Record<string, unknown> {
  const output: Record<string, unknown> = {};
  for (const entry of entries) {
    if (entry.enumerable) defineSafeData(output, entry.key, entry.value);
  }
  return output;
}

function safeInstanceOf(value: unknown, constructor: unknown): boolean {
  try {
    return value instanceof (constructor as new (...arguments_: never[]) => object);
  } catch {
    return false;
  }
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

  if (schema !== undefined && !safeInstanceOf(schema, z.ZodObject)) {
    configurationError(
      'A Zod object pathParams schema is required for path placeholders.',
      'request.pathParams',
      operationId
    );
  }

  if (schema === undefined) {
    return;
  }

  let schemaKeys: Set<string>;
  try {
    schemaKeys = new Set(schema.keyof().options);
  } catch {
    configurationError(
      'The pathParams schema could not be inspected safely.',
      'request.pathParams',
      operationId
    );
  }
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

function cloneResponseContract(
  entries: readonly SafeOwnEntry[],
  key: string,
  operationId?: string
): Readonly<ResponseContract> {
  const body = entryValue(entries, 'body');
  const headers = entryValue(entries, 'headers');
  const rawContentType = entryValue(entries, 'contentType');
  if (!safeInstanceOf(body, z.ZodType)) {
    configurationError(
      `Response "${key}" must define a Zod body schema.`,
      `responses.${key}.body`,
      operationId
    );
  }
  if (headers !== undefined && !safeInstanceOf(headers, z.ZodType)) {
    configurationError(
      `Response "${key}" headers must define a Zod schema.`,
      `responses.${key}.headers`,
      operationId
    );
  }
  const isContentTypeArray = safeIsArray(rawContentType);
  if (isContentTypeArray === undefined) {
    configurationError(
      `Response "${key}" contentType must be a string or string array.`,
      `responses.${key}.contentType`,
      operationId
    );
  }
  const contentTypeValues = isContentTypeArray ? safeArrayValues(rawContentType) : undefined;
  if (
    rawContentType !== undefined &&
    typeof rawContentType !== 'string' &&
    (contentTypeValues === undefined || contentTypeValues.some(value => typeof value !== 'string'))
  ) {
    configurationError(
      `Response "${key}" contentType must be a string or string array.`,
      `responses.${key}.contentType`,
      operationId
    );
  }
  const contentType =
    contentTypeValues === undefined ? rawContentType : Object.freeze([...contentTypeValues]);
  return Object.freeze({
    body,
    ...(headers === undefined ? {} : { headers }),
    ...(contentType === undefined ? {} : { contentType })
  }) as Readonly<ResponseContract>;
}

function validateResponses(
  responses: OperationDefinitionInput['responses'],
  operationId?: string
): Readonly<OperationDefinitionInput['responses']> {
  const entries = inspectDataRecord(responses, 'responses', operationId).filter(
    entry => entry.enumerable
  );
  if (entries.length === 0) {
    configurationError('At least one response contract is required.', 'responses', operationId);
  }

  const cloned: Record<string, Readonly<ResponseContract>> = {};
  for (const entry of entries) {
    const key = entry.key;
    const contract = entry.value;
    if (key !== 'default' && !RESPONSE_STATUS.test(key)) {
      configurationError(
        `Response key "${key}" must be an HTTP status from 100 to 599 or "default".`,
        `responses.${key}`,
        operationId
      );
    }
    const contractEntries = inspectDataRecord(contract, `responses.${key}`, operationId);
    defineSafeData(cloned, key, cloneResponseContract(contractEntries, key, operationId));
  }

  return Object.freeze(cloned);
}

/** Validates and freezes a schema-derived REST operation while preserving exact object identity. */
export function defineOperation<const Input extends OperationDefinitionInput>(
  definition: Input & ResponseKeyConstraint<Input>
): OperationDefinition<Input> {
  const definitionEntries = inspectDataRecord(definition, 'operation');
  const operationId = entryValue(definitionEntries, 'id');
  if (typeof operationId !== 'string') {
    configurationError('Operation id must be a string.', 'id');
  }
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
  const method = entryValue(definitionEntries, 'method');
  if (typeof method !== 'string' || !HTTP_METHODS.has(method)) {
    configurationError('Unsupported HTTP method.', 'method', operationId);
  }
  const path = entryValue(definitionEntries, 'path');
  if (typeof path !== 'string') {
    configurationError('Operation path must be a string.', 'path', operationId);
  }
  if (!path.startsWith('/')) {
    configurationError('Operation path must start with "/".', 'path', operationId);
  }
  if (path.includes('?') || path.includes('#')) {
    configurationError(
      'Operation path must not contain a query string or fragment.',
      'path',
      operationId
    );
  }
  if (
    entryValue(definitionEntries, 'timeoutMs') !== undefined &&
    (!Number.isInteger(entryValue(definitionEntries, 'timeoutMs')) ||
      (entryValue(definitionEntries, 'timeoutMs') as number) <= 0)
  ) {
    configurationError('Operation timeoutMs must be a positive integer.', 'timeoutMs', operationId);
  }
  if (
    entryValue(definitionEntries, 'auth') !== undefined &&
    entryValue(definitionEntries, 'auth') !== false &&
    (typeof entryValue(definitionEntries, 'auth') !== 'string' ||
      (entryValue(definitionEntries, 'auth') as string).trim().length === 0)
  ) {
    configurationError('Operation auth profile must not be an empty string.', 'auth', operationId);
  }

  const rawRequest = entryValue(definitionEntries, 'request');
  let request: Readonly<OperationRequestContract> | undefined;
  if (rawRequest !== undefined) {
    const requestEntries = inspectDataRecord(rawRequest, 'request', operationId);
    for (const section of ['body', 'headers', 'pathParams', 'query'] as const) {
      const schema = entryValue(requestEntries, section);
      if (schema !== undefined && !safeInstanceOf(schema, z.ZodType)) {
        configurationError(
          `Request ${section} must define a Zod schema.`,
          `request.${section}`,
          operationId
        );
      }
    }
    request = Object.freeze(
      cloneEnumerableData(requestEntries)
    ) as Readonly<OperationRequestContract>;
  }
  validatePathParameters(path, request, operationId);
  const responses = validateResponses(
    entryValue(definitionEntries, 'responses') as never,
    operationId
  );

  const operation = cloneEnumerableData(definitionEntries);
  if (request !== undefined) defineSafeData(operation, 'request', request);
  defineSafeData(operation, 'responses', responses);
  Object.defineProperty(operation, OPERATION_MARKER, {
    enumerable: false,
    value: true
  });

  return Object.freeze(operation) as unknown as OperationDefinition<Input>;
}
