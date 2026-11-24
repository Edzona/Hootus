import '../helpers/unitEnv.js';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { z } from 'zod';
import { validate } from '../../src/middleware/validate.js';
import { invoke, makeReq, makeRes } from '../helpers/fakes.js';

const schema = z.strictObject({ n: z.coerce.number().int() });

describe('validate middleware', () => {
  it('A: valid body {n:"7"} -> locals.body {n:7}, next() once with no error, nothing sent', async () => {
    const { res, nextCalls } = await invoke(validate(schema), makeReq({ body: { n: '7' } }));
    assert.deepEqual(res.locals.body, { n: 7 });
    assert.deepEqual(nextCalls, [[]]);
    assert.equal(res.body, undefined);
    assert.equal(res.statusCode, 200);
  });

  it('B: target "query" reads req.query and writes locals.query', async () => {
    const { res, nextCalls } = await invoke(validate(schema, 'query'), makeReq({ query: { n: '3' } }));
    assert.deepEqual(res.locals.query, { n: 3 });
    assert.equal(nextCalls.length, 1);
  });

  it('C: target "params" reads req.params and writes locals.params', async () => {
    const { res } = await invoke(validate(schema, 'params'), makeReq({ params: { n: '9' } }));
    assert.deepEqual(res.locals.params, { n: 9 });
  });

  it('D: invalid body {n:"x"} -> 400 VALIDATION_ERROR with issue details, next not called', async () => {
    const { res, nextCalls } = await invoke(validate(schema), makeReq({ body: { n: 'x' } }));
    const body = res.body as { error: { code: string; message: string; details: { path: string[] }[] } };
    assert.equal(res.statusCode, 400);
    assert.equal(body.error.code, 'VALIDATION_ERROR');
    assert.equal(body.error.message, 'Check the request fields.');
    assert.deepEqual(body.error.details.map(issue => issue.path), [['n']]);
    assert.equal(res.locals.errorCode, 'VALIDATION_ERROR');
    assert.deepEqual(nextCalls, []);
    assert.equal('body' in res.locals, false);
  });

  it('E: unknown key on a strict schema -> 400', async () => {
    const { res } = await invoke(validate(schema), makeReq({ body: { n: 1, extra: true } }));
    assert.equal(res.statusCode, 400);
  });

  it('F: a body that fails does not touch the other locals', async () => {
    const res = makeRes({ query: 'kept' });
    await invoke(validate(schema), makeReq({ body: {} }), res);
    assert.equal(res.locals.query, 'kept');
  });
});
