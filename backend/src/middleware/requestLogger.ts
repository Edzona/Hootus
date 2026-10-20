import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';
import { logger } from '../helpers/logger.js';

export const requestLogger: RequestHandler = (req, res, next) => {
  const requestId = randomUUID();
  const started = performance.now();
  let logged = false;
  const log = () => {
    if (logged) return;
    logged = true;
    const aborted = !res.writableFinished;
    const status = aborted ? 499 : res.statusCode;
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    const write = logger[level];
    if (!write.enabled) return;
    // Use the route template, never the raw URL (which may contain secrets).
    const path = typeof req.route?.path === 'string'
      ? `${req.baseUrl}${req.route.path}` : '[unmatched]';
    const entry = JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      event: 'http_request',
      requestId,
      method: req.method,
      path,
      status,
      durationMs: Math.round((performance.now() - started) * 100) / 100,
      ...(res.locals.errorCode ? { errorCode: res.locals.errorCode } : {}),
      ...(aborted ? { aborted: true } : {}),
    });
    write('%s', entry);
  };

  res.locals.requestId = requestId;
  res.setHeader('X-Request-Id', requestId);
  res.once('finish', log);
  res.once('close', log);
  next();
};
