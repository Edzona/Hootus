import webpush from 'web-push';
import { env } from '../config/env.js';
import type { UserDatabase } from '../config/database.js';
import * as q from '../generated/push.queries.js';
import { logger } from './logger.js';
import { isAllowedPushEndpoint, messagePush } from './pushContent.js';

export const pushEnabled = () => !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);

type Device = { endpoint: string; p256dh: string; auth: string };
type DeviceResult = 'ok' | 'dead' | 'failed';

async function sendToDevice(device: Device, payload: string): Promise<DeviceResult> {
  // Checked again at send time in case a row predates the allowlist.
  if (!isAllowedPushEndpoint(device.endpoint)) return 'dead';
  try {
    await webpush.sendNotification(
      { endpoint: device.endpoint, keys: { p256dh: device.p256dh, auth: device.auth } },
      payload,
      {
        vapidDetails: {
          subject: env.VAPID_SUBJECT!,
          publicKey: env.VAPID_PUBLIC_KEY!,
          privateKey: env.VAPID_PRIVATE_KEY!,
        },
        TTL: 24 * 60 * 60, // drop it if the device stays offline for a day
        urgency: 'normal',
        timeout: 5000,
      },
    );
    return 'ok';
  } catch (error) {
    const status = error instanceof webpush.WebPushError ? error.statusCode : undefined;
    // 404/410: the subscription is gone for good (permission revoked, data cleared).
    if (status === 404 || status === 410) return 'dead';
    logger.warn('push failed: %s', status ?? (error instanceof Error ? error.name : 'unknown'));
    return 'failed';
  }
}

// Called after the message's transaction has committed. Never throws.
export async function notifyMessageByPush(db: UserDatabase, messageId: string) {
  try {
    const rows = await db(tx => q.claimMessagePush.run({ messageId }, tx));
    const notificationId = rows[0]?.notification_id;
    if (!notificationId) return; // no push due (conversation already had an unread notification)
    const devices = rows.filter((row): row is typeof row & Device =>
      !!(row.endpoint && row.p256dh && row.auth));
    let outcome: 'sent' | 'failed' | 'skipped' = 'skipped';
    const okEndpoints: string[] = [];
    const deadEndpoints: string[] = [];
    if (pushEnabled() && devices.length > 0) {
      const payload = messagePush({
        senderName: rows[0]!.sender_name,
        listingTitle: rows[0]!.listing_title,
        conversationId: rows[0]!.conversation_id,
        link: env.NOTIFICATION_LINK_URL,
      });
      const results = await Promise.all(devices.map(device => sendToDevice(device, payload)));
      results.forEach((result, index) => {
        if (result === 'ok') okEndpoints.push(devices[index]!.endpoint);
        if (result === 'dead') deadEndpoints.push(devices[index]!.endpoint);
      });
      outcome = okEndpoints.length > 0 ? 'sent' : 'failed';
    }
    await db(tx => q.finishNotificationPush.run({ notificationId, outcome, okEndpoints, deadEndpoints }, tx));
  } catch (error) {
    logger.error('push bookkeeping failed: %s', error instanceof Error ? error.message : 'unknown');
  }
}
