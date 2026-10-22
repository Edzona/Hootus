import { ErrorCode } from '../types/errorCode.js';
import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

// Parsed values live in res.locals: Express 5's req.query is read-only.
export function validate(schema: ZodType, target: 'body' | 'query' | 'params' = 'body'): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);
    if (!result.success) {
      res.locals.errorCode = ErrorCode.ValidationError;
      res.status(400).json({
        error: { code: ErrorCode.ValidationError, message: 'Check the request fields.', details: result.error.issues },
      });
      return;
    }
    res.locals[target] = result.data;
    next();
  };
}
