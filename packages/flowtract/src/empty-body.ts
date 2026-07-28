import { z } from 'zod';

export function emptyBody(): z.ZodUndefined {
  return z.undefined();
}
