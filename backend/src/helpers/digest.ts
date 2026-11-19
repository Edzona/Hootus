import { createHmac, timingSafeEqual } from 'node:crypto';
import nodemailer from 'nodemailer';
import { z } from 'zod';
import { withServer } from '../config/database.js';
import { env } from '../config/env.js';
import * as q from '../generated/digest.queries.js';
import { ListingCategory } from '../types/domain.js';
import { logger } from './logger.js';

export interface DigestListingItem {
  id: string;
  category: string;
  title: string;
  price_jpy: number | null;
  location: string | null;
}

export interface DigestClubPostItem {
  id: string;
  club_name: string;
  body: string;
}

export interface DigestOfferItem {
  id: string;
  title: string;
  business_name: string | null;
}

export interface DigestEmailInput {
  fullName: string | null;
  total: number;
  listings: DigestListingItem[];
  clubPosts?: DigestClubPostItem[];
  offers?: DigestOfferItem[];
  activityUrl: string;
  unsubscribeUrl: string;
}

const categoryLabels: Record<string, string> = {
  [ListingCategory.Sales]: 'For sale',
  [ListingCategory.Housing]: 'Housing',
  [ListingCategory.Gigs]: 'Gig',
};

const digestListingSchema = z.array(z.object({
  id: z.string(),
  category: z.string(),
  title: z.string(),
  price_jpy: z.number().nullable(),
  location: z.string().nullable().optional().transform(v => v ?? null),
}));

const digestClubPostSchema = z.array(z.object({
  id: z.string(),
  club_name: z.string(),
  body: z.string(),
}));

const digestOfferSchema = z.array(z.object({
  id: z.string(),
  title: z.string(),
  business_name: z.string().nullable().optional().transform(v => v ?? null),
}));

const BATCH_SIZE = 100;

