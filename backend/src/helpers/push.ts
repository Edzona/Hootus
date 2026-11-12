import webpush from 'web-push';
import { env } from '../config/env.js';
import type { UserDatabase } from '../config/database.js';
import * as q from '../generated/push.queries.js';
import { logger } from './logger.js';
import { isAllowedPushEndpoint, listingPush, messagePush } from './pushContent.js';

export const pushEnabled = () => !!(env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY && env.VAPID_SUBJECT);

type Device = { endpoint: string; p256dh: string; auth: string };
type DeviceResult = 'ok' | 'dead' | 'failed';

const isDevice = <T extends Partial<Record<keyof Device, string | null>>>(row: T): row is T & Device =>
  !!(row.endpoint && row.p256dh && row.auth);

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

// Sends one payload to many devices, a batch at a time so a listing that goes
// to everyone does not open hundreds of connections at once.
const BATCH = 20;
async function sendToDevices(devices: Device[], payload: string) {
  const okEndpoints: string[] = [];
  const deadEndpoints: string[] = [];
  for (let start = 0; start < devices.length; start += BATCH) {
    const batch = devices.slice(start, start + BATCH);
    const results = await Promise.all(batch.map(device => sendToDevice(device, payload)));
    results.forEach((result, index) => {
      if (result === 'ok') okEndpoints.push(batch[index]!.endpoint);
      if (result === 'dead') deadEndpoints.push(batch[index]!.endpoint);
    });
  }
  return { okEndpoints, deadEndpoints };
}

// Called after the message's transaction has committed. Never throws.
export async function notifyMessageByPush(db: UserDatabase, messageId: string) {
  try {
    const rows = await db(tx => q.claimMessagePush.run({ messageId }, tx));
    const notificationId = rows[0]?.notification_id;
    if (!notificationId) return; // no push due (conversation already had an unread notification)
    const devices = rows.filter(isDevice);
    let outcome: 'sent' | 'failed' | 'skipped' = 'skipped';
    let sent = { okEndpoints: [] as string[], deadEndpoints: [] as string[] };
    if (pushEnabled() && devices.length > 0) {
      sent = await sendToDevices(devices, messagePush({
        senderName: rows[0]!.sender_name,
        listingTitle: rows[0]!.listing_title,
        conversationId: rows[0]!.conversation_id,
        link: env.NOTIFICATION_LINK_URL,
      }));
      outcome = sent.okEndpoints.length > 0 ? 'sent' : 'failed';
    }
    await db(tx => q.finishNotificationPush.run({ notificationId, outcome, ...sent }, tx));
  } catch (error) {
    logger.error('push bookkeeping failed: %s', error instanceof Error ? error.message : 'unknown');
  }
}

// Called after the listing's transaction has committed. Never throws: a failed
// push must not turn a posted listing into an error for the seller.
export async function notifyListingByPush(db: UserDatabase, listingId: string) {
  try {
    const rows = await db(tx => q.claimListingPush.run({ listingId }, tx));
    if (rows.length === 0) return; // nobody is due a push (all grouped, or nobody has push on)
    const enabled = pushEnabled();
    let sent = { okEndpoints: [] as string[], deadEndpoints: [] as string[] };
    if (enabled) {
      sent = await sendToDevices(rows.filter(isDevice), listingPush({
        authorName: rows[0]!.author_name,
        listingTitle: rows[0]!.listing_title,
        category: rows[0]!.category,
        priceJpy: rows[0]!.price_jpy,
        link: env.NOTIFICATION_LINK_URL,
      }));
    }
    await db(tx => q.finishListingPush.run({ listingId, pushEnabled: enabled, ...sent }, tx));
  } catch (error) {
    logger.error('listing push bookkeeping failed: %s', error instanceof Error ? error.message : 'unknown');
  }
}
