import type { RequestHandler } from 'express';
import { z } from 'zod';
// Namespace import: the generated query names match the handler names below.
import * as q from '../generated/messaging.queries.js';
import { markConversationNotificationsRead } from '../generated/notifications.queries.js';
import { assertAuthenticated } from '../helpers/auth.js';
import { HttpError } from '../helpers/errors.js';
import { notifyMessageByEmail } from '../helpers/mailer.js';
import { pageSchema } from '../helpers/validation.js';
import { ErrorCode } from '../types/errorCode.js';

export const listingParams = z.strictObject({ listingId: z.uuid() });
export const conversationParams = z.strictObject({ conversationId: z.uuid() });
export const messagesQuery = z.strictObject({
  limit: z.coerce.number().int().min(1).max(50).default(30),
  before: z.iso.datetime({ offset: true }).optional(),
});
export const sendMessageBody = z.strictObject({
  body: z.string().trim().min(1).max(2000),
});

// Same response for "doesn't exist" and "not yours", so ids can't be probed.
const conversationNotFound = () =>
  new HttpError(404, ErrorCode.NotFound, 'That conversation no longer exists.');

export const startConversation: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { listingId } = res.locals.params as z.infer<typeof listingParams>;
  const run = () => req.db(tx => q.startConversation.run({ listingId }, tx));
  // Two simultaneous requests (a double-click) can each miss the other's row; retry once.
  let [conversation] = await run();
  if (!conversation) [conversation] = await run();
  if (!conversation) {
    throw new HttpError(404, ErrorCode.NotFound, 'That listing is not available for messaging.');
  }
  res.json({ data: { id: conversation.id } });
};

export const getInbox: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const page = res.locals.query as z.infer<typeof pageSchema>;
  const rows = await req.db(tx => q.getInbox.run(page, tx));
  const data = rows.map(c => ({
    id: c.id,
    listing: c.listing,
    listingTitle: c.listing_title,
    category: c.category,
    listingStatus: c.listing_status,
    otherName: c.other_name ?? 'Hootus member',
    isSeller: !!c.is_seller,
    lastMessage: c.last_message,
    lastMessageAt: c.last_message_at,
    lastFromMe: !!c.last_from_me,
  }));
  res.set('Cache-Control', 'private, no-store').json({ data });
};

export const getConversation: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { conversationId } = res.locals.params as z.infer<typeof conversationParams>;
  const [c] = await req.db(tx => q.getConversation.run({ conversationId }, tx));
  if (!c) throw conversationNotFound();
  res.set('Cache-Control', 'private, no-store').json({
    data: {
      id: c.id,
      listing: c.listing,
      listingTitle: c.listing_title,
      listingStatus: c.listing_status,
      otherName: c.other_name ?? 'Hootus member',
      isSeller: !!c.is_seller,
    },
  });
};

export const getConversationMessages: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { conversationId } = res.locals.params as z.infer<typeof conversationParams>;
  const { limit, before } = res.locals.query as z.infer<typeof messagesQuery>;
  const data = await req.db(async tx => {
    // Check access first so "not yours" is a 404, not an empty list.
    const [conversation] = await q.getConversation.run({ conversationId }, tx);
    if (!conversation) throw conversationNotFound();
    const rows = await q.getConversationMessages.run(
      { conversationId, limit, before: before ?? null }, tx);
    // Reading the conversation clears its notification (and re-arms the email).
    if (!before) await markConversationNotificationsRead.run({ conversationId }, tx);
    return {
      messages: rows.map(m => ({
        id: m.id, body: m.body, createdAt: m.created_at, fromMe: !!m.from_me,
      })),
      // Pass this back as ?before= to load older messages; null means no more.
      nextBefore: rows.length === limit ? rows.at(-1)?.created_at ?? null : null,
    };
  });
  res.set('Cache-Control', 'private, no-store').json({ data });
};

export const sendMessage: RequestHandler = async (req, res) => {
  assertAuthenticated(req);
  const { conversationId } = res.locals.params as z.infer<typeof conversationParams>;
  const { body } = res.locals.body as z.infer<typeof sendMessageBody>;
  const [message] = await req.db(tx => q.sendMessage.run({ conversationId, body }, tx));
  if (!message) throw conversationNotFound();
  // After commit. Awaited because serverless may stop work left running after
  // the response; it never throws, so the message still counts as sent.
  await notifyMessageByEmail(req.db, message.id);
  res.status(201).json({ data: { id: message.id, createdAt: message.created_at } });
};
