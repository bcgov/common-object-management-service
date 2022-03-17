const Problem = require('api-problem');
const config = require('config');

const { checkAppMode, currentObject, hasPermission } = require('../../../src/middleware/authorization');
const { objectService, permissionService, storageService } = require('../../../src/services');
const { AuthMode, AuthType, Permissions } = require('../../../src/components/constants');
const utils = require('../../../src/components/utils');

// Mock config library - @see https://stackoverflow.com/a/64819698
jest.mock('config');
// Mock out utils library and use a spy to observe behavior
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
  const objectReadSpy = jest.spyOn(objectService, 'read');
  const storageHeadObjectSpy = jest.spyOn(storageService, 'headObject');

  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  it.each([
    [undefined],
    ['']
  ])('does not inject any current object to request with objId %o', (objId) => {
    req.params = { objId: objId };

    currentObject(req, res, next);

    expect(req.currentObject).toBeUndefined();
    expect(objectReadSpy).toHaveBeenCalledTimes(0);
    expect(storageHeadObjectSpy).toHaveBeenCalledTimes(0);
    expect(utils.getPath).toHaveBeenCalledTimes(0);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('does not inject any current object if an exception happens', () => {
    const objId = '1234';
    req.params = { objId: objId };
    objectReadSpy.mockImplementation(() => { throw new Error('test'); });
    storageHeadObjectSpy.mockResolvedValue({});

    currentObject(req, res, next);

    expect(req.currentObject).toBeUndefined();
    expect(objectReadSpy).toHaveBeenCalledTimes(1);
    expect(objectReadSpy).toHaveBeenCalledWith(objId);
    expect(storageHeadObjectSpy).toHaveBeenCalledTimes(0);
    expect(utils.getPath).toHaveBeenCalledTimes(0);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('injects the current object based on the service results', async () => {
    const objId = '1234';
    const testRecord = { a: 1 };
    const testStorage = { b: 2 };
    req.params = { objId: objId };
    objectReadSpy.mockResolvedValue(testRecord);
    storageHeadObjectSpy.mockResolvedValue(testStorage);
    utils.getPath.mockReturnValue(`/path/${objId}`);

    await currentObject(req, res, next);

    expect(req.currentObject).toBeTruthy();
    expect(req.currentObject).toEqual(expect.objectContaining(testRecord));
    expect(req.currentObject).toEqual(expect.objectContaining(testStorage));
    expect(objectReadSpy).toHaveBeenCalledTimes(1);
    expect(objectReadSpy).toHaveBeenCalledWith(objId);
    expect(storageHeadObjectSpy).toHaveBeenCalledTimes(1);
    expect(storageHeadObjectSpy).toHaveBeenCalledWith({
      filePath: expect.stringMatching(`/path/${objId}`)
    });
    expect(utils.getPath).toHaveBeenCalledTimes(1);
    expect(utils.getPath).toHaveBeenCalledWith(objId);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('hasPermission', () => {
  const searchPermissionsSpy = jest.spyOn(permissionService, 'searchPermissions');
  const problemSendSpy = jest.spyOn(Problem.prototype, 'send');

  let req, res, next;

  beforeEach(() => {
    problemSendSpy.mockImplementation(() => { });

    req = {};
    res = {};
    next = jest.fn();
  });

  it('responds with 403 if the request has no current object', () => {
    config.has
      .mockReturnValueOnce(true) // db.enabled
      .mockReturnValueOnce(true); // keycloak.enabled

    const mw = hasPermission(Permissions.READ);
    expect(mw).toBeInstanceOf(Function);
    mw(req, res, next);

    expect(searchPermissionsSpy).toHaveBeenCalledTimes(0);
    expect(problemSendSpy).toHaveBeenCalledTimes(1);
    expect(problemSendSpy).toHaveBeenCalledWith(res);
    expect(next).toHaveBeenCalledTimes(0);
  });

  // TODO: Revisit after config mocking is done
  it.skip('calls next and does nothing if db is not enabled', () => {
    const mw = hasPermission(Permissions.READ);
    const nxt = jest.fn();
    const req = { a: '1' };

    mw(req, res, nxt);
    expect(nxt).toHaveBeenCalledTimes(1);
  });
});
