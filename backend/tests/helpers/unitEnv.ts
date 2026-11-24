// Import this first: config/env.ts validates process.env when it is first imported.
const values: Record<string, string> = {
  DATABASE_URL: 'postgres://hootus_server:secret@localhost:5432/postgres',
  SUPABASE_URL: 'http://localhost:54321',
  SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_unit_test',
  NODE_ENV: 'test',
  PORT: '5000',
  CORS_ORIGINS: 'http://localhost:5173',
  NOTIFICATION_LINK_URL: 'http://localhost:5173/#/activity',
  PUBLIC_API_URL: 'http://localhost:5001',
  CRON_SECRET: 'unit-test-cron-secret-123456',
  SMTP_HOST: 'smtp.unit.test',
  SMTP_PORT: '587',
  SMTP_USER: 'mailer',
  SMTP_PASS: 'mailer-pass',
  SMTP_FROM: 'Hootus <noreply@unit.test>',
  DEBUG: '',
};
Object.assign(process.env, values);

export const unitEnv = values;
