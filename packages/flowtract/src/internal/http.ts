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
import { authSecretRegistrar } from './state.js';
import type { Redactor } from './redaction.js';
import {
  defineSafeData,
  safeArrayValues,
  safeIsArray,
  safeJsonValue,
  safeOwnEntries,
  safeOwnData
} from './safe-inspection.js';

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
  const isArray = safeIsArray(value);
  if (value === null || typeof value !== 'object' || isArray !== false) {
    requestFailure(
      operation,
      section,
      [],
      `Request ${section} must parse to a plain object.`,
      `invalid_${section}`
    );
  }
  const inspected = safeOwnEntries(value);
  if (!inspected.ok || (inspected.prototype !== Object.prototype && inspected.prototype !== null)) {
    requestFailure(
      operation,
      section,
      [],
      `Request ${section} must parse to a plain object.`,
      `invalid_${section}`
    );
  }
  const output: Record<string, unknown> = {};
  for (const entry of inspected.entries) {
    if (!entry.enumerable) continue;
    if (entry.kind !== 'data') {
      requestFailure(
        operation,
        section,
        [entry.key],
        `Request ${section} must contain data properties only.`,
        `invalid_${section}`
      );
    }
    defineSafeData(output, entry.key, entry.value);
  }
  return output;
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
  const currentIsArray = safeIsArray(current);
  if (
    current !== undefined &&
    (current === null || typeof current !== 'object' || currentIsArray !== false)
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
  interpolated: unknown,
  redactor?: Redactor,
  taintedSections: ReadonlySet<string> = new Set(),
  secrets?: SecretTracker
): ParsedOperationInput<Operation> {
  const shaped = validateOperationInputShape(operation, interpolated);
  const merged = mergeHeaders(operation, shaped, options.headers);
  const parsed =
    options.unsafe?.skipRequestValidation === true
      ? (merged as ParsedOperationInput<Operation>)
      : parseOperationInput(
          operation,
          merged as OperationInput<Operation>,
          redactor,
          taintedSections
        );
  if (secrets !== undefined) {
    for (const section of taintedSections) {
      secrets.add((parsed as Readonly<Record<string, unknown>>)[section]);
    }
  }
  return parsed;
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
  const isArray = safeIsArray(value);
  if (isArray === undefined) {
    requestFailure(
      operation,
      'query',
      [name],
      'Query values must be scalar or scalar arrays.',
      'invalid_query'
    );
  }
  if (isArray) {
    const values = safeArrayValues(value);
    if (values === undefined) {
      requestFailure(
        operation,
        'query',
        [name],
        'Sparse query arrays are not supported.',
        'invalid_query'
      );
    }
    return values.map((item, index) => {
      const parsed = queryValue(operation, name, item);
      if (parsed === undefined || safeIsArray(parsed) === true) {
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
      const safeBody = safeJsonValue(parsed.body);
      const serialized = safeBody.ok ? JSON.stringify(safeBody.value) : undefined;
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

  [authSecretRegistrar](value: unknown): void {
    this.secrets.add(value);
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
        [...this.#headers].map(([name, value]) => Object.freeze([name, value]) as TransportHeader)
      ),
      ...(this.body === undefined ? {} : { body: new Uint8Array(this.body) }),
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
    const current = safeOwnData(output, key);
    defineSafeData(output, key, current === undefined ? value : `${String(current)}, ${value}`);
  }
  return Object.freeze(output);
}

function mediaType(headers: Readonly<Record<string, string>>): string | undefined {
  return headers['content-type']?.split(';', 1)[0]?.trim().toLowerCase();
}

function normalizeZodIssues(
  error: {
    issues: readonly { path: readonly PropertyKey[]; message: string; code: string }[];
  },
  redactor: Redactor
): readonly ContractIssue[] {
  return error.issues.map(item => ({
    path: item.path.map(part => (typeof part === 'symbol' ? String(part) : part)),
    message: redactor.text(item.message),
    code: item.code
  }));
}

function isUint8Array(value: unknown): value is Uint8Array {
  try {
    return value instanceof Uint8Array && ArrayBuffer.isView(value);
  } catch {
    return false;
  }
}

function validateTransport(
  operation: OperationDefinition,
  response: TransportResponse
): TransportResponse {
  const status = safeOwnData(response, 'status');
  const durationMs = safeOwnData(response, 'durationMs');
  const body = safeOwnData(response, 'body');
  const rawHeaders = safeOwnData(response, 'headers');
  const responseUrl = safeOwnData(response, 'url');
  const headerValues = safeArrayValues(rawHeaders);
  if (
    response === null ||
    typeof response !== 'object' ||
    !Number.isInteger(status) ||
    (status as number) < 100 ||
    (status as number) > 599 ||
    !Number.isFinite(durationMs) ||
    (durationMs as number) < 0 ||
    !isUint8Array(body) ||
    headerValues === undefined ||
    typeof responseUrl !== 'string'
  ) {
    throw new TransportError('Transport returned an invalid response.', {
      operationId: operation.id,
      details: { kind: 'unknown' }
    });
  }
  const headers = headerValues.map((header, index) => {
    const tuple = safeArrayValues(header);
    if (
      tuple === undefined ||
      tuple.length !== 2 ||
      typeof tuple[0] !== 'string' ||
      typeof tuple[1] !== 'string' ||
      !validHeaderName(tuple[0]) ||
      /[\r\n]/u.test(tuple[1])
    ) {
      throw new TransportError(`Transport returned an invalid header at index ${index}.`, {
        operationId: operation.id,
        details: { kind: 'unknown' }
      });
    }
    return Object.freeze([tuple[0], tuple[1]]) as TransportHeader;
  });
  try {
    const url = new URL(responseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('invalid protocol');
  } catch (error) {
    throw new TransportError('Transport returned an invalid final URL.', {
      operationId: operation.id,
      details: { kind: 'unknown' },
      cause: error
    });
  }
  return Object.freeze({
    status: status as number,
    headers: Object.freeze(headers),
    body: new Uint8Array(body),
    url: responseUrl,
    durationMs: durationMs as number
  });
}

export function parseOperationResponse<Operation extends OperationDefinition>(
  operation: Operation,
  response: TransportResponse,
  redactor: Redactor
): OperationResult<Operation> {
  const safeResponse = validateTransport(operation, response);
  const exact = operation.responses[safeResponse.status];
  const contractStatus: number | 'default' = exact === undefined ? 'default' : safeResponse.status;
  const contract = (exact ?? operation.responses.default) as ResponseContract | undefined;
  if (contract === undefined) {
    throw new UndeclaredStatusError(
      `Operation returned undeclared status ${safeResponse.status}.`,
      {
        operationId: operation.id,
        details: {
          status: safeResponse.status,
          declaredStatuses: Object.keys(operation.responses)
            .filter(key => key !== 'default')
            .map(Number),
          hasDefault: operation.responses.default !== undefined
        }
      }
    );
  }
  const headers = normalizedResponseHeaders(safeResponse.headers);
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
        status: safeResponse.status,
        contractStatus,
        section: 'body',
        issues: [issue([], 'Unexpected response content type.', 'content_type')]
      }
    });
  }

  let decoded: unknown;
  if (safeResponse.body.byteLength === 0) {
    decoded = undefined;
  } else {
    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(safeResponse.body);
    } catch (error) {
      throw new ResponseParseError('Response body is not valid UTF-8.', {
        operationId: operation.id,
        details: {
          status: safeResponse.status,
          ...(type === undefined ? {} : { contentType: type })
        },
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
            status: safeResponse.status,
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
          status: safeResponse.status,
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
        status: safeResponse.status,
        contractStatus,
        section: 'headers',
        issues: normalizeZodIssues(parsedHeaders.error, redactor)
      }
    });
  }
  const parsedBody = contract.body.safeParse(decoded);
  if (!parsedBody.success) {
    throw new ResponseContractError('Response body failed contract validation.', {
      operationId: operation.id,
      details: {
        status: safeResponse.status,
        contractStatus,
        section: 'body',
        issues: normalizeZodIssues(parsedBody.error, redactor)
      }
    });
  }
  return {
    operationId: operation.id,
    status: safeResponse.status,
    contractStatus,
    body: parsedBody.data,
    headers: parsedHeaders?.success === true ? parsedHeaders.data : headers,
    durationMs: safeResponse.durationMs
  } as OperationResult<Operation>;
}
