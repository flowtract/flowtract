import type { z } from 'zod';
import {
  RequestContractError,
  type ContractIssue,
  type RequestContractErrorDetails
} from '../errors.js';
import type {
  OperationDefinition,
  OperationInput,
  ParsedOperationInput
} from '../operation-types.js';

const REQUEST_SECTIONS = ['headers', 'query', 'pathParams', 'body'] as const;
type RequestSection = (typeof REQUEST_SECTIONS)[number];

function normalizeIssues(issues: readonly z.ZodIssue[]): readonly ContractIssue[] {
  return issues.map(issue => ({
    path: issue.path.map(part => (typeof part === 'symbol' ? String(part) : part)),
    message: issue.message,
    code: issue.code
  }));
}

function requestError(
  operationId: string,
  section: RequestContractErrorDetails['section'],
  message: string,
  issues: readonly ContractIssue[]
): never {
  throw new RequestContractError(message, {
    operationId,
    details: { section, issues }
  });
}

export function parseOperationInput<Operation extends OperationDefinition>(
  operation: Operation,
  input: OperationInput<Operation> | undefined
): ParsedOperationInput<Operation> {
  if (
    input !== undefined &&
    (typeof input !== 'object' || input === null || Array.isArray(input))
  ) {
    requestError(operation.id, 'input', 'Request input must be an object.', [
      {
        path: [],
        message: 'Expected a request input object.',
        code: 'invalid_input'
      }
    ]);
  }

  const rawInput: Readonly<Record<string, unknown>> = input === undefined ? {} : input;
  const request = operation.request;
  const declaredSections = new Set(
    REQUEST_SECTIONS.filter(section => request?.[section] !== undefined)
  );

  for (const key of Object.keys(rawInput)) {
    if (!declaredSections.has(key as RequestSection)) {
      requestError(operation.id, 'input', `Request section "${key}" is not declared.`, [
        {
          path: [key],
          message: 'Undeclared request section.',
          code: 'unrecognized_section'
        }
      ]);
    }
  }

  const parsed: Record<string, unknown> = {};
  for (const section of REQUEST_SECTIONS) {
    const schema = request?.[section];
    if (schema === undefined) {
      continue;
    }

    const result = schema.safeParse(rawInput[section]);
    if (!result.success) {
      requestError(
        operation.id,
        section,
        `Request ${section} failed contract validation.`,
        normalizeIssues(result.error.issues)
      );
    }
    parsed[section] = result.data;
  }

  return parsed as ParsedOperationInput<Operation>;
}

export function validateOperationInputShape(
  operation: OperationDefinition,
  input: unknown
): Readonly<Record<string, unknown>> {
  if (
    input !== undefined &&
    (typeof input !== 'object' || input === null || Array.isArray(input))
  ) {
    requestError(operation.id, 'input', 'Request input must be an object.', [
      { path: [], message: 'Expected a request input object.', code: 'invalid_input' }
    ]);
  }
  const raw: Readonly<Record<string, unknown>> =
    input === undefined ? {} : (input as Readonly<Record<string, unknown>>);
  const request = operation.request;
  for (const key of Object.keys(raw)) {
    if (
      !REQUEST_SECTIONS.includes(key as RequestSection) ||
      request?.[key as RequestSection] === undefined
    ) {
      requestError(operation.id, 'input', `Request section "${key}" is not declared.`, [
        { path: [key], message: 'Undeclared request section.', code: 'unrecognized_section' }
      ]);
    }
  }
  return raw;
}
