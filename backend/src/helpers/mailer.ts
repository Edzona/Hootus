import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import type { UserDatabase } from '../config/database.js';
import * as q from '../generated/notifications.queries.js';
import { logger } from './logger.js';
import { type EmailContent, messageEmail } from './notificationEmail.js';

let transport: ReturnType<typeof nodemailer.createTransport> | undefined;

// Short timeouts: the sender's request waits for this (serverless may stop
// work left running after the response), so a slow SMTP server must not hang it.
function getTransport() {
  transport ??= nodemailer.createTransport({
    url: env.SMTP_URL,
    connectionTimeout: 5000,
    greetingTimeout: 5000,
    socketTimeout: 10000,
  });
  return transport;
}

export async function sendEmail(to: string, content: EmailContent) {
  // Addresses are never built from user-written text: `to` comes from
  // profiles.email (constrained to @temple.edu) and `from` from env.
  await getTransport().sendMail({ from: env.MAIL_FROM, to, ...content });
}

// Called after the message's transaction has committed. Never throws: a failed
// email must not turn a sent message into an error for the sender.
export async function notifyMessageByEmail(db: UserDatabase, messageId: string) {
  try {
    const [claim] = await db(tx => q.claimMessageEmail.run({ messageId }, tx));
    // No row: the conversation already had an unread notification (or no email is due).
    if (!claim?.notification_id) return;
    let outcome: 'sent' | 'failed' | 'skipped' = 'skipped';
    if (env.SMTP_URL && claim.recipient_email) {
      try {
        await sendEmail(claim.recipient_email, messageEmail({
          recipientName: claim.recipient_name,
          senderName: claim.sender_name,
          listingTitle: claim.listing_title,
          link: env.NOTIFICATION_LINK_URL,
        }));
        outcome = 'sent';
      } catch (error) {
        outcome = 'failed';
        // Log the failure kind only; no addresses or message content.
        logger.warn('notification email failed: %s', error instanceof Error ? error.name : 'unknown');
      }
    }
    const notificationId = claim.notification_id;
    await db(tx => q.finishNotificationEmail.run({ notificationId, outcome }, tx));
  } catch (error) {
    logger.error('notification email bookkeeping failed: %s', error instanceof Error ? error.message : 'unknown');
  }
}
