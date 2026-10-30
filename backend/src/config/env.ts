import 'dotenv/config';
import { z } from 'zod';

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
  // Notification email. Local: smtp://127.0.0.1:54325 (Mailpit). Unset disables email.
  SMTP_URL: z.preprocess(value => value === '' ? undefined : value, z.url().optional()),
  MAIL_FROM: z.string().min(1).default('Hootus <no-reply@hootus.local>'),
  // Where "open Hootus" links in emails point. Update when the real inbox route exists.
  NOTIFICATION_LINK_URL: z.url().default('http://localhost:5173/#/beta/listings'),
});

const result = schema.safeParse(process.env);
if (!result.success) {
  // Report variable names only, never secret values.
  throw new Error(`Invalid environment: ${result.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
}
export const env = result.data;
