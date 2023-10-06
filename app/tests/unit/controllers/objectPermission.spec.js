const Problem = require('api-problem');

const controller = require('../../../src/controllers/objectPermission');
const { objectPermissionService, userService } = require('../../../src/services');
const utils = require('../../../src/components/utils');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
jest.mock('config');

describe('searchPermissions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const searchPermissionsSpy = jest.spyOn(objectPermissionService, 'searchPermissions');
  const groupByObjectSpy = jest.spyOn(utils, 'groupByObject');

  const req = {
    query: { bucketId: 'abc', objectId: 'xyz-789', userId: 'oid-1d', permCode: 'pc' }
  };
  const next = jest.fn();

  it('should return the permission service searchPermissions result', async () => {
    searchPermissionsSpy.mockReturnValue({ res: 123 });
    groupByObjectSpy.mockReturnValue([]);

    const res = mockResponse();
    await controller.searchPermissions(req, res, next);
    expect(searchPermissionsSpy).toHaveBeenCalledTimes(1);
    expect(searchPermissionsSpy).toHaveBeenCalledWith({ bucketId: [req.query.bucketId], objId: [req.query.objectId], userId: [req.query.userId], permCode: [req.query.permCode] });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith([]);
    expect(next).toHaveBeenCalledTimes(0);
  });

  it('should return a problem if an exception happens', async () => {
    searchPermissionsSpy.mockImplementationOnce(() => { throw new Error(); });

    const res = mockResponse();
    await controller.searchPermissions(req, res, next);
    expect(searchPermissionsSpy).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Problem(500, 'Internal Server Error'));
  });
});

describe('listPermissions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const searchPermissionsSpy = jest.spyOn(objectPermissionService, 'searchPermissions');

  const req = {
    params: { objectId: 'xyz-789' },
    query: { userId: 'oid-1d', permCode: 'pc' }
  };
  const next = jest.fn();

  it('should return the permission service listPermissions result', async () => {
    searchPermissionsSpy.mockReturnValue({ res: 123 });

    const res = mockResponse();
    await controller.listPermissions(req, res, next);
    expect(searchPermissionsSpy).toHaveBeenCalledTimes(1);
    expect(searchPermissionsSpy).toHaveBeenCalledWith({ objId: req.params.objectId, userId: [req.query.userId], permCode: [req.query.permCode] });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ res: 123 });
    expect(next).toHaveBeenCalledTimes(0);
  });

  it('should return a problem if an exception happens', async () => {
    searchPermissionsSpy.mockImplementationOnce(() => { throw new Error(); });

    const res = mockResponse();
    await controller.listPermissions(req, res, next);
    expect(searchPermissionsSpy).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Problem(500, 'Internal Server Error'));
  });
});

describe('addPermissions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const addPermissionsSpy = jest.spyOn(objectPermissionService, 'addPermissions');
  const getCurrentUserIdSpy = jest.spyOn(userService, 'getCurrentUserId');

  const req = {
    body: ['READ'],
    params: { objectId: 'xyz-789' }
  };
  const next = jest.fn();

  it('should return the permission service addPermissions result', async () => {
    addPermissionsSpy.mockReturnValue({ res: 123 });
    getCurrentUserIdSpy.mockReturnValue('user-123');

    const res = mockResponse();
    await controller.addPermissions(req, res, next);
    expect(addPermissionsSpy).toHaveBeenCalledTimes(1);
    expect(addPermissionsSpy).toHaveBeenCalledWith(req.params.objectId, req.body, 'user-123');
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ res: 123 });
    expect(next).toHaveBeenCalledTimes(0);
  });

  it('should return a problem if an exception happens', async () => {
    addPermissionsSpy.mockImplementationOnce(() => { throw new Error(); });

    const res = mockResponse();
    await controller.addPermissions(req, res, next);
    expect(addPermissionsSpy).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Problem(500, 'Internal Server Error'));
  });
});

describe('removePermissions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const removePermissionsSpy = jest.spyOn(objectPermissionService, 'removePermissions');
  const req = {
    params: { objectId: 'xyz-789' },
    query: { userId: 'oid-1d,oid-2d', permCode: 'pc' }
  };
  const next = jest.fn();

  it('should return the permission service removePermissions result', async () => {
    removePermissionsSpy.mockReturnValue({ res: 123 });

    const res = mockResponse();
    await controller.removePermissions(req, res, next);
    expect(removePermissionsSpy).toHaveBeenCalledTimes(1);
    expect(removePermissionsSpy).toHaveBeenCalledWith(req.params.objectId, ['oid-1d', 'oid-2d'], [req.query.permCode]);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ res: 123 });
    expect(next).toHaveBeenCalledTimes(0);
  });

  it('should return a problem if an exception happens', async () => {
    removePermissionsSpy.mockImplementationOnce(() => { throw new Error(); });

    const res = mockResponse();
    await controller.removePermissions(req, res, next);
    expect(removePermissionsSpy).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Problem(500, 'Internal Server Error'));
  });
});
