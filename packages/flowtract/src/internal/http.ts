import {
  AuthError,
  RequestContractError,
  ResponseContractError,
  ResponseParseError,
  TransportError,
  UndeclaredStatusError,
  type ContractIssue
} from '../errors.js';
import { parseOperationInput, validateOperationInputShape } from './parse-request.js';
import { renderOperationPath } from './render-path.js';
import type {
  FlowtractExecutionOptions,
  OperationDefinition,
  OperationInput,
  OperationResult,
  ParsedOperationInput,
  ResponseContract
} from '../operation-types.js';
import type {
  MutableAuthRequest,
  TransportHeader,
  TransportRequest,
  TransportResponse
} from '../runtime-types.js';
import type { SecretTracker } from './state.js';
import type { Redactor } from './redaction.js';

function issue(path: readonly (string | number)[], message: string, code: string): ContractIssue {
  return { path, message, code };
}

function requestFailure(
  operation: OperationDefinition,
  section: 'headers' | 'query' | 'pathParams' | 'body' | 'input',
  path: readonly (string | number)[],
  message: string,
  code: string
): never {
  throw new RequestContractError(message, {
    operationId: operation.id,
    details: { section, issues: [issue(path, message, code)] }
  });
}

function plainObject(
  operation: OperationDefinition,
  section: 'headers' | 'query' | 'pathParams',
  value: unknown
): Readonly<Record<string, unknown>> {
  if (value === undefined) return {};
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    requestFailure(
      operation,
      section,
      [],
      `Request ${section} must parse to a plain object.`,
      `invalid_${section}`
    );
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    requestFailure(
      operation,
      section,
      [],
      `Request ${section} must parse to a plain object.`,
      `invalid_${section}`
    );
  }
  return value as Readonly<Record<string, unknown>>;
}

function mergeHeaders(
  operation: OperationDefinition,
  input: Readonly<Record<string, unknown>>,
  optionHeaders: Readonly<Record<string, unknown>> | undefined
): Readonly<Record<string, unknown>> {
  if (optionHeaders === undefined) return input;
  if (operation.request?.headers === undefined) {
    requestFailure(
      operation,
      'headers',
      [],
      'Invocation headers require an operation header schema.',
      'undeclared_headers'
    );
  }
  const current = input.headers;
  if (
    current !== undefined &&
    (current === null || typeof current !== 'object' || Array.isArray(current))
  ) {
    requestFailure(
      operation,
      'headers',
      [],
      'Request headers must be an object before option merging.',
      'invalid_headers'
    );
  }
  const merged = new Map<string, readonly [string, unknown]>();
  for (const [name, value] of Object.entries(
    (current ?? {}) as Readonly<Record<string, unknown>>
  )) {
    merged.set(name.toLowerCase(), [name.toLowerCase(), value]);
  }
  for (const [name, value] of Object.entries(optionHeaders)) {
    merged.set(name.toLowerCase(), [name.toLowerCase(), value]);
  }
  return {
    ...input,
    headers: Object.fromEntries([...merged.values()])
  };
}

export function prepareOperationInput<Operation extends OperationDefinition>(
  operation: Operation,
  input: OperationInput<Operation> | undefined,
  options: FlowtractExecutionOptions & { readonly dryRun?: boolean },
  interpolated: unknown
): ParsedOperationInput<Operation> {
  const shaped = validateOperationInputShape(operation, interpolated);
  const merged = mergeHeaders(operation, shaped, options.headers);
  if (options.unsafe?.skipRequestValidation === true) {
    return merged as ParsedOperationInput<Operation>;
  }
  return parseOperationInput(operation, merged as OperationInput<Operation>);
}

type QueryValue = string | readonly string[];

function headerValue(
  operation: OperationDefinition,
  name: string,
  value: unknown
): string | undefined {
  if (value === undefined) return undefined;
  if (
    typeof value !== 'string' &&
    typeof value !== 'boolean' &&
    !(typeof value === 'number' && Number.isFinite(value))
  ) {
    requestFailure(operation, 'headers', [name], 'Header values must be scalar.', 'invalid_header');
  }
  const text = String(value);
  if (/[\r\n]/u.test(text)) {
    requestFailure(
      operation,
      'headers',
      [name],
      'Header values must not contain CR or LF.',
      'invalid_header'
    );
  }
  return text;
}

