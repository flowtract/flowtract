export const SAFE_INSPECTION_LIMITS = Object.freeze({
  depth: 64,
  nodes: 10_000,
  text: 8_192,
  causeDepth: 8
});

export interface SafeOwnEntry {
  readonly key: string;
  readonly enumerable: boolean;
  readonly kind: 'data' | 'accessor';
  readonly value?: unknown;
}

export interface SafeOwnEntriesResult {
  readonly ok: boolean;
  readonly entries: readonly SafeOwnEntry[];
  readonly prototype?: object | null;
}

function objectLike(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function';
}

export function boundedText(value: string, maximum: number = SAFE_INSPECTION_LIMITS.text): string {
  return Array.from(value).slice(0, maximum).join('');
}

export function safePrimitiveText(value: unknown): string | undefined {
  if (typeof value === 'string') return boundedText(value);
  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') {
    return String(value);
  }
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  return undefined;
}

export function safeOwnEntries(value: unknown): SafeOwnEntriesResult {
  if (!objectLike(value)) return { ok: false, entries: [] };
  let prototype: object | null;
  let descriptors: PropertyDescriptorMap;
  try {
    prototype = Reflect.getPrototypeOf(value);
    descriptors = Object.getOwnPropertyDescriptors(value);
  } catch {
    return { ok: false, entries: [] };
  }

  const entries: SafeOwnEntry[] = [];
  for (const [key, descriptor] of Object.entries(descriptors)) {
    entries.push(
      'value' in descriptor
        ? {
            key,
            enumerable: descriptor.enumerable === true,
            kind: 'data' as const,
            value: descriptor.value
          }
        : {
            key,
            enumerable: descriptor.enumerable === true,
            kind: 'accessor' as const
          }
    );
  }
  return { ok: true, entries, prototype };
}

export function safeOwnData(value: unknown, key: string): unknown {
  if (!objectLike(value)) return undefined;
  try {
    const descriptor = Reflect.getOwnPropertyDescriptor(value, key);
    return descriptor !== undefined && 'value' in descriptor ? descriptor.value : undefined;
  } catch {
    return undefined;
  }
}

