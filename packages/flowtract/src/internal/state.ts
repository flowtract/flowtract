import { InterpolationError } from '../errors.js';
import type { AuthStateAccess, MutableAuthRequest } from '../runtime-types.js';
import { safeOwnEntries, safePrimitiveText } from './safe-inspection.js';

export const authSecretRegistrar = Symbol('flowtract.authSecretRegistrar');

type SecretAwareAuthRequest = MutableAuthRequest & {
  [authSecretRegistrar]?(value: unknown): void;
};

export function registerAuthSecret(request: MutableAuthRequest, value: unknown): void {
  (request as SecretAwareAuthRequest)[authSecretRegistrar]?.(value);
}

function normalizedName(name: string): string {
  const normalized = name.trim();
  if (normalized.length === 0 || normalized.includes('{{') || normalized.includes('}}')) {
    throw new InterpolationError('State name is invalid.', {
      details: { reference: name, reason: 'invalid' }
    });
  }
  return normalized;
}

export class SecretTracker {
  readonly #strings = new Set<string>();

  add(value: unknown): void {
    const seen = new WeakSet<object>();
    const visit = (candidate: unknown): void => {
      const primitive = safePrimitiveText(candidate);
      if (
        typeof candidate === 'string' ||
        typeof candidate === 'number' ||
        typeof candidate === 'boolean' ||
        typeof candidate === 'bigint'
      ) {
        const text = primitive ?? '';
        if (text.length > 0) this.#strings.add(text);
        return;
      }
      if (candidate === null || typeof candidate !== 'object' || seen.has(candidate)) return;
      seen.add(candidate);
      const inspected = safeOwnEntries(candidate);
      if (
        !inspected.ok ||
        (!Array.isArray(candidate) &&
          inspected.prototype !== Object.prototype &&
          inspected.prototype !== null)
      ) {
        return;
      }
      for (const entry of inspected.entries) {
        if (entry.enumerable && entry.kind === 'data') visit(entry.value);
      }
    };
    visit(value);
  }

  strings(): readonly string[] {
    return [...this.#strings].sort((left, right) => right.length - left.length);
  }

  clear(): void {
    this.#strings.clear();
  }
}

export class ScenarioState implements AuthStateAccess {
  readonly #ordinary = new Map<string, unknown>();
  readonly #secret = new Map<string, unknown>();

  constructor(readonly secrets: SecretTracker) {}

  set(name: string, value: unknown): void {
    const key = normalizedName(name);
    if (this.#secret.has(key)) {
      throw new InterpolationError(`Secret state "${key}" cannot be downgraded.`, {
        details: { reference: key, reason: 'invalid' }
      });
    }
    this.#ordinary.set(key, value);
  }

  setSecret(name: string, value: unknown): void {
    const key = normalizedName(name);
    if (value === '') {
      throw new InterpolationError('Empty string secrets are not allowed.', {
        details: { reference: key, reason: 'invalid' }
      });
    }
    if (this.#ordinary.has(key)) {
      throw new InterpolationError(`Ordinary state "${key}" cannot become secret.`, {
        details: { reference: key, reason: 'invalid' }
      });
    }
    this.#secret.set(key, value);
    this.secrets.add(value);
  }

  get(name: string): unknown {
    const key = normalizedName(name);
    return this.#ordinary.has(key) ? this.#ordinary.get(key) : this.#secret.get(key);
  }

  require(name: string): unknown {
    const key = normalizedName(name);
    if (!this.has(key)) {
      throw new InterpolationError(`State value "${key}" is required.`, {
        details: { reference: key, reason: 'missing' }
      });
    }
    return this.get(key);
  }

  has(name: string): boolean {
    const key = normalizedName(name);
    return this.#ordinary.has(key) || this.#secret.has(key);
  }

  isSecret(name: string): boolean {
    return this.#secret.has(normalizedName(name));
  }

  clear(): void {
    this.#ordinary.clear();
    this.#secret.clear();
    this.secrets.clear();
  }
}
