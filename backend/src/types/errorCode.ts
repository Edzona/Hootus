// Shared with the frontend. Wire values stay stable when members are renamed.
export enum ErrorCode {
  AuthRateLimited = 'AUTH_RATE_LIMITED',
  AuthRequestFailed = 'AUTH_REQUEST_FAILED',
  AuthUnavailable = 'AUTH_UNAVAILABLE',
  BodyTooLarge = 'BODY_TOO_LARGE',
  Conflict = 'CONFLICT',
  DatabaseError = 'DATABASE_ERROR',
  Forbidden = 'FORBIDDEN',
  InternalError = 'INTERNAL_ERROR',
  InvalidData = 'INVALID_DATA',
  InvalidJson = 'INVALID_JSON',
  InvalidRedirect = 'INVALID_REDIRECT',
  NotFound = 'NOT_FOUND',
  OriginNotAllowed = 'ORIGIN_NOT_ALLOWED',
  ProfileRequired = 'PROFILE_REQUIRED',
  Unauthorized = 'UNAUTHORIZED',
  ValidationError = 'VALIDATION_ERROR',
}
