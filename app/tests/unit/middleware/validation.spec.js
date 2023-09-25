const Problem = require('api-problem');

const { validate } = require('../../../src/middleware/validation');

beforeEach(() => {
  jest.resetAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('validate', () => {
  const problemSendSpy = jest.spyOn(Problem.prototype, 'send');

  let req, res, next;

  beforeEach(() => {
    problemSendSpy.mockImplementation(() => { });

    req = {
      originalUrl: 'originalUrl',
      params: { id: 'id' },
      query: { foo: 'bar', bool: false }
    };
    res = {};
    next = jest.fn();
  });

  it('should call next when no validation errors', () => {
    const errors = undefined;
    const schema = { query: { validate: jest.fn().mockReturnValue(errors) } };

    const result = validate(schema);
    expect(result).toBeInstanceOf(Function);
    result(req, res, next);

    expect(schema.query.validate).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(problemSendSpy).toHaveBeenCalledTimes(0);
  });

  it('should respond with 422 with one validation error', () => {
    const errors = { error: { details: [{ message: 'message' }] } };
    const schema = { query: { validate: jest.fn().mockReturnValue(errors) } };

    const result = validate(schema);
    expect(result).toBeInstanceOf(Function);
    result(req, res, next);

    expect(schema.query.validate).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(0);
    expect(problemSendSpy).toHaveBeenCalledTimes(1);
    expect(problemSendSpy).toHaveBeenCalledWith(res);
  });

  it('should respond with 422 with multiple validation errors', () => {
    const errors = { error: { details: [{ message: 'message' }] } };
    const schema = {
      params: { validate: jest.fn().mockReturnValue(errors) },
      query: { validate: jest.fn().mockReturnValue(errors) }
    };

    const result = validate(schema);
    expect(result).toBeInstanceOf(Function);
    result(req, res, next);

    expect(schema.query.validate).toHaveBeenCalledTimes(1);
    expect(schema.query.validate).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(0);
    expect(problemSendSpy).toHaveBeenCalledTimes(1);
    expect(problemSendSpy).toHaveBeenCalledWith(res);
  });
});
