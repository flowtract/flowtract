import { Buffer } from 'node:buffer';
import { AuthError } from './errors.js';
import type {
  FlowtractExecutionOptions,
  OperationDefinition,
  OperationInput,
  OperationResult
} from './operation-types.js';
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
  return nonEmpty(typeof source === 'function' ? await source(state) : source, name);
}

export function bearerToken(options: { readonly token: StringSource }): AuthProvider {
  return {
    create: () => ({
      apply: async ({ state, request }) => {
        request.setHeader(
          'authorization',
          `Bearer ${await resolve(options.token, state, 'token')}`
        );
      }
    })
  };
}

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
        if (options.in === 'header') request.setHeader(options.name, value);
        else request.setQuery(options.name, value);
      }
    })
  };
}

export function basicAuth(options: {
  readonly username: StringSource;
  readonly password: StringSource;
}): AuthProvider {
  return {
    create: () => ({
      apply: async ({ state, request }) => {
        const username = await resolve(options.username, state, 'username');
        const password = await resolve(options.password, state, 'password');
        request.setHeader(
          'authorization',
          `Basic ${Buffer.from(`${username}:${password}`, 'utf8').toString('base64')}`
        );
      }
    })
  };
}

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
          input as OperationInput<Login>,
          { auth: false } as FlowtractExecutionOptions & { dryRun?: false }
        )) as OperationResult<Login>;
        await options.afterLogin?.(result, context.state);
      },
      apply: ({ state, request }) => {
        if (options.csrf !== undefined) {
          request.setHeader(options.csrf.header, String(state.require(options.csrf.state)));
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
  if (
    error instanceof AuthError &&
    error.details?.profile === profile &&
    error.details.phase === phase
  ) {
    return error;
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
