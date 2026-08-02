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
import type { Redactor } from './redaction.js';
import { defineSafeData, safeOwnEntries, safeOwnData } from './safe-inspection.js';

const REQUEST_SECTIONS = ['headers', 'query', 'pathParams', 'body'] as const;
type RequestSection = (typeof REQUEST_SECTIONS)[number];

function ownedInput(
  operation: OperationDefinition,
  input: unknown
): Readonly<Record<string, unknown>> {
  if (input === undefined) return {};
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    requestError(operation.id, 'input', 'Request input must be an object.', [
      { path: [], message: 'Expected a request input object.', code: 'invalid_input' }
    ]);
  }
  const inspected = safeOwnEntries(input);
  if (!inspected.ok || (inspected.prototype !== Object.prototype && inspected.prototype !== null)) {
    requestError(operation.id, 'input', 'Request input must be a plain data object.', [
      { path: [], message: 'Expected a plain request input object.', code: 'invalid_input' }
    ]);
  }
  const output: Record<string, unknown> = {};
  for (const entry of inspected.entries) {
    if (!entry.enumerable) continue;
    if (entry.kind !== 'data') {
      requestError(operation.id, 'input', 'Request input must contain data properties only.', [
        { path: [entry.key], message: 'Accessors are unsupported.', code: 'invalid_input' }
      ]);
    }
    defineSafeData(output, entry.key, entry.value);
  }
  return output;
}

function normalizeIssues(
  issues: readonly z.ZodIssue[],
  redactor: Redactor | undefined,
  tainted: boolean
): readonly ContractIssue[] {
  return issues.map(issue => ({
    path: issue.path.map(part => (typeof part === 'symbol' ? String(part) : part)),
    message: tainted ? '[REDACTED]' : (redactor?.text(issue.message) ?? issue.message),
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
  input: OperationInput<Operation> | undefined,
  redactor?: Redactor,
  taintedSections: ReadonlySet<string> = new Set()
): ParsedOperationInput<Operation> {
  const rawInput = ownedInput(operation, input);
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

    const result = schema.safeParse(safeOwnData(rawInput, section));
    if (!result.success) {
      requestError(
        operation.id,
        section,
        `Request ${section} failed contract validation.`,
        normalizeIssues(result.error.issues, redactor, taintedSections.has(section))
      );
    }
    defineSafeData(parsed, section, result.data);
  }

  return parsed as ParsedOperationInput<Operation>;
}

export function validateOperationInputShape(
  operation: OperationDefinition,
  input: unknown
): Readonly<Record<string, unknown>> {
  const raw = ownedInput(operation, input);
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
