import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { UserRole } from '../../src/types/domain.js';
import type { AuthUser } from '../../src/types/express.js';

export const unusedDb = async () => {
  throw new Error('Unexpected database call in unit test');
};

export const testUser: AuthUser = {
  id: '11111111-1111-4111-8111-111111111111',
  internalId: '42',
  authUserId: '22222222-2222-4222-8222-222222222222',
  email: 'student@temple.edu',
  role: UserRole.Student,
  name: 'Sam Student',
};

export interface FakeRes {
  statusCode: number;
  body: unknown;
  sent: unknown;
  contentType: string | undefined;
  ended: boolean;
  headers: Record<string, string>;
  locals: Record<string, unknown>;
  status(code: number): FakeRes;
  json(body: unknown): FakeRes;
  type(value: string): FakeRes;
  send(body: unknown): FakeRes;
  end(): FakeRes;
  set(name: string, value: string): FakeRes;
  setHeader(name: string, value: string): FakeRes;
}

export function makeRes(locals: Record<string, unknown> = {}): FakeRes & Response {
  const res: FakeRes = {
    statusCode: 200,
    body: undefined,
    sent: undefined,
    contentType: undefined,
    ended: false,
    headers: {},
    locals,
    status(code) { res.statusCode = code; return res; },
    json(body) { res.body = body; return res; },
    type(value) { res.contentType = value; return res; },
    send(body) { res.sent = body; return res; },
    end() { res.ended = true; return res; },
    set(name, value) { res.headers[name] = value; return res; },
    setHeader(name, value) { res.headers[name] = value; return res; },
  };
  return res as FakeRes & Response;
}

interface ReqOptions {
  user?: Partial<AuthUser> | null;
  db?: unknown;
  headers?: Record<string, string>;
  body?: unknown;
  query?: unknown;
  params?: unknown;
}

export function makeReq(options: ReqOptions = {}): Request {
  return {
    user: options.user === null ? undefined : { ...testUser, ...options.user },
    db: options.db,
    headers: options.headers ?? {},
    body: options.body,
    query: options.query,
    params: options.params,
  } as unknown as Request;
}

/** Runs a handler and returns the response and whether next() was called. */
export async function invoke(handler: RequestHandler, req: Request, res = makeRes()) {
  const nextCalls: unknown[][] = [];
  const next: NextFunction = (...args: unknown[]) => { nextCalls.push(args); };
  await handler(req, res, next);
  return { res, nextCalls };
}

export const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
