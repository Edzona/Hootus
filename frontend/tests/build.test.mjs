import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { cp, mkdir, mkdtemp, rm, symlink } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const run = promisify(execFile)
const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '..')

test('frontend builds with only frontend dependencies installed', { timeout: 30000 }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'hootus-frontend-test-'))
  const app = join(directory, 'frontend')
  try {
    await mkdir(app)
    // Do not copy local environment files or backend node_modules: a developer's
    // full checkout must not hide missing frontend deployment dependencies.
    for (const file of ['src', 'public', 'index.html', 'package.json', 'vite.config.js', 'postcss.config.js', 'tailwind.config.js']) {
      await cp(join(frontend, file), join(app, file), { recursive: true })
    }
    await mkdir(join(directory, 'backend/src'), { recursive: true })
    await cp(resolve(frontend, '../backend/src/types'), join(directory, 'backend/src/types'), { recursive: true })
    await symlink(join(frontend, 'node_modules'), join(app, 'node_modules'), 'dir')
    const { stdout } = await run(process.execPath, [join(frontend, 'node_modules/vite/bin/vite.js'), 'build'], {
      cwd: app, timeout: 20000,
    })
    assert.match(stdout, /built in/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
