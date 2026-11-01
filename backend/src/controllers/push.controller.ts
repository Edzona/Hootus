import type { RequestHandler } from 'express';
import { z } from 'zod';
// Namespace import: the generated query names match the handler names below.
import * as q from '../generated/push.queries.js';
import { env } from '../config/env.js';
import { assertAuthenticated } from '../helpers/auth.js';
import { HttpError } from '../helpers/errors.js';
import { pushEnabled } from '../helpers/push.js';
import { isAllowedPushEndpoint } from '../helpers/pushContent.js';
import { ErrorCode } from '../types/errorCode.js';

const endpoint = z.string().refine(isAllowedPushEndpoint, 'Unsupported push service');

// Same shape as the browser's PushSubscription.toJSON(), so the frontend can send it as-is.
// expirationTime is accepted and ignored.
export const saveSubscriptionBody = z.object({
  endpoint,
  expirationTime: z.number().nullable().optional(),
  keys: z.strictObject({
    p256dh: z.string().regex(/^[A-Za-z0-9_-]{80,100}$/),
    auth: z.string().regex(/^[A-Za-z0-9_-]{16,32}$/),
  }),
});
export const deleteSubscriptionBody = z.strictObject({ endpoint: z.string().max(2048) });

export const getPushConfig: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const [row] = await req.db(tx => q.countPushSubscriptions.run(undefined, tx));
  res.set('Cache-Control', 'private, no-store').json({
    data: {
      // Null means push is disabled on this server.
      publicKey: pushEnabled() ? env.VAPID_PUBLIC_KEY : null,
      devices: row?.devices ?? 0,
    },
  });
};

export const savePushSubscription: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  if (!pushEnabled()) {
    throw new HttpError(503, ErrorCode.FeatureDisabled, 'Notifications are not enabled on this server.');
  }
  const body = res.locals.body as z.infer<typeof saveSubscriptionBody>;
  const [row] = await req.db(tx => q.savePushSubscription.run({
    endpoint: body.endpoint, p256dh: body.keys.p256dh, auth: body.keys.auth,
  }, tx));
  if (!row?.id) throw new HttpError(403, ErrorCode.Forbidden, 'Your account cannot use notifications yet.');
  res.status(201).json({ data: { id: row.id } });
};

export const deletePushSubscription: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { endpoint: value } = res.locals.body as z.infer<typeof deleteSubscriptionBody>;
  await req.db(tx => q.deletePushSubscription.run({ endpoint: value }, tx));
  // Idempotent: removing a device that is already gone is not an error.
  res.status(204).end();
};
