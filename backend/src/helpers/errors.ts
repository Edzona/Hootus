import { ErrorCode } from '../types/errorCode.js';

export class HttpError extends Error {
  constructor(public status: number, public code: ErrorCode, message: string) {
    super(message);
  }
}

export function databaseError(error: { code: string }): never {
  if (error.code === '42501') throw new HttpError(403, ErrorCode.Forbidden, 'This operation is not allowed.');
  if (error.code === '23505') throw new HttpError(409, ErrorCode.Conflict, 'This record already exists.');
  if (['23514', '23503', '23502', '22P02'].includes(error.code)) {
    throw new HttpError(400, ErrorCode.InvalidData, 'The supplied data is invalid.');
  }
  throw new HttpError(502, ErrorCode.DatabaseError, 'The database request failed.');
}

