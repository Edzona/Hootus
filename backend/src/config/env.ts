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
  // Where clicking a notification opens Hootus. Update when the real inbox route exists.
  NOTIFICATION_LINK_URL: z.url().default('http://localhost:5173/#/beta/listings'),
  // Browser push. Generate once with `npx web-push generate-vapid-keys`.
  // Leave all three empty to disable push. The private key is a secret.
  VAPID_PUBLIC_KEY: z.preprocess(value => value === '' ? undefined : value,
    z.string().regex(/^[A-Za-z0-9_-]{80,100}$/).optional()),
  VAPID_PRIVATE_KEY: z.preprocess(value => value === '' ? undefined : value,
    z.string().regex(/^[A-Za-z0-9_-]{40,50}$/).optional()),
  // Push services may contact this address about problems with your pushes.
  VAPID_SUBJECT: z.preprocess(value => value === '' ? undefined : value,
    z.string().regex(/^(mailto:|https:\/\/)/).optional()),
}).refine(value => (!value.VAPID_PUBLIC_KEY && !value.VAPID_PRIVATE_KEY)
  || (value.VAPID_PUBLIC_KEY && value.VAPID_PRIVATE_KEY && value.VAPID_SUBJECT),
{ path: ['VAPID_PUBLIC_KEY'], message: 'Set both VAPID keys and VAPID_SUBJECT, or neither key' });

const result = schema.safeParse(process.env);
if (!result.success) {
  // Report variable names only, never secret values.
  throw new Error(`Invalid environment: ${result.error.issues.map(issue => issue.path.join('.')).join(', ')}`);
}
export const env = result.data;
