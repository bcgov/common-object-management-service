const { NIL: SYSTEM_USER } = require('uuid');

const mw = require('../../../src/middleware/authorization');
const { bucketPermissionService, objectService, objectPermissionService, userService } = require('../../../src/services');
const { AuthMode, AuthType, Permissions } = require('../../../src/components/constants');
const utils = require('../../../src/components/utils');

// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
jest.mock('config');
// Mock out utils library and use a spy to observe behavior
jest.mock('../../../src/components/utils');

const checkPermissionSpy = jest.spyOn(mw, '_checkPermission');

beforeEach(() => {
  jest.resetAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('_checkPermission', () => {
  const getCurrentIdentitySpy = jest.spyOn(utils, 'getCurrentIdentity');
  const getCurrentUserIdSpy = jest.spyOn(userService, 'getCurrentUserId');
  const bucketSearchPermissionsSpy = jest.spyOn(bucketPermissionService, 'searchPermissions');
  const objSearchPermissionsSpy = jest.spyOn(objectPermissionService, 'searchPermissions');

  beforeAll(() => {
    checkPermissionSpy.mockRestore(); // Run actual function here
  });

  it('should return false when nothing is provided', () => {
    getCurrentIdentitySpy.mockReturnValue(SYSTEM_USER);
    getCurrentUserIdSpy.mockResolvedValue(SYSTEM_USER);

    const result = mw._checkPermission({}, undefined);

    expect(result).resolves.toBe(false);
    expect(getCurrentIdentitySpy).toHaveBeenCalledTimes(1);
    expect(getCurrentIdentitySpy).toHaveBeenCalledWith(undefined, SYSTEM_USER);
    expect(getCurrentUserIdSpy).toHaveBeenCalledTimes(1);
    expect(getCurrentUserIdSpy).toHaveBeenCalledWith(SYSTEM_USER);
    expect(bucketSearchPermissionsSpy).toHaveBeenCalledTimes(0);
    expect(objSearchPermissionsSpy).toHaveBeenCalledTimes(0);
  });

  it.each([
    [false, Permissions.READ, {}, [], []],
    [false, Permissions.READ, { objectId: SYSTEM_USER }, [], []],
    [false, Permissions.READ, { objectId: SYSTEM_USER }, [{ permCode: Permissions.UPDATE }], []],
    [true, Permissions.READ, { objectId: SYSTEM_USER }, [{ permCode: Permissions.READ }], []],
    [true, Permissions.READ, { objectId: SYSTEM_USER }, [{ permCode: Permissions.READ }, { permCode: Permissions.UPDATE }], []],
    [false, Permissions.READ, { bucketId: SYSTEM_USER }, [], []],
    [false, Permissions.READ, { bucketId: SYSTEM_USER }, [], [{ permCode: Permissions.UPDATE }]],
    [true, Permissions.READ, { bucketId: SYSTEM_USER }, [], [{ permCode: Permissions.READ }]],
    [true, Permissions.READ, { bucketId: SYSTEM_USER }, [], [{ permCode: Permissions.READ }, { permCode: Permissions.UPDATE }]],
    [false, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [], []],
    [false, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [{ permCode: Permissions.UPDATE }], []],
    [true, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [{ permCode: Permissions.READ }], []],
    [true, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [{ permCode: Permissions.READ }, { permCode: Permissions.UPDATE }], []],
    [false, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [{ permCode: Permissions.UPDATE }], [{ permCode: Permissions.UPDATE }]],
    [true, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [{ permCode: Permissions.UPDATE }], [{ permCode: Permissions.READ }]],
    [true, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [{ permCode: Permissions.READ }], [{ permCode: Permissions.UPDATE }]],
    [true, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [{ permCode: Permissions.READ }, { permCode: Permissions.UPDATE }], [{ permCode: Permissions.UPDATE }]],
    [true, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [{ permCode: Permissions.UPDATE }], [{ permCode: Permissions.READ }, { permCode: Permissions.UPDATE }]],
  ])('should return %s given a bucketless object, permission %s, params %j, objPerms %j and bucketPerms %j', async (expected, permission, params, objPerms, bucketPerms) => {
    const req = {
      currentObject: {},
      currentUser: { authType: AuthType.BEARER },
      params: params
    };
    getCurrentIdentitySpy.mockReturnValue(SYSTEM_USER);
    getCurrentUserIdSpy.mockResolvedValue(SYSTEM_USER);
    bucketSearchPermissionsSpy.mockResolvedValue(bucketPerms);
    objSearchPermissionsSpy.mockResolvedValue(objPerms);

    const result = await mw._checkPermission(req, permission);

    expect(result).toBe(expected);
    expect(getCurrentIdentitySpy).toHaveBeenCalledTimes(1);
    expect(getCurrentIdentitySpy).toHaveBeenCalledWith(req.currentUser, SYSTEM_USER);
    expect(getCurrentUserIdSpy).toHaveBeenCalledTimes(1);
    expect(getCurrentUserIdSpy).toHaveBeenCalledWith(SYSTEM_USER);
    expect(bucketSearchPermissionsSpy).toHaveBeenCalledTimes(params.bucketId ? 1 : 0);
    expect(objSearchPermissionsSpy).toHaveBeenCalledTimes(params.objectId ? 1 : 0);
  });

  it.each([
    [false, Permissions.READ, {}, [], []],
    [false, Permissions.READ, { objectId: SYSTEM_USER }, [], []],
    [false, Permissions.READ, { objectId: SYSTEM_USER }, [{ permCode: Permissions.UPDATE }], []],
    [true, Permissions.READ, { objectId: SYSTEM_USER }, [{ permCode: Permissions.READ }], []],
    [true, Permissions.READ, { objectId: SYSTEM_USER }, [{ permCode: Permissions.READ }, { permCode: Permissions.UPDATE }], []],
    [false, Permissions.READ, { bucketId: SYSTEM_USER }, [], []],
    [false, Permissions.READ, { bucketId: SYSTEM_USER }, [], [{ permCode: Permissions.UPDATE }]],
    [true, Permissions.READ, { bucketId: SYSTEM_USER }, [], [{ permCode: Permissions.READ }]],
    [true, Permissions.READ, { bucketId: SYSTEM_USER }, [], [{ permCode: Permissions.READ }, { permCode: Permissions.UPDATE }]],
    [false, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [], []],
    [false, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [{ permCode: Permissions.UPDATE }], []],
    [true, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [{ permCode: Permissions.READ }], []],
    [true, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [{ permCode: Permissions.READ }, { permCode: Permissions.UPDATE }], []],
    [false, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [{ permCode: Permissions.UPDATE }], [{ permCode: Permissions.UPDATE }]],
    [true, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [{ permCode: Permissions.UPDATE }], [{ permCode: Permissions.READ }]],
    [true, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [{ permCode: Permissions.READ }], [{ permCode: Permissions.UPDATE }]],
    [true, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [{ permCode: Permissions.READ }, { permCode: Permissions.UPDATE }], [{ permCode: Permissions.UPDATE }]],
    [true, Permissions.READ, { bucketId: SYSTEM_USER, objectId: SYSTEM_USER }, [{ permCode: Permissions.UPDATE }], [{ permCode: Permissions.READ }, { permCode: Permissions.UPDATE }]],
  ])('should return %s given a bucketed object, permission %s, params %j, objPerms %j and bucketPerms %j', async (expected, permission, params, objPerms, bucketPerms) => {
    const req = {
      currentObject: { bucketId: SYSTEM_USER },
      currentUser: { authType: AuthType.BEARER },
      params: params
    };
    getCurrentIdentitySpy.mockReturnValue(SYSTEM_USER);
    getCurrentUserIdSpy.mockResolvedValue(SYSTEM_USER);
    bucketSearchPermissionsSpy.mockResolvedValue(bucketPerms);
    objSearchPermissionsSpy.mockResolvedValue(objPerms);

    const result = await mw._checkPermission(req, permission);

    expect(result).toBe(expected);
    expect(getCurrentIdentitySpy).toHaveBeenCalledTimes(1);
    expect(getCurrentIdentitySpy).toHaveBeenCalledWith(req.currentUser, SYSTEM_USER);
    expect(getCurrentUserIdSpy).toHaveBeenCalledTimes(1);
    expect(getCurrentUserIdSpy).toHaveBeenCalledWith(SYSTEM_USER);
    expect(bucketSearchPermissionsSpy).toHaveBeenCalledTimes(1);
    expect(objSearchPermissionsSpy).toHaveBeenCalledTimes(params.objectId ? 1 : 0);
  });
});

describe('checkAppMode', () => {
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
    if (type) req.currentUser = { authType: type };

    const result = () => mw.checkAppMode(req, res, next);
    if (sendCount) expect(result).toThrow();
    else expect(result).not.toThrow();

    expect(getAppAuthModeSpy).toHaveBeenCalledTimes(1);
    expect(getAppAuthModeSpy).toHaveBeenCalledWith();
    expect(next).toHaveBeenCalledTimes(nextCount);
  });
});

