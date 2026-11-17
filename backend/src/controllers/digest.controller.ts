import { timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { z } from 'zod';
import { withServer } from '../config/database.js';
import { env } from '../config/env.js';
import * as q from '../generated/digest.queries.js';
import { sendDailyDigests, verifyUnsubscribeToken } from '../helpers/digest.js';
import { HttpError } from '../helpers/errors.js';
import { ErrorCode } from '../types/errorCode.js';

export const unsubscribeQuerySchema = z.strictObject({
  token: z.string().min(1).max(300),
});

function hasValidCronSecret(header: string | undefined): boolean {
  if (!env.CRON_SECRET || !header?.startsWith('Bearer ')) return false;
  const provided = Buffer.from(header.slice('Bearer '.length));
  const expected = Buffer.from(env.CRON_SECRET);
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

export const runDigest: RequestHandler = async (req, res) => {
  if (!env.CRON_SECRET) {
    throw new HttpError(503, ErrorCode.FeatureDisabled, 'Digest cron is not configured.');
  }
  if (!hasValidCronSecret(req.headers.authorization)) {
    throw new HttpError(401, ErrorCode.Unauthorized, 'Invalid cron authorization.');
  }
  const result = await sendDailyDigests();
  res.json({ data: result });
};

export const unsubscribeDigest: RequestHandler = async (_req, res) => {
  const { token } = res.locals.query as z.infer<typeof unsubscribeQuerySchema>;
  const profileId = verifyUnsubscribeToken(token);
  if (!profileId) {
    res.status(400).type('html').send(
      '<!doctype html><html><body style="font-family:system-ui;padding:32px;">'
      + '<h1>Invalid unsubscribe link</h1>'
      + '<p>Sign in to Hootus and change your email digest setting in the Activity tab.</p>'
      + '</body></html>',
    );
    return;
  }
  await withServer(tx => q.setEmailDigestByToken.run({ id: profileId, enabled: false }, tx));
  res.status(200).type('html').send(
    '<!doctype html><html><body style="font-family:system-ui;padding:32px;">'
    + '<h1>Unsubscribed</h1>'
    + '<p>You won&rsquo;t receive daily Hootus listing digests anymore. You can turn them back on anytime in the Activity tab.</p>'
    + '</body></html>',
  );
};
