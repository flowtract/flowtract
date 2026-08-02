import { performance } from 'node:perf_hooks';
import { errors, request as playwrightRequest } from 'playwright';
import { TransportError } from './errors.js';
import type { HttpTransport, TransportRequest, TransportResponse } from './runtime-types.js';
import { safeErrorText } from './internal/safe-inspection.js';

function errorText(error: unknown): string {
  return safeErrorText(error, '');
}

function isTimeoutError(error: unknown): boolean {
  try {
    return error instanceof errors.TimeoutError;
  } catch {
    return false;
  }
}

function classify(
  error: unknown,
  request: TransportRequest
): 'timeout' | 'abort' | 'network' | 'tls' | 'unknown' {
  if (request.signal?.aborted === true) return 'abort';
  const text = errorText(error);
  const redirectOverflow = /max(?:imum)? redirect|redirect count exceeded/iu.test(text);
  if (!redirectOverflow && (isTimeoutError(error) || /timeout|timed out/iu.test(text))) {
    return 'timeout';
  }
  if (/certificate|self.signed|ERR_TLS|CERT_|DEPTH_ZERO/iu.test(text)) return 'tls';
  if (/ECONN|ENOTFOUND|EAI_AGAIN|socket|network|redirect/iu.test(text)) return 'network';
  return 'unknown';
}

/** Creates the default isolated Playwright HTTP transport with secure TLS verification. */
export function playwrightTransport(): HttpTransport {
  return {
    async createSession(options) {
      let context;
      try {
        context = await playwrightRequest.newContext({
          baseURL: options.baseURL,
          ignoreHTTPSErrors: options.allowInsecureTls,
          failOnStatusCode: false,
          maxRedirects: 20
        });
      } catch (error) {
        throw new TransportError('Failed to create the Playwright transport session.', {
          details: { kind: 'unknown' },
          cause: error
        });
      }
      let disposed = false;
      return {
        async execute(request): Promise<TransportResponse> {
          const started = performance.now();
          let response;
          try {
            response = await context.fetch(request.url, {
              method: request.method,
              headers: Object.fromEntries(request.headers),
              ...(request.body === undefined ? {} : { data: Buffer.from(request.body) }),
              timeout: request.timeoutMs,
              failOnStatusCode: false,
              maxRedirects: 20,
              maxRetries: 0,
              ...(request.signal === undefined ? {} : { signal: request.signal })
            });
            const body = new Uint8Array(await response.body());
            return {
              status: response.status(),
              headers: response.headersArray().map(({ name, value }) => [name, value] as const),
              body,
              url: response.url(),
              durationMs: performance.now() - started
            };
          } catch (error) {
            throw new TransportError('HTTP transport execution failed.', {
              operationId: request.operationId,
              details: { kind: classify(error, request) },
              cause: error
            });
          } finally {
            await response?.dispose().catch(() => undefined);
          }
        },
        async dispose(): Promise<void> {
          if (disposed) return;
          disposed = true;
          await context.dispose();
        }
      };
    }
  };
}