function escapeHtml(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatPrice(item: DigestListingItem): string {
  if (item.price_jpy === null) return 'Ask for price';
  const yen = `¥${Math.round(item.price_jpy).toLocaleString('en-US')}`;
  return item.category === ListingCategory.Housing ? `${yen}/mo` : yen;
}

export function signUnsubscribeToken(profileId: string, secret = env.CRON_SECRET): string {
  if (!secret) throw new Error('CRON_SECRET is required to sign unsubscribe tokens.');
  const mac = createHmac('sha256', secret).update(`unsubscribe:${profileId}`).digest('base64url');
  return `${profileId}.${mac}`;
}

export function verifyUnsubscribeToken(token: string, secret = env.CRON_SECRET): string | null {
  if (!secret) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [profileId, mac] = parts;
  if (!profileId || !mac || !z.uuid().safeParse(profileId).success) return null;
  const expected = createHmac('sha256', secret).update(`unsubscribe:${profileId}`).digest();
  const actual = Buffer.from(mac, 'base64url');
  if (actual.length !== expected.length) return null;
  return timingSafeEqual(actual, expected) ? profileId : null;
}

export function formatDigestEmail(input: DigestEmailInput) {
  const clubPosts = input.clubPosts ?? [];
  const offers = input.offers ?? [];
  const greeting = input.fullName?.trim() ? `Hi ${input.fullName.trim()},` : 'Hi there,';
  const subject = input.total === 1
    ? '1 new update on Hootus'
    : `${input.total} new updates on Hootus`;

  const listingLines = input.listings.map(item => {
    const label = categoryLabels[item.category] ?? 'Listing';
    const place = item.location ? ` · ${item.location}` : '';
    return `- [${label}] ${item.title} (${formatPrice(item)}${place})`;
  });
  const postLines = clubPosts.map(p => `- [Club] ${p.club_name}: ${p.body}`);
  const offerLines = offers.map(o => `- [Offer] ${o.title}${o.business_name ? ` (${o.business_name})` : ''}`);
  const allTextLines = [...listingLines, ...postLines, ...offerLines];
  if (input.total > allTextLines.length) {
    allTextLines.push(`...and ${input.total - allTextLines.length} more in Activity.`);
  }

  const text = [
    greeting,
    '',
    'Here’s a summary of what’s new on Hootus:',
    ...allTextLines,
    '',
    `Open Activity for full details: ${input.activityUrl}`,
    '',
    `Unsubscribe from daily digest: ${input.unsubscribeUrl}`,
  ].join('\n');

  const htmlRows = [
    ...input.listings.map(item => {
      const label = escapeHtml(categoryLabels[item.category] ?? 'Listing');
      const title = escapeHtml(item.title);
      const meta = escapeHtml(`${formatPrice(item)}${item.location ? ` · ${item.location}` : ''}`);
      return `<li style="margin:8px 0;"><strong>[${label}]</strong> ${title} <span style="color:#555;">(${meta})</span></li>`;
    }),
    ...clubPosts.map(p =>
      `<li style="margin:8px 0;"><strong>[Club] ${escapeHtml(p.club_name)}:</strong> ${escapeHtml(p.body)}</li>`),
    ...offers.map(o => {
      const biz = o.business_name ? ` <span style="color:#555;">(${escapeHtml(o.business_name)})</span>` : '';
      return `<li style="margin:8px 0;"><strong>[Offer]</strong> ${escapeHtml(o.title)}${biz}</li>`;
    }),
  ].join('');

  const shownCount = input.listings.length + clubPosts.length + offers.length;
  const moreLine = input.total > shownCount
    ? `<p style="color:#555;">…and ${input.total - shownCount} more in Activity.</p>`
    : '';

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;color:#111;line-height:1.5;">
      <p>${escapeHtml(greeting)}</p>
      <p>Here&rsquo;s a summary of what&rsquo;s new on Hootus:</p>
      <ul style="padding-left:18px;">${htmlRows}</ul>
      ${moreLine}
      <p style="margin:20px 0;">
        <a href="${escapeHtml(input.activityUrl)}" style="display:inline-block;background:#111;color:#fff;padding:10px 16px;text-decoration:none;font-weight:bold;">
          Open Activity for full details
        </a>
      </p>
      <p style="font-size:12px;color:#666;border-top:1px solid #ddd;padding-top:12px;">
        You&rsquo;re receiving this daily digest from Hootus.
        <a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#666;">Unsubscribe</a>
      </p>
    </div>
  `.trim();

  return { subject, text, html };
}

export const digestConfigured = () => Boolean(env.SMTP_HOST && env.SMTP_FROM && env.CRON_SECRET);

function createTransporter() {
  return nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    ...(env.SMTP_USER && env.SMTP_PASS
      ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } }
      : {}),
  });
}

export async function sendDailyDigests(batchSize = BATCH_SIZE) {
  if (!digestConfigured()) {
    return { enabled: false, sent: 0, failed: 0 };
  }
  const transporter = createTransporter();
  const baseApi = env.PUBLIC_API_URL.replace(/\/$/, '');
  let sent = 0;
  // Failed claims are reverted only after the run, so nobody is retried within it.
  const failures: { id: string; since: Date }[] = [];

  try {
    while (true) {
      const batch = await withServer(tx => q.claimDigests.run({ batch: batchSize }, tx));
      if (batch.length === 0) break;

      for (const row of batch) {
        const listings = digestListingSchema.parse(row.listings);
        const clubPosts = digestClubPostSchema.parse(row.club_posts);
        const offers = digestOfferSchema.parse(row.offers);
        const token = signUnsubscribeToken(row.profile_id);
        const unsubscribeUrl = `${baseApi}/api/digest/unsubscribe?token=${encodeURIComponent(token)}`;
        const email = formatDigestEmail({
          fullName: row.full_name,
          total: row.total,
          listings,
          clubPosts,
          offers,
          activityUrl: env.NOTIFICATION_LINK_URL,
          unsubscribeUrl,
        });

        try {
          await transporter.sendMail({
            from: env.SMTP_FROM,
            to: row.email,
            subject: email.subject,
            text: email.text,
            html: email.html,
            headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>` },
          });
          sent += 1;
        } catch (error) {
          failures.push({ id: row.profile_id, since: row.since });
          logger.warn('digest send failed: %s', error instanceof Error ? error.name : 'unknown');
        }
      }

      if (batch.length < batchSize) break;
    }
  } finally {
    for (const failure of failures) {
      await withServer(tx => q.revertDigest.run(failure, tx)).catch(() => {});
    }
  }
  return { enabled: true, sent, failed: failures.length };
}
