import type { RequestHandler } from 'express';
import { z } from 'zod';
// Namespace import: the generated query names match the handler names below.
import * as q from '../generated/notifications.queries.js';
import { assertAuthenticated } from '../helpers/auth.js';
import { HttpError } from '../helpers/errors.js';
import { pageSchema } from '../helpers/validation.js';
import { ErrorCode } from '../types/errorCode.js';

export const notificationParams = z.strictObject({ notificationId: z.uuid() });

export const getNotifications: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const page = res.locals.query as z.infer<typeof pageSchema>;
  const { rows, unread } = await req.db(async tx => ({
    rows: await q.getNotifications.run(page, tx),
    unread: (await q.countUnreadNotifications.run(undefined, tx))[0]?.unread ?? 0,
  }));
  const data = rows.map(n => ({
    id: n.id,
    kind: n.kind,
    actorName: n.actor_name ?? 'Hootus member',
    conversation: n.conversation ?? null,
    listingTitle: n.listing_title ?? null,
    // Messages grouped into this notification while it was unread.
    count: n.event_count,
    createdAt: n.created_at,
    updatedAt: n.updated_at,
    read: n.read_at !== null,
  }));
  res.set('Cache-Control', 'private, no-store').json({ data, meta: { unread } });
};

export const getUnreadCount: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const [row] = await req.db(tx => q.countUnreadNotifications.run(undefined, tx));
  res.set('Cache-Control', 'private, no-store').json({ data: { unread: row?.unread ?? 0 } });
};

export const markNotificationRead: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { notificationId } = res.locals.params as z.infer<typeof notificationParams>;
  const [row] = await req.db(tx => q.markNotificationRead.run({ notificationId }, tx));
  if (!row) throw new HttpError(404, ErrorCode.NotFound, 'That notification no longer exists.');
  res.status(204).end();
};

export const markAllNotificationsRead: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const rows = await req.db(tx => q.markAllNotificationsRead.run(undefined, tx));
  res.json({ data: { marked: rows.length } });
};