describe('currentObject', () => {
  const objectReadSpy = jest.spyOn(objectService, 'read');

  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  it.each([
    [undefined],
    ['']
  ])('does not inject any current object to request with objectId %o', (objectId) => {
    req.params = { objectId: objectId };

    mw.currentObject(req, res, next);

    expect(req.currentObject).toBeUndefined();
    expect(objectReadSpy).toHaveBeenCalledTimes(0);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('does not inject any current object if an exception happens', () => {
    const objectId = '1234';
    req.params = { objectId: objectId };
    objectReadSpy.mockImplementation(() => { throw new Error('test'); });

    mw.currentObject(req, res, next);

    expect(req.currentObject).toBeUndefined();
    expect(objectReadSpy).toHaveBeenCalledTimes(1);
    expect(objectReadSpy).toHaveBeenCalledWith(objectId);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });

  it('injects the current object based on the service results', async () => {
    const objectId = '1234';
    const testRecord = { a: 1 };
    req.params = { objectId: objectId };
    objectReadSpy.mockResolvedValue(testRecord);

    await mw.currentObject(req, res, next);

    expect(req.currentObject).toBeTruthy();
    expect(req.currentObject).toEqual(expect.objectContaining(testRecord));
    expect(objectReadSpy).toHaveBeenCalledTimes(1);
    expect(objectReadSpy).toHaveBeenCalledWith(objectId);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('hasPermission', () => {
  const getAppAuthModeSpy = jest.spyOn(utils, 'getAppAuthMode');
  const getCurrentIdentitySpy = jest.spyOn(utils, 'getCurrentIdentity');
  const getCurrentUserIdSpy = jest.spyOn(userService, 'getCurrentUserId');
  const objSearchPermissionsSpy = jest.spyOn(objectPermissionService, 'searchPermissions');

  let req, res, next;

  beforeEach(() => {
    req = {};
    res = {};
    next = jest.fn();
  });

  describe('given no currentObject nor currentUser', () => {
    it.each([
      [1, AuthMode.NOAUTH],
      [1, AuthMode.BASICAUTH],
      [0, AuthMode.OIDCAUTH],
      [0, AuthMode.FULLAUTH]
    ])('should call next %i times given authMode %s', async (nextCount, mode) => {
      getAppAuthModeSpy.mockReturnValue(mode);

      const result = mw.hasPermission(Permissions.READ);
      expect(result).toBeInstanceOf(Function);
      await result(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      if (nextCount) expect(next).toHaveBeenCalledWith();
      else expect(next).toHaveBeenCalledWith(expect.any(Object));
      expect(objSearchPermissionsSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('given a currentObject but no currentUser', () => {
    beforeEach(() => {
      req.currentObject = {};
      req.params = {};
    });

    it.each([
      [1, AuthMode.NOAUTH],
      [1, AuthMode.BASICAUTH],
      [0, AuthMode.OIDCAUTH],
      [0, AuthMode.FULLAUTH]
    ])('should call next %i times given authMode %s', async (nextCount, mode) => {
      getAppAuthModeSpy.mockReturnValue(mode);
      getCurrentUserIdSpy.mockResolvedValue(SYSTEM_USER);
      getCurrentIdentitySpy.mockReturnValue(SYSTEM_USER);

      const result = mw.hasPermission(Permissions.READ);
      expect(result).toBeInstanceOf(Function);
      await result(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      if (nextCount) expect(next).toHaveBeenCalledWith();
      else expect(next).toHaveBeenCalledWith(expect.any(Object));
      expect(objSearchPermissionsSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('given a currentUser but no currentObject', () => {
    beforeEach(() => {
      req.currentUser = {};
    });

    it.each([
      [{}],
      [{ bucketId: SYSTEM_USER }],
      [{ objectId: SYSTEM_USER }],
      [{ bucketId: SYSTEM_USER, objectId: SYSTEM_USER }]
    ])('should call next 0 times with params %j', async (params) => {
      req.params = params;
      getAppAuthModeSpy.mockReturnValue(AuthMode.FULLAUTH);
      getCurrentUserIdSpy.mockResolvedValue(SYSTEM_USER);
      getCurrentIdentitySpy.mockReturnValue(SYSTEM_USER);

      const result = mw.hasPermission(Permissions.READ);
      expect(result).toBeInstanceOf(Function);
      await result(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(expect.any(Object));
    });
  });

  describe('given a currentObject and currentUser', () => {
    beforeEach(() => {
      req.currentObject = {};
      req.currentUser = {};
      req.params = { objectId: SYSTEM_USER };
    });

    it.each([
      [1, AuthMode.NOAUTH],
      [1, AuthMode.BASICAUTH],
      [0, AuthMode.OIDCAUTH],
      [1, AuthMode.FULLAUTH]
    ])('should call next %i times when authType BASIC and authMode %s', async (nextCount, mode) => {
      getAppAuthModeSpy.mockReturnValue(mode);
      checkPermissionSpy.mockResolvedValue(false);
      req.currentUser.authType = AuthType.BASIC;

      const result = mw.hasPermission(Permissions.READ);
      expect(result).toBeInstanceOf(Function);
      await result(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      if (nextCount) expect(next).toHaveBeenCalledWith();
      else expect(next).toHaveBeenCalledWith(expect.any(Object));
      expect(checkPermissionSpy).toHaveBeenCalledTimes(0);
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
      getAppAuthModeSpy.mockReturnValue(AuthMode.OIDCAUTH);
      getCurrentUserIdSpy.mockResolvedValue(SYSTEM_USER);
      req.currentUser.authType = AuthType.OIDC;
      req.currentObject.public = isPublic;

      const result = mw.hasPermission(perm);
      expect(result).toBeInstanceOf(Function);
      await result(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      if (nextCount) expect(next).toHaveBeenCalledWith();
      else expect(next).toHaveBeenCalledWith(expect.any(Object));
      expect(objSearchPermissionsSpy).toHaveBeenCalledTimes(0);
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
      const searchPermCount = +(type === AuthType.BEARER && !!userId);
      getAppAuthModeSpy.mockReturnValue(AuthMode.OIDCAUTH);
      getCurrentUserIdSpy.mockResolvedValue(userId);
      objSearchPermissionsSpy.mockResolvedValue(perms);
      req.currentObject.public = false;
      req.currentUser.authType = type;
      req.params.objectId = SYSTEM_USER;

      const result = mw.hasPermission(Permissions.READ);
      expect(result).toBeInstanceOf(Function);
      await result(req, res, next);

      expect(next).toHaveBeenCalledTimes(1);
      if (nextCount) expect(next).toHaveBeenCalledWith();
      else expect(next).toHaveBeenCalledWith(expect.any(Object));

      expect(objSearchPermissionsSpy).toHaveBeenCalledTimes(searchPermCount);
      if (searchPermCount) {
        expect(objSearchPermissionsSpy).toHaveBeenCalledWith(expect.objectContaining({ objId: SYSTEM_USER }));
        expect(objSearchPermissionsSpy).toHaveBeenCalledWith(expect.objectContaining({ userId: userId }));
      }
    });
  });
});
