import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
dotenv.config({ path: resolve(root, '.env'), quiet: true });
const check = process.argv.includes('--check');
const watch = process.argv.includes('--watch');
const url = process.env.SQL_GENERATION_DATABASE_URL;
const databaseUrl = url && URL.canParse(url) ? new URL(url) : null;
if (!databaseUrl || !['postgres:', 'postgresql:'].includes(databaseUrl.protocol)
  || !['localhost', '127.0.0.1', '[::1]'].includes(databaseUrl.hostname)) {
  throw new Error('Set SQL_GENERATION_DATABASE_URL to your local Supabase PostgreSQL URL. Generation is local-only.');
}
const temporary = await mkdtemp(resolve(tmpdir(), 'hootus-pgtyped-'));
const output = resolve(root, 'src/generated');
const destination = watch ? output : resolve(temporary, 'generated');
const config = {
  srcDir: resolve(root, '../supabase/queries'),
  failOnError: true,
  maxWorkerThreads: 1,
  transforms: [{ mode: 'sql', include: '*.sql', emitTemplate: `${destination}/{{name}}.queries.ts` }],
};
const environment = { ...process.env };
for (const key of ['PGHOST', 'PGUSER', 'PGPASSWORD', 'PGDATABASE', 'PGPORT', 'DATABASE_URL']) delete environment[key];
environment.PGURI = url;
try {
  const configPath = resolve(temporary, 'config.json');
  await writeFile(configPath, JSON.stringify(config));
  const child = spawn(process.execPath, [resolve(root, 'node_modules/@pgtyped/cli/lib/index.js'), '-c', configPath, ...(watch ? ['-w'] : [])], {
    cwd: root, env: environment, stdio: 'inherit',
  });
  process.once('SIGINT', () => child.kill('SIGINT'));
  process.once('SIGTERM', () => child.kill('SIGTERM'));
  const code = await new Promise((accept, reject) => {
    child.once('error', reject);
    child.once('exit', (status, signal) => accept(signal ? 1 : status));
  });
  if (code !== 0) throw new Error('SQL generation failed.');
  if (!watch) {
    const expected = (await readdir(config.srcDir)).filter(name => name.endsWith('.sql')).map(name => name.replace(/\.sql$/, '.queries.ts')).sort();
    const generated = (await readdir(destination)).sort();
    if (JSON.stringify(generated) !== JSON.stringify(expected)) throw new Error('Some SQL queries failed generation. Check the diagnostics above.');
    if (!check) {
      await mkdir(output, { recursive: true });
      for (const name of generated) await writeFile(resolve(output, name), await readFile(resolve(destination, name)));
      for (const name of await readdir(output)) {
        if (name.endsWith('.queries.ts') && !generated.includes(name)) await rm(resolve(output, name));
      }
    } else {
      const committed = (await readdir(output)).filter(name => name.endsWith('.queries.ts')).sort();
      if (JSON.stringify(generated) !== JSON.stringify(committed)) throw new Error('Generated SQL files differ. Run npm run sql:generate.');
      for (const name of generated) {
        if (await readFile(resolve(destination, name), 'utf8') !== await readFile(resolve(output, name), 'utf8')) {
          throw new Error(`${name} is stale. Run npm run sql:generate and commit the result.`);
        }
      }
      process.stdout.write('Generated SQL types are up to date.\n');
    }
  }
} finally {
  await rm(temporary, { recursive: true, force: true });
}