export function safeDataProperty(value: unknown, key: string): unknown {
  if (!objectLike(value)) return undefined;
  let current: object | null = value;
  for (let depth = 0; current !== null && depth < 16; depth += 1) {
    try {
      const descriptor = Reflect.getOwnPropertyDescriptor(current, key);
      if (descriptor !== undefined) return 'value' in descriptor ? descriptor.value : undefined;
      current = Reflect.getPrototypeOf(current);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

export function safeArrayValues(value: unknown): readonly unknown[] | undefined {
  try {
    if (!Array.isArray(value)) return undefined;
  } catch {
    return undefined;
  }
  const length = safeOwnData(value, 'length');
  if (!Number.isSafeInteger(length) || (length as number) < 0 || (length as number) > 100_000) {
    return undefined;
  }
  const values: unknown[] = [];
  for (let index = 0; index < (length as number); index += 1) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Reflect.getOwnPropertyDescriptor(value, String(index));
    } catch {
      return undefined;
    }
    if (descriptor === undefined || !('value' in descriptor)) return undefined;
    values.push(descriptor.value);
  }
  return values;
}

export function defineSafeData(target: object, key: string, value: unknown): void {
  Object.defineProperty(target, key, {
    configurable: true,
    enumerable: true,
    writable: true,
    value
  });
}

export interface SafeSnapshotOptions {
  readonly maximumDepth?: number;
  readonly maximumNodes?: number;
  readonly maximumText?: number;
  readonly string?: (value: string, path: readonly string[]) => string;
  readonly redact?: (key: string, path: readonly string[]) => boolean;
  readonly redactedValue?: string;
}

export function safeSnapshot(value: unknown, options: SafeSnapshotOptions = {}): unknown {
  const maximumDepth = options.maximumDepth ?? SAFE_INSPECTION_LIMITS.depth;
  const maximumNodes = options.maximumNodes ?? SAFE_INSPECTION_LIMITS.nodes;
  const maximumText = options.maximumText ?? SAFE_INSPECTION_LIMITS.text;
  const redactedValue = options.redactedValue ?? '[REDACTED]';
  const seen = new WeakSet<object>();
  let nodes = 0;

  const visit = (candidate: unknown, path: readonly string[], depth: number): unknown => {
    if (typeof candidate === 'string') {
      const bounded = boundedText(candidate, maximumText);
      return options.string?.(bounded, path) ?? bounded;
    }
    if (
      candidate === null ||
      candidate === undefined ||
      typeof candidate === 'number' ||
      typeof candidate === 'boolean'
    ) {
      return candidate;
    }
    if (typeof candidate === 'bigint') return String(candidate);
    if (typeof candidate === 'symbol' || typeof candidate === 'function') return '[Object]';
    if (depth >= maximumDepth || nodes >= maximumNodes) return '[Object]';
    if (seen.has(candidate)) return '[Circular]';
    seen.add(candidate);
    nodes += 1;

    const inspected = safeOwnEntries(candidate);
    if (!inspected.ok) return '[Object]';
    const isArray = Array.isArray(candidate);
    if (!isArray && inspected.prototype !== Object.prototype && inspected.prototype !== null) {
      return '[Object]';
    }

    const output: unknown[] | Record<string, unknown> = isArray
      ? []
      : (Object.create(null) as Record<string, unknown>);
    for (const entry of inspected.entries) {
      if (!entry.enumerable || (isArray && entry.key === 'length')) continue;
      const nextPath = [...path, entry.key];
      const nested =
        options.redact?.(entry.key, nextPath) === true
          ? redactedValue
          : entry.kind === 'accessor'
            ? '[Accessor]'
            : visit(entry.value, nextPath, depth + 1);
      if (isArray) defineSafeData(output, entry.key, nested);
      else (output as Record<string, unknown>)[entry.key] = nested;
    }
    return Object.freeze(output);
  };

  return visit(value, [], 0);
}

export interface SafeJsonResult {
  readonly ok: boolean;
  readonly value?: unknown;
}

export function safeJsonValue(value: unknown): SafeJsonResult {
  const seen = new WeakSet<object>();
  let nodes = 0;

  const visit = (
    candidate: unknown,
    depth: number,
    arrayItem: boolean
  ): { readonly ok: boolean; readonly value?: unknown; readonly omitted?: boolean } => {
    if (candidate === null || typeof candidate === 'string' || typeof candidate === 'boolean') {
      return { ok: true, value: candidate };
    }
    if (typeof candidate === 'number') {
      return { ok: true, value: Number.isFinite(candidate) ? candidate : null };
    }
    if (
      candidate === undefined ||
      typeof candidate === 'function' ||
      typeof candidate === 'symbol'
    ) {
      return arrayItem ? { ok: true, value: null } : { ok: true, omitted: true };
    }
    if (typeof candidate === 'bigint' || depth >= 64 || nodes >= 10_000) {
      return { ok: false };
    }
    if (seen.has(candidate)) return { ok: false };
    seen.add(candidate);
    nodes += 1;

    const inspected = safeOwnEntries(candidate);
    if (!inspected.ok) return { ok: false };
    const isArray = Array.isArray(candidate);
    if (!isArray && inspected.prototype !== Object.prototype && inspected.prototype !== null) {
      return { ok: false };
    }

    if (isArray) {
      const values = safeArrayValues(candidate);
      if (values === undefined) return { ok: false };
      const output: unknown[] = [];
      for (const item of values) {
        const nested = visit(item, depth + 1, true);
        if (!nested.ok) return { ok: false };
        output.push(nested.value);
      }
      return { ok: true, value: output };
    }

    const output = Object.create(null) as Record<string, unknown>;
    for (const entry of inspected.entries) {
      if (!entry.enumerable) continue;
      if (entry.kind !== 'data') return { ok: false };
      const nested = visit(entry.value, depth + 1, false);
      if (!nested.ok) return { ok: false };
      if (nested.omitted !== true) output[entry.key] = nested.value;
    }
    return { ok: true, value: output };
  };

  const result = visit(value, 0, false);
  return Object.freeze(result.ok ? { ok: true, value: result.value } : { ok: false });
}

export function safeIsError(value: unknown): value is Error {
  try {
    return value instanceof Error;
  } catch {
    return false;
  }
}

export function safeErrorText(value: unknown, fallback = 'Unknown failure'): string {
  if (typeof value === 'string') return boundedText(value);
  if (!objectLike(value)) return fallback;
  const parts: string[] = [];
  const seen = new WeakSet<object>();
  let current: unknown = value;
  for (let depth = 0; depth < SAFE_INSPECTION_LIMITS.causeDepth; depth += 1) {
    if (!objectLike(current) || seen.has(current)) break;
    seen.add(current);
    for (const key of ['name', 'message', 'code']) {
      const raw = safeOwnData(current, key);
      const text = raw === undefined ? undefined : safePrimitiveText(raw);
      if (text !== undefined && text.length > 0) parts.push(text);
    }
    current = safeOwnData(current, 'cause');
  }
  return boundedText(parts.join(' ') || fallback);
}

export function safeErrorMessage(value: unknown, fallback = 'Unknown failure'): string {
  if (typeof value === 'string') return boundedText(value);
  const raw = safeOwnData(value, 'message');
  const message = raw === undefined ? undefined : safePrimitiveText(raw);
  return message === undefined || message.length === 0 ? fallback : boundedText(message);
}