function queryValue(
  operation: OperationDefinition,
  name: string,
  value: unknown
): QueryValue | undefined {
  if (value === undefined) return undefined;
  if (value === null) return '';
  if (Array.isArray(value)) {
    if (!(name in value) && value.length > 0) {
      // Sparse arrays are rejected by comparing own keys below.
    }
    if (Object.keys(value).length !== value.length) {
      requestFailure(
        operation,
        'query',
        [name],
        'Sparse query arrays are not supported.',
        'invalid_query'
      );
    }
    return value.map((item, index) => {
      const parsed = queryValue(operation, name, item);
      if (parsed === undefined || Array.isArray(parsed)) {
        requestFailure(
          operation,
          'query',
          [name, index],
          'Query arrays must contain supported scalar values.',
          'invalid_query'
        );
      }
      return parsed;
    }) as readonly string[];
  }
  if (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return String(value);
  }
  requestFailure(
    operation,
    'query',
    [name],
    'Query values must be scalar or scalar arrays.',
    'invalid_query'
  );
}

function validHeaderName(name: string): boolean {
  return /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/u.test(name);
}

export class RequestBuilder implements MutableAuthRequest {
  readonly #headers = new Map<string, string>();
  readonly #query = new Map<string, QueryValue>();
  readonly body: Uint8Array | undefined;
  readonly baseURL: string;

  constructor(
    readonly operation: OperationDefinition,
    parsed: Readonly<Record<string, unknown>>,
    baseURL: string,
    readonly timeoutMs: number,
    readonly signal: AbortSignal | undefined,
    readonly secrets: SecretTracker
  ) {
    this.baseURL = `${baseURL}${renderOperationPath(
      operation,
      plainObject(operation, 'pathParams', parsed.pathParams)
    )}`;
    for (const [name, value] of Object.entries(plainObject(operation, 'headers', parsed.headers))) {
      if (!validHeaderName(name)) {
        requestFailure(operation, 'headers', [name], 'Header name is invalid.', 'invalid_header');
      }
      const normalized = headerValue(operation, name, value);
      if (normalized !== undefined) this.#headers.set(name.toLowerCase(), normalized);
    }
    for (const [name, value] of Object.entries(plainObject(operation, 'query', parsed.query))) {
      const normalized = queryValue(operation, name, value);
      if (normalized !== undefined) this.#query.set(name, normalized);
    }
    if (parsed.body === undefined) {
      this.body = undefined;
    } else {
      let serialized: string | undefined;
      try {
        serialized = JSON.stringify(parsed.body);
      } catch {
        serialized = undefined;
      }
      if (serialized === undefined) {
        requestFailure(
          operation,
          'body',
          [],
          'Request body is not JSON serializable.',
          'invalid_json_body'
        );
      }
      const contentType = this.#headers.get('content-type');
      if (
        contentType !== undefined &&
        !/^(?:application\/json|application\/[^;]+\+json)(?:\s*;|$)/iu.test(contentType)
      ) {
        requestFailure(
          operation,
          'headers',
          ['content-type'],
          'Gate 2 request bodies require a JSON content type.',
          'invalid_content_type'
        );
      }
      this.#headers.set('content-type', contentType ?? 'application/json');
      this.body = new TextEncoder().encode(serialized);
    }
  }

  setHeader(name: string, value: string): void {
    const normalized = name.toLowerCase();
    if (!validHeaderName(name) || /[\r\n]/u.test(value)) {
      throw new AuthError('Authentication produced an invalid header.', {
        operationId: this.operation.id,
        details: { phase: 'apply' }
      });
    }
    if (this.#headers.has(normalized)) {
      throw new AuthError(`Authentication header "${name}" collides with request input.`, {
        operationId: this.operation.id,
        details: { phase: 'apply' }
      });
    }
    this.secrets.add(value);
    this.#headers.set(normalized, value);
  }

  setQuery(name: string, value: string | readonly string[]): void {
    if (name.length === 0 || this.#query.has(name)) {
      throw new AuthError(`Authentication query key "${name}" collides with request input.`, {
        operationId: this.operation.id,
        details: { phase: 'apply' }
      });
    }
    this.secrets.add(value);
    this.#query.set(name, value);
  }

  url(): string {
    const url = new URL(this.baseURL);
    for (const [name, value] of this.#query) {
      if (typeof value === 'string') url.searchParams.append(name, value);
      else value.forEach(item => url.searchParams.append(name, item));
    }
    return url.toString();
  }

