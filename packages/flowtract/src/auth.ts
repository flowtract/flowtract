import { Buffer } from 'node:buffer';
import { AuthError } from './errors.js';
import { registerAuthSecret } from './internal/state.js';
import { safeOwnData, safePrimitiveText } from './internal/safe-inspection.js';
import type { OperationDefinition, OperationInput, OperationResult } from './operation-types.js';
import type {
  AuthApplyContext,
  AuthProvider,
  AuthProviderInstance,
  AuthStateAccess,
  MaybePromise,
  SessionAuthOptions
} from './runtime-types.js';

type StringSource = string | ((state: AuthStateAccess) => MaybePromise<string>);

function nonEmpty(value: string, name: string): string {
  if (value.length === 0) {
    throw new Error(`${name} must not be empty.`);
  }
  return value;
}

async function resolve(
  source: StringSource,
  state: AuthStateAccess,
  name: string
): Promise<string> {
  const value: unknown = typeof source === 'function' ? await source(state) : source;
  if (typeof value !== 'string') throw new Error(`${name} must resolve to a string.`);
  return nonEmpty(value, name);
}

/** Creates a bearer-token provider whose token may be resolved from scenario state. */
export function bearerToken(options: { readonly token: StringSource }): AuthProvider {
  return {
    create: () => ({
      apply: async ({ state, request }) => {
        const token = await resolve(options.token, state, 'token');
        registerAuthSecret(request, token);
        request.setHeader('authorization', `Bearer ${token}`);
      }
    })
  };
}

/** Creates a collision-enforcing header or query API-key provider. */
export function apiKey(options: {
  readonly value: StringSource;
  readonly in: 'header' | 'query';
  readonly name: string;
}): AuthProvider {
  if (options.name.trim().length === 0) throw new Error('API key name must not be empty.');
  return {
    create: () => ({
      apply: async ({ state, request }) => {
        const value = await resolve(options.value, state, 'API key');
        registerAuthSecret(request, value);
        if (options.in === 'header') request.setHeader(options.name, value);
        else request.setQuery(options.name, value);
      }
    })
  };
}

/** Creates an RFC 7617 Basic authorization provider and tracks source and encoded secrets. */
export function basicAuth(options: {
  readonly username: StringSource;
  readonly password: StringSource;
}): AuthProvider {
  return {
    create: () => ({
      apply: async ({ state, request }) => {
        const username = await resolve(options.username, state, 'username');
        const password = await resolve(options.password, state, 'password');
        const encoded = Buffer.from(`${username}:${password}`, 'utf8').toString('base64');
        registerAuthSecret(request, username);
        registerAuthSecret(request, password);
        registerAuthSecret(request, encoded);
        request.setHeader('authorization', `Basic ${encoded}`);
      }
    })
  };
}

/** Creates a cookie-preserving login provider with project-owned extraction and optional CSRF. */
export function sessionAuth<const Login extends OperationDefinition>(
  options: SessionAuthOptions<Login>
): AuthProvider {
  return {
    create: () => ({
      setup: async context => {
        const input =
          typeof options.input === 'function' ? await options.input(context.state) : options.input;
        const result = (await context.execute(
          options.login,
          input as OperationInput<Login>
        )) as OperationResult<Login>;
        await options.afterLogin?.(result, context.state);
      },
      apply: ({ state, request }) => {
        if (options.csrf !== undefined) {
          const value = safePrimitiveText(state.require(options.csrf.state));
          if (value === undefined) throw new Error('CSRF state must be a primitive value.');
          registerAuthSecret(request, value);
          request.setHeader(options.csrf.header, value);
        }
      }
    })
  };
}

export function authFailure(
  profile: string,
  phase: 'create' | 'setup' | 'apply' | 'dispose',
  error: unknown
): AuthError {
  try {
    if (
      error instanceof AuthError &&
      safeOwnData(error.details, 'profile') === profile &&
      safeOwnData(error.details, 'phase') === phase
    ) {
      return error;
    }
  } catch {
    // Hostile proxy errors are normalized below without inspecting their properties.
  }
  return new AuthError(`Authentication profile "${profile}" failed during ${phase}.`, {
    details: { profile, phase },
    cause: error
  });
}

export async function applyAuth(
  profile: string,
  instance: AuthProviderInstance,
  context: AuthApplyContext
): Promise<void> {
  try {
    await instance.apply(context);
  } catch (error) {
    throw authFailure(profile, 'apply', error);
  }
}
