import { z } from 'zod';

/** Returns a Zod schema for an HTTP response that must contain zero body bytes. */
export function emptyBody(): z.ZodUndefined {
  return z.undefined();
}