  headerNames(): readonly string[] {
    return Object.freeze([...this.#headers.keys()].sort());
  }

  transportRequest(): TransportRequest {
    return {
      operationId: this.operation.id,
      method: this.operation.method,
      url: this.url(),
      headers: Object.freeze(
        [...this.#headers].map(([name, value]) => [name, value] as TransportHeader)
      ),
      ...(this.body === undefined ? {} : { body: this.body }),
      timeoutMs: this.timeoutMs,
      ...(this.signal === undefined ? {} : { signal: this.signal })
    };
  }
}

function normalizedResponseHeaders(
  headers: readonly TransportHeader[]
): Readonly<Record<string, string>> {
  const output: Record<string, string> = {};
  for (const [name, value] of headers) {
    const key = name.toLowerCase();
    output[key] = output[key] === undefined ? value : `${output[key]}, ${value}`;
  }
  return Object.freeze(output);
}

function mediaType(headers: Readonly<Record<string, string>>): string | undefined {
  return headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase();
}

function normalizeZodIssues(error: {
  issues: readonly { path: readonly PropertyKey[]; message: string; code: string }[];
}): readonly ContractIssue[] {
  return error.issues.map(item => ({
    path: item.path.map(part => (typeof part === 'symbol' ? String(part) : part)),
    message: item.message,
    code: item.code
  }));
}

function validateTransport(operation: OperationDefinition, response: TransportResponse): void {
  if (
    !Number.isInteger(response.status) ||
    response.status < 100 ||
    response.status > 599 ||
    !Number.isFinite(response.durationMs) ||
    response.durationMs < 0 ||
    !(response.body instanceof Uint8Array) ||
    !Array.isArray(response.headers)
  ) {
    throw new TransportError('Transport returned an invalid response.', {
      operationId: operation.id,
      details: { kind: 'unknown' }
    });
  }
  try {
    const url = new URL(response.url);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol');
  } catch (error) {
    throw new TransportError('Transport returned an invalid final URL.', {
      operationId: operation.id,
      details: { kind: 'unknown' },
      cause: error
    });
  }
}

export function parseOperationResponse<Operation extends OperationDefinition>(
  operation: Operation,
  response: TransportResponse,
  redactor: Redactor
): OperationResult<Operation> {
  validateTransport(operation, response);
  const exact = operation.responses[response.status];
  const contractStatus: number | 'default' = exact === undefined ? 'default' : response.status;
  const contract = (exact ?? operation.responses.default) as ResponseContract | undefined;
  if (contract === undefined) {
    throw new UndeclaredStatusError(`Operation returned undeclared status ${response.status}.`, {
      operationId: operation.id,
      details: {
        status: response.status,
        declaredStatuses: Object.keys(operation.responses)
          .filter(key => key !== 'default')
          .map(Number),
        hasDefault: operation.responses.default !== undefined
      }
    });
  }
  const headers = normalizedResponseHeaders(response.headers);
  const type = mediaType(headers);
  const allowed = contract.contentType;
  if (
    allowed !== undefined &&
    ![...(Array.isArray(allowed) ? allowed : [allowed])]
      .map(value => value.toLowerCase())
      .includes(type ?? '')
  ) {
    throw new ResponseContractError('Response content type did not match the contract.', {
      operationId: operation.id,
      details: {
        status: response.status,
        contractStatus,
        section: 'body',
        issues: [issue([], 'Unexpected response content type.', 'content_type')]
      }
    });
  }

  let decoded: unknown;
  if (response.body.byteLength === 0) {
    decoded = undefined;
  } else {
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(response.body);
    } catch (error) {
      throw new ResponseParseError('Response body is not valid UTF-8.', {
        operationId: operation.id,
        details: { status: response.status, ...(type === undefined ? {} : { contentType: type }) },
        cause: error
      });
    }
    if (type === 'application/json' || type?.endsWith('+json') === true) {
      try {
        decoded = JSON.parse(text);
      } catch (error) {
        throw new ResponseParseError('Response body contains malformed JSON.', {
          operationId: operation.id,
          details: {
            status: response.status,
            ...(type === undefined ? {} : { contentType: type }),
            ...(redactor.previewCharacters === 0 ? {} : { preview: redactor.preview(text) })
          },
          cause: error
        });
      }
    } else if (type?.startsWith('text/') === true) {
      decoded = text;
    } else {
      throw new ResponseParseError('Response content type is missing or unsupported.', {
        operationId: operation.id,
        details: {
          status: response.status,
          ...(type === undefined ? {} : { contentType: type }),
          ...(redactor.previewCharacters === 0 ? {} : { preview: redactor.preview(text) })
        }
      });
    }
  }

  const parsedHeaders = contract.headers?.safeParse(headers);
  if (parsedHeaders !== undefined && !parsedHeaders.success) {
    throw new ResponseContractError('Response headers failed contract validation.', {
      operationId: operation.id,
      details: {
        status: response.status,
        contractStatus,
        section: 'headers',
        issues: normalizeZodIssues(parsedHeaders.error)
      }
    });
  }
  const parsedBody = contract.body.safeParse(decoded);
  if (!parsedBody.success) {
    throw new ResponseContractError('Response body failed contract validation.', {
      operationId: operation.id,
      details: {
        status: response.status,
        contractStatus,
        section: 'body',
        issues: normalizeZodIssues(parsedBody.error)
      }
    });
  }
  return {
    operationId: operation.id,
    status: response.status,
    contractStatus,
    body: parsedBody.data,
    headers: parsedHeaders?.success === true ? parsedHeaders.data : headers,
    durationMs: response.durationMs
  } as OperationResult<Operation>;
}
