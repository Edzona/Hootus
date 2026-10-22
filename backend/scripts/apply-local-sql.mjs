import 'dotenv/config';
import { readFile } from 'node:fs/promises';
import postgres from 'postgres';

const url = process.env.SQL_GENERATION_DATABASE_URL;
if (!url || !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)) {
  throw new Error('Local database owner URL required.');
}
const file = process.argv[2];
if (!file) throw new Error('Provide a SQL file path.');
const db = postgres(url, { max: 1, prepare: false, onnotice: () => {} });
try {
  await db.unsafe(await readFile(file, 'utf8')).simple();
  process.stdout.write('Local SQL file applied.\n');
} catch (error) {
  process.stderr.write(`Local SQL failed (${error.code || 'unknown'}).\n`);
  process.exitCode = 1;
} finally {
  await db.end();
}
