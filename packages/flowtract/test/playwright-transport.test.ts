import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  body: vi.fn(),
  contextDispose: vi.fn(),
  fetch: vi.fn(),
  newContext: vi.fn(),
  responseDispose: vi.fn()
}));

vi.mock('playwright', () => ({
  errors: {
    TimeoutError: class TimeoutError extends Error {}
  },
  request: {
    newContext: mocks.newContext
  }
}));

import { TransportError } from '../src/errors.js';
import { playwrightTransport } from '../src/playwright-transport.js';

describe('Playwright transport resource ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.body.mockResolvedValue(Buffer.from('{"ok":true}'));
    mocks.responseDispose.mockResolvedValue(undefined);
    mocks.contextDispose.mockResolvedValue(undefined);
    mocks.fetch.mockResolvedValue({
      body: mocks.body,
      dispose: mocks.responseDispose,
      headersArray: () => [{ name: 'content-type', value: 'application/json' }],
      status: () => 200,
      url: () => 'http://service.local/final'
    });
    mocks.newContext.mockResolvedValue({
      dispose: mocks.contextDispose,
      fetch: mocks.fetch
    });
  });

  it('disposes every response and the context exactly once', async () => {
    const session = await playwrightTransport().createSession({
      baseURL: 'http://service.local',
      allowInsecureTls: false
    });
    await session.execute({
      operationId: 'proof.resource',
      method: 'GET',
      url: 'http://service.local/resource',
      headers: [],
      timeoutMs: 100
    });
    await session.dispose();
    await session.dispose();

    expect(mocks.responseDispose).toHaveBeenCalledTimes(1);
    expect(mocks.contextDispose).toHaveBeenCalledTimes(1);
    expect(mocks.newContext).toHaveBeenCalledWith(
      expect.objectContaining({
        failOnStatusCode: false,
        ignoreHTTPSErrors: false,
        maxRedirects: 20
      })
    );
    expect(mocks.fetch).toHaveBeenCalledWith(
      'http://service.local/resource',
      expect.objectContaining({
        failOnStatusCode: false,
        maxRedirects: 20,
        maxRetries: 0,
        timeout: 100
      })
    );
  });

  it('disposes the response when body extraction fails', async () => {
    mocks.body.mockRejectedValueOnce(new Error('body failure'));
    const session = await playwrightTransport().createSession({
      baseURL: 'http://service.local',
      allowInsecureTls: false
    });
    await expect(
      session.execute({
        operationId: 'proof.resource-failure',
        method: 'GET',
        url: 'http://service.local/resource',
        headers: [],
        timeoutMs: 100
      })
    ).rejects.toBeInstanceOf(TransportError);
    expect(mocks.responseDispose).toHaveBeenCalledTimes(1);
    await session.dispose();
  });
});
