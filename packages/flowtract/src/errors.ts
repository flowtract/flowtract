export const FLOWTRACT_ERROR_CODES = [
  'FLOWTRACT_CONFIG',
  'FLOWTRACT_DUPLICATE_OPERATION',
  'FLOWTRACT_REQUEST_CONTRACT',
  'FLOWTRACT_TRANSPORT',
  'FLOWTRACT_UNDECLARED_STATUS',
  'FLOWTRACT_RESPONSE_PARSE',
  'FLOWTRACT_RESPONSE_CONTRACT',
  'FLOWTRACT_AUTH',
  'FLOWTRACT_INTERPOLATION',
  'FLOWTRACT_CLEANUP'
] as const;

export type FlowtractErrorCode = (typeof FLOWTRACT_ERROR_CODES)[number];

export interface ContractIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
  readonly code: string;
}

export interface ConfigErrorDetails {
  readonly path?: string;
  readonly issues?: readonly string[];
}

export interface DuplicateOperationErrorDetails {
  readonly operationId: string;
  readonly firstIndex: number;
  readonly duplicateIndex: number;
}

export interface RequestContractErrorDetails {
  readonly section: 'headers' | 'query' | 'pathParams' | 'body' | 'input';
  readonly issues: readonly ContractIssue[];
}

export interface TransportErrorDetails {
  readonly kind: 'timeout' | 'abort' | 'network' | 'tls' | 'unknown';
}

export interface UndeclaredStatusErrorDetails {
  readonly status: number;
  readonly declaredStatuses: readonly number[];
  readonly hasDefault: boolean;
}

export interface ResponseParseErrorDetails {
  readonly status: number;
  readonly contentType?: string;
  readonly preview?: string;
}

export interface ResponseContractErrorDetails {
  readonly status: number;
  readonly contractStatus: number | 'default';
  readonly section: 'headers' | 'body';
  readonly issues: readonly ContractIssue[];
}

export interface AuthErrorDetails {
  readonly profile?: string;
  readonly phase: 'create' | 'setup' | 'apply' | 'dispose';
}

export interface InterpolationErrorDetails {
  readonly reference?: string;
  readonly reason: 'missing' | 'cycle' | 'invalid';
}

export interface CleanupFailure {
  readonly label: string;
  readonly message: string;
}

export interface CleanupErrorDetails {
  readonly failures: readonly CleanupFailure[];
}

export interface FlowtractErrorOptions<Details> {
  readonly operationId?: string;
  readonly details?: Details;
  readonly cause?: unknown;
}

export interface FlowtractErrorJson<Code extends FlowtractErrorCode, Details> {
  readonly code: Code;
  readonly message: string;
  readonly operationId?: string;
  readonly details?: Details;
}

export class FlowtractError<
  Code extends FlowtractErrorCode = FlowtractErrorCode,
  Details = unknown
> extends Error {
  readonly code: Code;
  readonly operationId: string | undefined;
  readonly details: Details | undefined;

  constructor(code: Code, message: string, options: FlowtractErrorOptions<Details> = {}) {
    const cause = safeOwnData(options, 'cause');
    super(message, cause === undefined ? undefined : { cause });
    this.code = code;
    const operationId = safeOwnData(options, 'operationId');
    this.operationId = typeof operationId === 'string' ? operationId : undefined;
    const details = safeOwnData(options, 'details');
    this.details =
      details === undefined ? undefined : (safeSnapshot(details) as Details | undefined);
    Object.defineProperty(this, 'name', {
      configurable: true,
      value: new.target.name
    });
  }

  toJSON(): FlowtractErrorJson<Code, Details> {
    const output: Record<string, unknown> = {};
    defineSafeData(output, 'code', this.code);
    defineSafeData(output, 'message', this.message);
    if (this.operationId !== undefined) defineSafeData(output, 'operationId', this.operationId);
    if (this.details !== undefined) defineSafeData(output, 'details', safeSnapshot(this.details));
    return Object.freeze(output) as unknown as FlowtractErrorJson<Code, Details>;
  }
}

