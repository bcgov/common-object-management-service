const Problem = require('api-problem');

const errorToProblem = require('../../../src/components/errorToProblem');

const SERVICE = 'TESTSERVICE';

describe('errorToProblem', () => {
  it('should return a 422 problem given a problem', () => {
    const msg = 'errMsg';
    const e = new Problem(422, { detail: msg });
    const result = errorToProblem(SERVICE, e);

    expect(result).toBeTruthy();
    expect(result instanceof Problem).toBeTruthy();
    expect(result.title).toMatch('Unprocessable Entity');
    expect(result.status).toBe(422);
    expect(result.detail).toMatch(msg);
    expect(result.errors).toBeUndefined();
  });

  it('should return a 422 problem given an error', () => {
    const e = {
      response: {
        data: { detail: 'detail' },
        status: 422
      }
    };
    const result = errorToProblem(SERVICE, e);

    expect(result).toBeTruthy();
    expect(result instanceof Problem).toBeTruthy();
    expect(result.title).toMatch('Unprocessable Entity');
    expect(result.status).toBe(422);
    expect(result.detail).toMatch(e.response.data.detail);
    expect(result.errors).toBeUndefined();
  });

  it('should return a 422 problem with a supplied string response', () => {
    const e = {
      response: {
        data: '{ "detail": "d" }',
        status: 422
      }
    };
    const result = errorToProblem(SERVICE, e);

    expect(result).toBeTruthy();
    expect(result instanceof Problem).toBeTruthy();
    expect(result.title).toMatch('Unprocessable Entity');
    expect(result.status).toBe(422);
    expect(result.detail).toMatch('d');
    expect(result.errors).toBeUndefined();
  });

  it('should throw a 502 problem', () => {
    const e = {
      message: 'msg'
    };
    const result = errorToProblem(SERVICE, e);

    expect(result).toBeTruthy();
    expect(result instanceof Problem).toBeTruthy();
    expect(result.title).toMatch(`Unknown ${SERVICE} Error`);
    expect(result.status).toBe(502);
    expect(result.detail).toMatch(e.message);
  });
});
