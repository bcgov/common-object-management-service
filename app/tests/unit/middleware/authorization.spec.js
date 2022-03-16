const Problem = require('api-problem');

const { currentObject, hasPermission, checkAppMode } = require('../../../src/middleware/authorization');
const { objectService, storageService } = require('../../../src/services');
const { AuthMode, AuthType, Permissions } = require('../../../src/components/constants');
const utils = require('../../../src/components/utils');

jest.mock('../../../src/components/utils');

beforeEach(() => {
  jest.resetAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('checkAppMode', () => {
  const getAppAuthModeSpy = jest.spyOn(utils, 'getAppAuthMode');
  const problemSendSpy = jest.spyOn(Problem.prototype, 'send');

  let req, res, next;

  beforeEach(() => {
    req = { currentUser: {} };
    res = {};
    next = jest.fn();
  });

  it.each([
    [1, AuthMode.NOAUTH, undefined],
    [1, AuthMode.NOAUTH, AuthType.NONE],
    [1, AuthMode.NOAUTH, AuthType.BASIC],
    [1, AuthMode.NOAUTH, AuthType.BEARER],
    [1, AuthMode.BASICAUTH, undefined],
    [1, AuthMode.BASICAUTH, AuthType.NONE],
    [1, AuthMode.BASICAUTH, AuthType.BASIC],
    [0, AuthMode.BASICAUTH, AuthType.BEARER],
    [1, AuthMode.OIDCAUTH, undefined],
    [1, AuthMode.OIDCAUTH, AuthType.NONE],
    [0, AuthMode.OIDCAUTH, AuthType.BASIC],
    [1, AuthMode.OIDCAUTH, AuthType.BEARER],
    [1, AuthMode.FULLAUTH, undefined],
    [1, AuthMode.FULLAUTH, AuthType.NONE],
    [1, AuthMode.FULLAUTH, AuthType.BASIC],
    [1, AuthMode.FULLAUTH, AuthType.BEARER]
  ])('should call next %i times given authMode %s and authType %s', (nextCount, mode, type) => {
    const sendCount = 1 - nextCount;
    getAppAuthModeSpy.mockReturnValue(mode);
    problemSendSpy.mockImplementation(() => { });
    req.currentUser.authType = type;

    checkAppMode(req, res, next);

    expect(getAppAuthModeSpy).toHaveBeenCalledTimes(1);
    expect(getAppAuthModeSpy).toHaveBeenCalledWith();
    expect(problemSendSpy).toHaveBeenCalledTimes(sendCount);
    if (sendCount) expect(problemSendSpy).toHaveBeenCalledWith(res);
    expect(next).toHaveBeenCalledTimes(nextCount);
  });
});

describe('currentObject', () => {
  const testRes = {
    writeHead: jest.fn(),
    end: jest.fn()
  };

  const objectServiceReadSpy = jest.spyOn(objectService, 'read');
  const storageServiceHeadSpy = jest.spyOn(storageService, 'headObject');

  it('does not inject any current object to request if no object id param', async () => {
    const testReq = {
      params: {
        blah: 123
      },
    };
    const nxt = jest.fn();

    await currentObject(testReq, testRes, nxt);
    expect(testReq.currentObject).toBeUndefined();
    expect(nxt).toHaveBeenCalledTimes(1);
    expect(nxt).toHaveBeenCalledWith();
  });

  it('does not inject any current object to request if object id param is blank', async () => {
    const testReq = {
      params: {
        objId: ''
      },
    };
    const nxt = jest.fn();

    await currentObject(testReq, testRes, nxt);
    expect(testReq.currentObject).toBeUndefined();
    expect(nxt).toHaveBeenCalledTimes(1);
    expect(nxt).toHaveBeenCalledWith();
  });

  it('moves on if an exception happens', async () => {
    const testReq = {
      params: {
        objId: '1234'
      },
    };
    const nxt = jest.fn();
    objectServiceReadSpy.mockImplementation(() => { throw new Error('test'); });

    await currentObject(testReq, testRes, nxt);
    expect(testReq.currentObject).toBeUndefined();
    expect(objectServiceReadSpy).toHaveBeenCalledWith('1234');
    expect(nxt).toHaveBeenCalledTimes(1);
    expect(nxt).toHaveBeenCalledWith();
  });

  it('sets the current object based on the results from the services', async () => {
    const testReq = {
      params: {
        objId: '1234'
      },
    };
    const testRecord = { a: 1 };
    const testStorage = { b: 2 };
    const nxt = jest.fn();
    objectServiceReadSpy.mockReturnValue(testRecord);
    storageServiceHeadSpy.mockReturnValue(testStorage);

    await currentObject(testReq, testRes, nxt);
    expect(testReq.currentObject).toEqual({ ...testRecord, ...testStorage });
    expect(objectServiceReadSpy).toHaveBeenCalledWith('1234');
    expect(nxt).toHaveBeenCalledTimes(1);
    expect(nxt).toHaveBeenCalledWith();
  });
});

describe('hasPermission', () => {
  const testRes = {
    writeHead: jest.fn(),
    end: jest.fn()
  };

  it('returns a middleware function', async () => {
    const mw = hasPermission(Permissions.READ);
    expect(mw).toBeInstanceOf(Function);
  });

  // TODO: Revisit after config mocking is done
  it.skip('calls next and does nothing if db is not enabled', async () => {
    const mw = hasPermission(Permissions.READ);
    const nxt = jest.fn();
    const req = { a: '1' };

    await mw(req, testRes, nxt);
    expect(nxt).toHaveBeenCalledTimes(1);
  });

  it('403s if the request has no current object', async () => {
    const mw = hasPermission(Permissions.READ);
    const nxt = jest.fn();
    const req = { a: '1' };

    await mw(req, testRes, nxt);
    expect(nxt).toHaveBeenCalledTimes(0);
  });
});