type ConcreteErrorOptions<Details> = FlowtractErrorOptions<Details>;

export class ConfigError extends FlowtractError<'FLOWTRACT_CONFIG', ConfigErrorDetails> {
  constructor(message: string, options: ConcreteErrorOptions<ConfigErrorDetails> = {}) {
    super('FLOWTRACT_CONFIG', message, options);
  }
}

export class DuplicateOperationError extends FlowtractError<
  'FLOWTRACT_DUPLICATE_OPERATION',
  DuplicateOperationErrorDetails
> {
  constructor(message: string, options: ConcreteErrorOptions<DuplicateOperationErrorDetails> = {}) {
    super('FLOWTRACT_DUPLICATE_OPERATION', message, options);
  }
}

export class RequestContractError extends FlowtractError<
  'FLOWTRACT_REQUEST_CONTRACT',
  RequestContractErrorDetails
> {
  constructor(message: string, options: ConcreteErrorOptions<RequestContractErrorDetails> = {}) {
    super('FLOWTRACT_REQUEST_CONTRACT', message, options);
  }
}

export class TransportError extends FlowtractError<'FLOWTRACT_TRANSPORT', TransportErrorDetails> {
  constructor(message: string, options: ConcreteErrorOptions<TransportErrorDetails> = {}) {
    super('FLOWTRACT_TRANSPORT', message, options);
  }
}

export class UndeclaredStatusError extends FlowtractError<
  'FLOWTRACT_UNDECLARED_STATUS',
  UndeclaredStatusErrorDetails
> {
  constructor(message: string, options: ConcreteErrorOptions<UndeclaredStatusErrorDetails> = {}) {
    super('FLOWTRACT_UNDECLARED_STATUS', message, options);
  }
}

export class ResponseParseError extends FlowtractError<
  'FLOWTRACT_RESPONSE_PARSE',
  ResponseParseErrorDetails
> {
  constructor(message: string, options: ConcreteErrorOptions<ResponseParseErrorDetails> = {}) {
    super('FLOWTRACT_RESPONSE_PARSE', message, options);
  }
}

export class ResponseContractError extends FlowtractError<
  'FLOWTRACT_RESPONSE_CONTRACT',
  ResponseContractErrorDetails
> {
  constructor(message: string, options: ConcreteErrorOptions<ResponseContractErrorDetails> = {}) {
    super('FLOWTRACT_RESPONSE_CONTRACT', message, options);
  }
}

export class AuthError extends FlowtractError<'FLOWTRACT_AUTH', AuthErrorDetails> {
  constructor(message: string, options: ConcreteErrorOptions<AuthErrorDetails> = {}) {
    super('FLOWTRACT_AUTH', message, options);
  }
}

export class InterpolationError extends FlowtractError<
  'FLOWTRACT_INTERPOLATION',
  InterpolationErrorDetails
> {
  constructor(message: string, options: ConcreteErrorOptions<InterpolationErrorDetails> = {}) {
    super('FLOWTRACT_INTERPOLATION', message, options);
  }
}

export class CleanupError extends FlowtractError<'FLOWTRACT_CLEANUP', CleanupErrorDetails> {
  constructor(message: string, options: ConcreteErrorOptions<CleanupErrorDetails> = {}) {
    super('FLOWTRACT_CLEANUP', message, options);
  }
}

export type ErrorWithCleanup = Error & {
  readonly cleanupError: CleanupError;
};

export function hasCleanupError(error: unknown): error is ErrorWithCleanup {
  if (!safeIsError(error)) return false;
  const cleanupError = safeOwnData(error, 'cleanupError');
  return cleanupError instanceof CleanupError;
}
import {
  defineSafeData,
  safeIsError,
  safeOwnData,
  safeSnapshot
} from './internal/safe-inspection.js';
