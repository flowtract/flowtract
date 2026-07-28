import { z } from 'zod';
import { defineOperation, emptyBody } from '../../src/index.js';

export const ApiErrorSchema = z.object({
  code: z.string(),
  message: z.string()
});

export const PartSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  description: z.string().optional(),
  attributes: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.string(),
  createdBy: z.string()
});

export const Login = defineOperation({
  id: 'auth.login',
  method: 'POST',
  path: '/api/auth/login',
  request: {
    body: z.object({
      username: z.string().min(1),
      password: z.string().min(1)
    })
  },
  responses: {
    200: {
      body: z.object({
        sessionId: z.string(),
        csrfToken: z.string(),
        user: z.object({
          username: z.string(),
          roles: z.array(z.string())
        })
      })
    },
    401: { body: ApiErrorSchema }
  }
});

export const CreatePart = defineOperation({
  id: 'parts.create',
  method: 'POST',
  path: '/api/parts',
  auth: 'session',
  request: {
    headers: z
      .object({
        'x-request-id': z.string().optional()
      })
      .default({}),
    body: z.object({
      name: z.string().min(1),
      type: z.enum(['Assembly', 'Component']),
      description: z.string().optional(),
      attributes: z.record(z.string(), z.unknown()).optional()
    })
  },
  responses: {
    201: {
      body: PartSchema,
      headers: z.object({ etag: z.string() })
    },
    400: { body: ApiErrorSchema },
    403: { body: ApiErrorSchema }
  }
});

export const GetPart = defineOperation({
  id: 'parts.get',
  method: 'GET',
  path: '/api/parts/{partId}',
  auth: 'session',
  request: {
    pathParams: z.object({
      partId: z.string().min(1)
    })
  },
  responses: {
    200: { body: PartSchema },
    404: { body: ApiErrorSchema }
  }
});

export const ListParts = defineOperation({
  id: 'parts.list',
  method: 'GET',
  path: '/api/parts',
  auth: 'session',
  request: {
    query: z
      .object({
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        type: z.enum(['Assembly', 'Component']).optional()
      })
      .prefault({})
  },
  responses: {
    200: {
      body: z.object({
        items: z.array(PartSchema),
        page: z.number().int(),
        limit: z.number().int(),
        total: z.number().int()
      })
    },
    default: { body: ApiErrorSchema }
  }
});

export const UpdatePart = defineOperation({
  id: 'parts.update',
  method: 'PUT',
  path: '/api/parts/{partId}',
  auth: 'session',
  request: {
    pathParams: z.object({
      partId: z.string().min(1)
    }),
    body: z.object({
      name: z.string().min(1).optional(),
      type: z.enum(['Assembly', 'Component']).optional(),
      description: z.string().optional(),
      attributes: z.record(z.string(), z.unknown()).optional()
    })
  },
  responses: {
    200: { body: PartSchema },
    400: { body: ApiErrorSchema },
    404: { body: ApiErrorSchema }
  }
});

export const DeletePart = defineOperation({
  id: 'parts.delete',
  method: 'DELETE',
  path: '/api/parts/{partId}',
  auth: 'session',
  request: {
    pathParams: z.object({
      partId: z.string().min(1)
    })
  },
  responses: {
    204: { body: emptyBody() },
    404: { body: ApiErrorSchema }
  }
});

export const CreateChangeOrder = defineOperation({
  id: 'engineering.change-orders.create',
  method: 'POST',
  path: '/api/engineering/change-orders',
  auth: 'session',
  timeoutMs: 20_000,
  request: {
    body: z.object({
      title: z.string().min(1),
      description: z.string().min(1),
      priority: z.enum(['low', 'medium', 'high', 'critical']),
      affectedPartIds: z.array(z.string()).min(1),
      requestedDate: z.string().datetime()
    })
  },
  responses: {
    201: {
      body: z.object({
        id: z.string(),
        status: z.enum(['draft', 'submitted', 'approved', 'rejected']),
        createdAt: z.string()
      })
    },
    400: { body: ApiErrorSchema },
    403: { body: ApiErrorSchema }
  }
});
