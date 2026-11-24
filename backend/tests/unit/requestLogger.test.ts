import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { afterEach, beforeEach, describe, it } from 'node:test';
import type { Request, Response } from 'express';
import { logger } from '../../src/helpers/logger.js';
import { requestLogger } from '../../src/middleware/requestLogger.js';

type Level = 'info' | 'warn' | 'error';
const levels: Level[] = ['info', 'warn', 'error'];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

interface Entry {
  level: string;
  event: string;
  requestId: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  errorCode?: string;
  aborted?: boolean;
  timestamp: string;
}

function setup(options: { statusCode?: number; route?: { path: unknown }; baseUrl?: string; errorCode?: string; method?: string; url?: string } = {}) {
  const res = Object.assign(new EventEmitter(), {
    statusCode: options.statusCode ?? 200,
    writableFinished: false,
    locals: options.errorCode ? { errorCode: options.errorCode } : {} as Record<string, unknown>,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) { this.headers[name] = value; },
  });
  const req = { method: options.method ?? 'GET', baseUrl: options.baseUrl ?? '', route: options.route, url: options.url ?? '/secret?token=abc' };
  let nextCalls = 0;
  requestLogger(req as unknown as Request, res as unknown as Response, () => { nextCalls += 1; });
  return { res, nextCalls: () => nextCalls };
}

describe('requestLogger', () => {
  const written: Record<Level, string[]> = { info: [], warn: [], error: [] };
  const original = new Map<Level, { log: typeof logger.info.log; enabled: boolean }>();

  beforeEach(() => {
    for (const level of levels) {
      written[level] = [];
      original.set(level, { log: logger[level].log, enabled: logger[level].enabled });
      logger[level].log = (...args: unknown[]) => { written[level].push(args.join(' ')); };
      logger[level].enabled = true;
    }
  });
  afterEach(() => {
    for (const level of levels) {
      logger[level].log = original.get(level)!.log;
      logger[level].enabled = original.get(level)!.enabled;
    }
  });

  const entryOf = (level: Level): Entry => {
    assert.equal(written[level].length, 1);
    return JSON.parse(/\{.*\}/.exec(written[level][0])![0]) as Entry;
  };

  it('A: sets a UUID X-Request-Id header and locals.requestId, calls next once', () => {
    const { res, nextCalls } = setup();
    assert.match(res.headers['X-Request-Id'], uuidPattern);
    assert.equal(res.locals.requestId, res.headers['X-Request-Id']);
    assert.equal(nextCalls(), 1);
  });

  it('B: each request gets a different id', () => {
    assert.notEqual(setup().res.headers['X-Request-Id'], setup().res.headers['X-Request-Id']);
  });

  it('C: finish with 200 -> one info entry using the route template', () => {
    const { res } = setup({ route: { path: '/:id' }, baseUrl: '/api/listings', method: 'PATCH' });
    res.writableFinished = true;
    res.emit('finish');
    const entry = entryOf('info');
    assert.equal(entry.level, 'info');
    assert.equal(entry.event, 'http_request');
    assert.equal(entry.method, 'PATCH');
    assert.equal(entry.path, '/api/listings/:id');
    assert.equal(entry.status, 200);
    assert.equal(entry.requestId, res.headers['X-Request-Id']);
    assert.equal(typeof entry.durationMs, 'number');
    assert.equal(entry.durationMs >= 0, true);
    assert.equal(Number.isNaN(Date.parse(entry.timestamp)), false);
    assert.equal('errorCode' in entry, false);
    assert.equal('aborted' in entry, false);
    assert.deepEqual([written.warn.length, written.error.length], [0, 0]);
  });

  it('D: finish with 404 and errorCode NOT_FOUND -> warn entry carrying errorCode', () => {
    const { res } = setup({ statusCode: 404, errorCode: 'NOT_FOUND', route: { path: '/x' } });
    res.writableFinished = true;
    res.emit('finish');
    const entry = entryOf('warn');
    assert.equal(entry.level, 'warn');
    assert.equal(entry.status, 404);
    assert.equal(entry.errorCode, 'NOT_FOUND');
  });

  it('E: finish with 500 -> error entry', () => {
    const { res } = setup({ statusCode: 500, route: { path: '/x' } });
    res.writableFinished = true;
    res.emit('finish');
    assert.equal(entryOf('error').status, 500);
  });

  it('F: boundary statuses 399 -> info, 400 -> warn, 499 -> warn, 500 -> error', () => {
    const expected: [number, Level][] = [[399, 'info'], [400, 'warn'], [499, 'warn'], [500, 'error']];
    for (const [status, level] of expected) {
      for (const l of levels) written[l] = [];
      const { res } = setup({ statusCode: status, route: { path: '/x' } });
      res.writableFinished = true;
      res.emit('finish');
      assert.equal(written[level].length, 1, `status ${status}`);
    }
  });

  it('G: close before the response finished -> status 499, aborted:true, warn level', () => {
    const { res } = setup({ statusCode: 200, route: { path: '/slow' } });
    res.emit('close');
    const entry = entryOf('warn');
    assert.equal(entry.status, 499);
    assert.equal(entry.aborted, true);
  });

  it('H: finish followed by close logs exactly once', () => {
    const { res } = setup({ route: { path: '/x' } });
    res.writableFinished = true;
    res.emit('finish');
    res.emit('close');
    assert.equal(written.info.length, 1);
    assert.equal(written.warn.length + written.error.length, 0);
  });

  it('I: no matched route -> path "[unmatched]", never the raw URL or query string', () => {
    const { res } = setup({ url: '/secret?token=abc' });
    res.writableFinished = true;
    res.emit('finish');
    const entry = entryOf('info');
    assert.equal(entry.path, '[unmatched]');
    assert.doesNotMatch(written.info[0], /secret|token=abc/);
  });

  it('J: non-string route path (regex route) -> "[unmatched]"', () => {
    const { res } = setup({ route: { path: /^\/x/ } });
    res.writableFinished = true;
    res.emit('finish');
    assert.equal(entryOf('info').path, '[unmatched]');
  });

  it('K: disabled namespace -> nothing written', () => {
    logger.info.enabled = false;
    const { res } = setup({ route: { path: '/x' } });
    res.writableFinished = true;
    res.emit('finish');
    assert.deepEqual(written, { info: [], warn: [], error: [] });
  });
});
