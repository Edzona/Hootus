import 'dotenv/config';
import { z } from 'zod';

const optionalString = z.preprocess(value => value === '' ? undefined : value, z.string().min(1).optional());

const schema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  DATABASE_URL: z.url().refine(value => {
    const url = new URL(value);
    return ['postgres:', 'postgresql:'].includes(url.protocol)
      && /^hootus_server(?:\.|$)/.test(decodeURIComponent(url.username));
  }, 'Use the dedicated hootus_server database login'),
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CORS_ORIGINS: z.string().default('http://localhost:5173')
    .transform(value => value.split(',').map(origin => origin.trim()))
    .pipe(z.array(z.url()).min(1)),
  // Activity tab URL linked inside daily digest emails.
  NOTIFICATION_LINK_URL: z.url().default('http://localhost:5173/#/activity'),
  // Base URL of this API for one-click unsubscribe links in digest emails.
  PUBLIC_API_URL: z.url().default('http://localhost:5001'),
  // Shared secret sent by Vercel Cron (`Authorization: Bearer <CRON_SECRET>`)
  // and used to sign unsubscribe links. Leave empty to disable the digest job.
  CRON_SECRET: z.preprocess(value => value === '' ? undefined : value, z.string().min(16).optional()),
  // SMTP credentials for the daily digest email. Leave SMTP_HOST empty to disable sending.
  SMTP_HOST: optionalString,
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_USER: optionalString,
  SMTP_PASS: optionalString,
  SMTP_FROM: optionalString,
}).refine(value => !value.SMTP_HOST || Boolean(value.SMTP_FROM), {
  path: ['SMTP_FROM'], message: 'Set SMTP_FROM when SMTP_HOST is configured',
});

const result = schema.safeParse(process.env);
if (!result.success) {
  // Report variable names only, never secret values.
  throw new Error(`Invalid environment: ${result.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
}
export const env = result.data;
