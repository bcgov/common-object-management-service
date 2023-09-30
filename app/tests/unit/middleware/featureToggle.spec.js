const { requireBasicAuth, requireSomeAuth } = require('../../../src/middleware/featureToggle');
const { AuthMode, AuthType } = require('../../../src/components/constants');
const utils = require('../../../src/components/utils');

// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
jest.mock('config');
// Mock out utils library and use a spy to observe behavior
jest.mock('../../../src/components/utils');

beforeEach(() => {
  jest.resetAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('requireBasicAuth', () => {
  const getAppAuthModeSpy = jest.spyOn(utils, 'getAppAuthMode');

  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  it.each([
    [1, AuthMode.NOAUTH, undefined],
    [1, AuthMode.NOAUTH, AuthType.NONE],
    [1, AuthMode.NOAUTH, AuthType.BASIC],
    [1, AuthMode.NOAUTH, AuthType.BEARER],
    [0, AuthMode.BASICAUTH, undefined],
    [0, AuthMode.BASICAUTH, AuthType.NONE],
    [1, AuthMode.BASICAUTH, AuthType.BASIC],
    [0, AuthMode.BASICAUTH, AuthType.BEARER],
    [0, AuthMode.OIDCAUTH, undefined],
    [0, AuthMode.OIDCAUTH, AuthType.NONE],
    [0, AuthMode.OIDCAUTH, AuthType.BASIC],
    [0, AuthMode.OIDCAUTH, AuthType.BEARER],
    [0, AuthMode.FULLAUTH, undefined],
    [0, AuthMode.FULLAUTH, AuthType.NONE],
    [1, AuthMode.FULLAUTH, AuthType.BASIC],
    [0, AuthMode.FULLAUTH, AuthType.BEARER]
  ])('should call next %i times given authMode %s and authType %s', (nextCount, mode, type) => {
    const sendCount = 1 - nextCount;
    getAppAuthModeSpy.mockReturnValue(mode);
    if (type) req.currentUser = { authType: type };

    if (sendCount) expect(() => requireBasicAuth(req, res, next)).toThrow();
    else expect(() => requireBasicAuth(req, res, next)).not.toThrow();

    expect(next).toHaveBeenCalledTimes(nextCount);
    if (nextCount) expect(next).toHaveBeenCalledWith();
  });
});

describe('requireSomeAuth', () => {
  const getAppAuthModeSpy = jest.spyOn(utils, 'getAppAuthMode');

  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  it.each([
    [1, AuthMode.NOAUTH, undefined],
    [1, AuthMode.NOAUTH, AuthType.NONE],
    [1, AuthMode.NOAUTH, AuthType.BASIC],
    [1, AuthMode.NOAUTH, AuthType.BEARER],
    [0, AuthMode.BASICAUTH, undefined],
    [0, AuthMode.BASICAUTH, AuthType.NONE],
    [1, AuthMode.BASICAUTH, AuthType.BASIC],
    [1, AuthMode.BASICAUTH, AuthType.BEARER],
    [0, AuthMode.OIDCAUTH, undefined],
    [0, AuthMode.OIDCAUTH, AuthType.NONE],
    [1, AuthMode.OIDCAUTH, AuthType.BASIC],
    [1, AuthMode.OIDCAUTH, AuthType.BEARER],
    [0, AuthMode.FULLAUTH, undefined],
    [0, AuthMode.FULLAUTH, AuthType.NONE],
    [1, AuthMode.FULLAUTH, AuthType.BASIC],
    [1, AuthMode.FULLAUTH, AuthType.BEARER]
  ])('should call next %i times given authMode %s and authType %s', (nextCount, mode, type) => {
    const sendCount = 1 - nextCount;
    getAppAuthModeSpy.mockReturnValue(mode);
    if (type) req.currentUser = { authType: type };

    if (sendCount) expect(() => requireSomeAuth(req, res, next)).toThrow();
    else expect(() => requireSomeAuth(req, res, next)).not.toThrow();

    expect(next).toHaveBeenCalledTimes(nextCount);
    if (nextCount) expect(next).toHaveBeenCalledWith();
  });
});
