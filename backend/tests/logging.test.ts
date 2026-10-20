import { HttpError } from '../src/helpers/errors.js';
import { ErrorCode } from '../src/types/errorCode.js';
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { once } from 'node:events';
import { format } from 'node:util';
import debug from 'debug';
import express from 'express';
import { requestLogger } from '../src/middleware/requestLogger.js';
import { errorHandler } from '../src/middleware/errorHandler.js';

test('one safe log per request, severity, timing and response correlation', async t => {
  const entries: { channel: string; value: Record<string, unknown> }[] = [];
  const previous = debug.disable();
  t.after(() => debug.enable(previous));
  debug.enable('hootus:*');
  t.mock.method(debug, 'log', (...args: unknown[]) => {
    const line = format(...args);
    const channel = /hootus:(info|warn|error)/.exec(line)?.[1];
    assert(channel);
    const json = line.slice(line.indexOf('{'), line.lastIndexOf('}') + 1);
    entries.push({ channel, value: JSON.parse(json) });
  });
  const app = express();
  app.use(requestLogger);
  app.use(express.json());
  app.post('/items/:id', (_req, res) => { res.status(201).json({ data: true }); });
  app.get('/conflict', () => { throw new HttpError(409, ErrorCode.Conflict, 'private-email@temple.edu'); });
  app.get('/failure', () => { throw new Error('secret-database-password'); });
  app.get('/aborted', (_req, res) => { res.destroy(); });
  app.use((_req, _res, next) => next(new HttpError(404, ErrorCode.NotFound, 'Not found')));
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const response = await fetch(`${base}/items/private-student-id?token=private-query-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer private-bearer-token',
        Cookie: 'session=private-cookie',
        'X-Request-Id': 'untrusted-request-id',
      },
      body: JSON.stringify({ email: 'private-email@temple.edu', password: 'private-body-password' }),
    });
    await response.text();
    assert.equal(response.status, 201);
    assert.equal(entries.length, 1);
    const first = entries[0];
    assert.equal(first.channel, 'info');
    assert.equal(first.value.path, '/items/:id');
    assert.equal(first.value.status, 201);
    assert.equal(first.value.requestId, response.headers.get('x-request-id'));
    assert.match(String(first.value.requestId), /^[0-9a-f-]{36}$/);
    assert(Number(first.value.durationMs) >= 0);
    assert(!Number.isNaN(Date.parse(String(first.value.timestamp))));

    await (await fetch(`${base}/conflict`)).text();
    await (await fetch(`${base}/failure`)).text();
    await (await fetch(`${base}/private-unknown-path?token=another-secret`)).text();
    await (await fetch(`${base}/items/123`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: '{"private-incomplete-json":',
    })).text();
    assert.equal(entries.length, 5);
    assert.equal(entries[1].channel, 'warn');
    assert.equal(entries[1].value.errorCode, ErrorCode.Conflict);
    assert.equal(entries[2].channel, 'error');
    assert.equal(entries[2].value.status, 500);
    assert.equal(entries[2].value.errorCode, ErrorCode.InternalError);
    assert.equal(entries[3].value.path, '[unmatched]');
    assert.equal(entries[4].value.errorCode, ErrorCode.InvalidJson);
    assert.equal(new Set(entries.map(entry => entry.value.requestId)).size, 5);
    await assert.rejects(fetch(`${base}/aborted`));
    assert.equal(entries.length, 6);
    assert.equal(entries[5].value.status, 499);
    assert.equal(entries[5].value.aborted, true);
    const output = JSON.stringify(entries);
    for (const secret of ['private-', 'secret-database-password', 'another-secret', 'untrusted-request-id']) {
      assert(!output.includes(secret), `Logs must not include ${secret}`);
    }
    debug.enable('hootus:error');
    await (await fetch(`${base}/conflict`)).text();
    assert.equal(entries.length, 6, 'Disabled warning namespace must produce no output');
    await (await fetch(`${base}/failure`)).text();
    assert.equal(entries.length, 7);
    assert.equal(entries[6].channel, 'error');
    debug.disable();
    const silent = await fetch(`${base}/failure`);
    await silent.text();
    assert.equal(entries.length, 7, 'Logging must be silent without DEBUG');
    assert(silent.headers.get('x-request-id'), 'Request IDs remain available with logging disabled');
  } finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  }
});
