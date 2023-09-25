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

  it('should return a 409 problem given an error', () => {
    const e = {
      response: {
        data: { detail: 'detail' },
        status: 409
      }
    };
    const result = errorToProblem(SERVICE, e);

    expect(result).toBeTruthy();
    expect(result instanceof Problem).toBeTruthy();
    expect(result.title).toMatch('Conflict');
    expect(result.status).toBe(409);
    expect(result.detail).toEqual(expect.objectContaining(e.response.data));
    expect(result.errors).toBeUndefined();
  });

  it('should return a problem given an error with statusCode', () => {
    const e = {
      statusCode: 404,
      message: 'NotFoundError'
    };
    const result = errorToProblem(SERVICE, e);

    expect(result).toBeTruthy();
    expect(result instanceof Problem).toBeTruthy();
    expect(result.title).toMatch('Not Found');
    expect(result.status).toBe(404);
    expect(result.detail).toMatch(e.message);
    expect(result.errors).toBeUndefined();
  });

  it('should return a problem given an error with s3 metadata', () => {
    const e = {
      $metadata: {
        httpStatusCode: 404,
      },
      message: 'NotFoundError'
    };
    const result = errorToProblem(SERVICE, e);

    expect(result).toBeTruthy();
    expect(result instanceof Problem).toBeTruthy();
    expect(result.title).toMatch('Not Found');
    expect(result.status).toBe(404);
    expect(result.detail).toEqual(expect.objectContaining({ message: e.message }));
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

  it('should throw a 500 problem', () => {
    const e = {
      message: 'msg'
    };
    const result = errorToProblem(SERVICE, e);

    expect(result).toBeTruthy();
    expect(result instanceof Problem).toBeTruthy();
    expect(result.title).toMatch('Internal Server Error');
    expect(result.status).toBe(500);
    expect(result.detail).toMatch(e.message);
  });
});
