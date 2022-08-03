const Problem = require('api-problem');
const config = require('config');
const { NIL: SYSTEM_USER } = require('uuid');

const { checkAppMode, currentObject, hasPermission } = require('../../../src/middleware/authorization');
const { objectService, permissionService, storageService, userService } = require('../../../src/services');
const { AuthMode, AuthType, Permissions } = require('../../../src/components/constants');
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

describe('checkAppMode', () => {
  const getAppAuthModeSpy = jest.spyOn(utils, 'getAppAuthMode');
  const problemSendSpy = jest.spyOn(Problem.prototype, 'send');

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
    if (type) req.currentUser = { authType: type };

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
  const storageListObjectVersionSpy = jest.spyOn(storageService, 'listObjectVersion');

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
    expect(storageListObjectVersionSpy).toHaveBeenCalledTimes(0);
    expect(utils.getPath).toHaveBeenCalledTimes(0);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('does not inject any current object if an exception happens', () => {
    const objId = '1234';
    req.params = { objId: objId };
    objectReadSpy.mockImplementation(() => { throw new Error('test'); });
    storageListObjectVersionSpy.mockResolvedValue({});

    currentObject(req, res, next);

    expect(req.currentObject).toBeUndefined();
    expect(objectReadSpy).toHaveBeenCalledTimes(1);
    expect(objectReadSpy).toHaveBeenCalledWith(objId);
    expect(storageListObjectVersionSpy).toHaveBeenCalledTimes(0);
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
    storageListObjectVersionSpy.mockResolvedValue(testStorage);
    utils.getPath.mockReturnValue(`/path/${objId}`);

    await currentObject(req, res, next);

    expect(req.currentObject).toBeTruthy();
    expect(req.currentObject).toEqual(expect.objectContaining(testRecord));
    expect(req.currentObject).toEqual(expect.objectContaining(testStorage));
    expect(objectReadSpy).toHaveBeenCalledTimes(1);
    expect(objectReadSpy).toHaveBeenCalledWith(objId);
    expect(storageListObjectVersionSpy).toHaveBeenCalledTimes(1);
    expect(storageListObjectVersionSpy).toHaveBeenCalledWith({
      filePath: expect.stringMatching(`/path/${objId}`)
    });
    expect(utils.getPath).toHaveBeenCalledTimes(1);
    expect(utils.getPath).toHaveBeenCalledWith(objId);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('hasPermission', () => {
  const getAppAuthModeSpy = jest.spyOn(utils, 'getAppAuthMode');
  const getCurrentUserIdSpy = jest.spyOn(userService, 'getCurrentUserId');
  const searchPermissionsSpy = jest.spyOn(permissionService, 'searchPermissions');
  const problemSendSpy = jest.spyOn(Problem.prototype, 'send');

  let req, res, next;

  beforeEach(() => {
    problemSendSpy.mockImplementation(() => { });

    req = {};
    res = {};
    next = jest.fn();
  });

  describe('given no currentObject nor currentUser', () => {
    it.each([
      [1, false, AuthMode.NOAUTH],
      [1, false, AuthMode.BASICAUTH],
      [1, false, AuthMode.OIDCAUTH],
      [1, false, AuthMode.FULLAUTH],
      [1, true, AuthMode.NOAUTH],
      [1, true, AuthMode.BASICAUTH],
      [0, true, AuthMode.OIDCAUTH],
      [0, true, AuthMode.FULLAUTH]
    ])('should call next %i times given hasDb %s and authMode %s', (nextCount, hasDb, mode) => {
      const sendCount = 1 - nextCount;
      getAppAuthModeSpy.mockReturnValue(mode);
      //getCurrentSubjectSpy.mockReturnValue(undefined);
      getCurrentUserIdSpy.mockResolvedValue(SYSTEM_USER);
      config.has.mockReturnValueOnce(hasDb); // db.enabled

      const mw = hasPermission(Permissions.READ);
      expect(mw).toBeInstanceOf(Function);
      mw(req, res, next);

      expect(next).toHaveBeenCalledTimes(nextCount);
      if (nextCount) expect(next).toHaveBeenCalledWith();
      expect(problemSendSpy).toHaveBeenCalledTimes(sendCount);
      if (sendCount) expect(problemSendSpy).toHaveBeenCalledWith(res);
      expect(searchPermissionsSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('given a currentObject but no currentUser', () => {
    beforeEach(() => {
      req.currentObject = {};
    });

    it.each([
      [1, false, AuthMode.NOAUTH],
      [1, false, AuthMode.BASICAUTH],
      [1, false, AuthMode.OIDCAUTH],
      [1, false, AuthMode.FULLAUTH],
      [1, true, AuthMode.NOAUTH],
      [1, true, AuthMode.BASICAUTH],
      [0, true, AuthMode.OIDCAUTH],
      [0, true, AuthMode.FULLAUTH]
    ])('should call next %i times given hasDb %s and authMode %s', async (nextCount, hasDb, mode) => {
      const sendCount = 1 - nextCount;
      getAppAuthModeSpy.mockReturnValue(mode);
      getCurrentUserIdSpy.mockResolvedValue(SYSTEM_USER);
      config.has.mockReturnValueOnce(hasDb); // db.enabled

      const mw = hasPermission(Permissions.READ);
      expect(mw).toBeInstanceOf(Function);
      await mw(req, res, next);

      expect(next).toHaveBeenCalledTimes(nextCount);
      if (nextCount) expect(next).toHaveBeenCalledWith();
      expect(problemSendSpy).toHaveBeenCalledTimes(sendCount);
      if (sendCount) expect(problemSendSpy).toHaveBeenCalledWith(res);
      expect(searchPermissionsSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('given a currentObject and currentUser', () => {
    beforeEach(() => {
      req.currentObject = {};
      req.currentUser = {};
    });

    it.each([
      [1, AuthMode.NOAUTH],
      [1, AuthMode.BASICAUTH],
      [0, AuthMode.OIDCAUTH],
      [1, AuthMode.FULLAUTH]
    ])('should call next %i times when authType BASIC and authMode %s', async (nextCount, mode) => {
      const sendCount = 1 - nextCount;
      getAppAuthModeSpy.mockReturnValue(mode);
      getCurrentUserIdSpy.mockResolvedValue(SYSTEM_USER);
      config.has.mockReturnValueOnce(true); // db.enabled
      req.currentUser.authType = AuthType.BASIC;

      const mw = hasPermission(Permissions.READ);
      expect(mw).toBeInstanceOf(Function);
      await mw(req, res, next);

      expect(next).toHaveBeenCalledTimes(nextCount);
      if (nextCount) expect(next).toHaveBeenCalledWith();
      expect(problemSendSpy).toHaveBeenCalledTimes(sendCount);
      if (sendCount) expect(problemSendSpy).toHaveBeenCalledWith(res);
      expect(searchPermissionsSpy).toHaveBeenCalledTimes(0);
    });

    it.each([
      [0, false, Permissions.CREATE],
      [0, false, Permissions.READ],
      [0, false, Permissions.UPDATE],
      [0, false, Permissions.DELETE],
      [0, false, Permissions.MANAGE],
      [0, true, Permissions.CREATE],
      [1, true, Permissions.READ],
      [0, true, Permissions.UPDATE],
      [0, true, Permissions.DELETE],
      [0, true, Permissions.MANAGE]
    ])('should call next %i times when public %s and permission %s', async (nextCount, isPublic, perm) => {
      const sendCount = 1 - nextCount;
      getAppAuthModeSpy.mockReturnValue(AuthMode.OIDCAUTH);
      getCurrentUserIdSpy.mockResolvedValue(SYSTEM_USER);
      config.has.mockReturnValueOnce(true); // db.enabled
      req.currentUser.authType = AuthType.OIDC;
      req.currentObject.public = isPublic;

      const mw = hasPermission(perm);
      expect(mw).toBeInstanceOf(Function);
      await mw(req, res, next);

      expect(next).toHaveBeenCalledTimes(nextCount);
      if (nextCount) expect(next).toHaveBeenCalledWith();
      expect(problemSendSpy).toHaveBeenCalledTimes(sendCount);
      if (sendCount) expect(problemSendSpy).toHaveBeenCalledWith(res);
      expect(searchPermissionsSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('given currentObject with public false and currentUser', () => {
    beforeEach(() => {
      req.currentObject = {};
      req.currentUser = {};
      req.params = {};
    });

    it.each([
      [0, AuthType.NONE, undefined, []],
      [0, AuthType.NONE, SYSTEM_USER, []],
      [0, AuthType.NONE, SYSTEM_USER, [{ permCode: Permissions.UPDATE }]],
      [0, AuthType.NONE, SYSTEM_USER, [{ permCode: Permissions.READ }, { permCode: Permissions.UPDATE }]],
      [0, AuthType.BEARER, undefined, []],
      [0, AuthType.BEARER, SYSTEM_USER, []],
      [0, AuthType.BEARER, SYSTEM_USER, [{ permCode: Permissions.UPDATE }]],
      [1, AuthType.BEARER, SYSTEM_USER, [{ permCode: Permissions.READ }, { permCode: Permissions.UPDATE }]]
    ])('should call next %i times when authType %s, userId %o and have permissions %j', async (nextCount, type, userId, perms) => {
      const sendCount = 1 - nextCount;
      const searchPermCount = +(type === AuthType.BEARER && !!userId);
      getAppAuthModeSpy.mockReturnValue(AuthMode.OIDCAUTH);
      getCurrentUserIdSpy.mockResolvedValue(userId);
      searchPermissionsSpy.mockResolvedValue(perms);
      config.has.mockReturnValueOnce(true); // db.enabled
      req.currentObject.public = false;
      req.currentUser.authType = type;
      req.params.objId = SYSTEM_USER;

      const mw = hasPermission(Permissions.READ);
      expect(mw).toBeInstanceOf(Function);
      await mw(req, res, next);

      expect(next).toHaveBeenCalledTimes(nextCount);
      if (nextCount) expect(next).toHaveBeenCalledWith();
      expect(problemSendSpy).toHaveBeenCalledTimes(sendCount);
      if (sendCount) expect(problemSendSpy).toHaveBeenCalledWith(res);
      expect(searchPermissionsSpy).toHaveBeenCalledTimes(searchPermCount);
      if (searchPermCount) {
        expect(searchPermissionsSpy).toHaveBeenCalledWith(expect.objectContaining({ objId: SYSTEM_USER }));
        expect(searchPermissionsSpy).toHaveBeenCalledWith(expect.objectContaining({ userId: userId }));
      }
    });
  });
});
