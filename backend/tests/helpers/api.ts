import 'dotenv/config';
import assert from 'node:assert/strict';
import { after, before } from 'node:test';
import type { Server } from 'node:http';

// Non-integration tests also work without local environment files.
process.env.SUPABASE_URL ||= 'http://127.0.0.1:54321';
process.env.SUPABASE_PUBLISHABLE_KEY ||= 'test-public-key';
process.env.DATABASE_URL ||= 'postgres://hootus_server:unused@127.0.0.1:54322/postgres';
process.env.CORS_ORIGINS ||= 'http://localhost:5173';
const { default: app } = await import('../../src/app.js');
export const { sql, withUser } = await import('../../src/config/database.js');

export function createTestApi() {
  let server: Server | undefined;
  let base = '';

  async function call(path: string, token?: string, body?: unknown, headers = {}, method = body === undefined ? 'GET' : 'POST') {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return { status: response.status, body: await response.json(), headers: response.headers };
  }

  before(async () => {
    server = await new Promise<Server>(resolve => {
      const instance = app.listen(0, '127.0.0.1', () => resolve(instance));
    });
    const address = server.address();
    assert(address && typeof address !== 'string');
    base = `http://127.0.0.1:${address.port}`;
  });
  after(async () => {
    try {
      const instance = server;
      if (instance) await new Promise<void>((resolve, reject) => instance.close(error => error ? reject(error) : resolve()));
    } finally {
      await sql.end();
    }
  });

  return { call, get base() { return base; } };
}
