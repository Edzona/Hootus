import { HttpError } from '../helpers/errors.js';
import { ErrorCode } from '../types/errorCode.js';
import type { ErrorRequestHandler } from 'express';

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    res.locals.errorCode = error.code;
    res.status(error.status).json({ error: { code: error.code, message: error.message } });
    return;
  }
  if (error?.type === 'entity.parse.failed') {
    res.locals.errorCode = ErrorCode.InvalidJson;
    res.status(400).json({ error: { code: ErrorCode.InvalidJson, message: 'Request body must be valid JSON.' } });
    return;
  }
  if (error?.type === 'entity.too.large') {
    res.locals.errorCode = ErrorCode.BodyTooLarge;
    res.status(413).json({ error: { code: ErrorCode.BodyTooLarge, message: 'Request body is too large.' } });
    return;
  }
  res.locals.errorCode = ErrorCode.InternalError;
  res.status(500).json({ error: { code: ErrorCode.InternalError, message: 'An unexpected error occurred.' } });
};
