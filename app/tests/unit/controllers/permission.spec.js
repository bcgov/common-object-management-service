const { AuthType } = require('../../../src/components/constants');
const controller = require('../../../src/controllers/permission');
const { permissionService } = require('../../../src/services');
const Problem = require('api-problem');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('searchPermissions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const searchPermissionsSpy = jest.spyOn(permissionService, 'searchPermissions');

  const req = {
    query: { objId: 'xyz-789', oidcId: 'oid-1d', permCode: 'pc' }
  };
  const next = jest.fn();

  it('should return the permission service searchPermissions result', async () => {
    searchPermissionsSpy.mockReturnValue({ res: 123 });

    const res = mockResponse();
    await controller.searchPermissions(req, res, next);
    expect(searchPermissionsSpy).toHaveBeenCalledTimes(1);
    expect(searchPermissionsSpy).toHaveBeenCalledWith({ objId: [req.query.objId], oidcId: [req.query.oidcId], permCode: [req.query.permCode] });
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith({ res: 123 });
    expect(next).toHaveBeenCalledTimes(0);
  });

  it('should return a problem if an exception happens', async () => {
    searchPermissionsSpy.mockImplementationOnce(() => { throw new Error(); });

    const res = mockResponse();
    await controller.searchPermissions(req, res, next);
    expect(searchPermissionsSpy).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Problem(502, 'Unknown PermissionService Error'));
  });
});

describe('listPermissions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const searchPermissionsSpy = jest.spyOn(permissionService, 'searchPermissions');

  const req = {
    params: { objId: 'xyz-789' },
    query: { oidcId: 'oid-1d', permCode: 'pc' }
  };
  const next = jest.fn();

  it('should return the permission service listPermissions result', async () => {
    searchPermissionsSpy.mockReturnValue({ res: 123 });

    const res = mockResponse();
    await controller.listPermissions(req, res, next);
    expect(searchPermissionsSpy).toHaveBeenCalledTimes(1);
    expect(searchPermissionsSpy).toHaveBeenCalledWith({ objId: req.params.objId, oidcId: [req.query.oidcId], permCode: [req.query.permCode] });
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
    expect(next).toHaveBeenCalledWith(new Problem(502, 'Unknown PermissionService Error'));
  });
});

describe('addPermissions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const addPermissionsSpy = jest.spyOn(permissionService, 'addPermissions');

  const req = {
    body: ['READ'],
    currentUser: { authType: AuthType.BEARER, tokenPayload: { sub: 'testsub' } },
    params: { objId: 'xyz-789' }
  };
  const next = jest.fn();

  it('should return the permission service addPermissions result', async () => {
    addPermissionsSpy.mockReturnValue({ res: 123 });

    const res = mockResponse();
    await controller.addPermissions(req, res, next);
    expect(addPermissionsSpy).toHaveBeenCalledTimes(1);
    expect(addPermissionsSpy).toHaveBeenCalledWith(req.params.objId, req.body, 'testsub');
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
    expect(next).toHaveBeenCalledWith(new Problem(502, 'Unknown PermissionService Error'));
  });
});

describe('removePermissions', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const removePermissionsSpy = jest.spyOn(permissionService, 'removePermissions');
  const req = {
    params: { objId: 'xyz-789' },
    query: { oidcId: 'oid-1d,oid-2d', permCode: 'pc' }
  };
  const next = jest.fn();

  it('should return the permission service removePermissions result', async () => {
    removePermissionsSpy.mockReturnValue({ res: 123 });

    const res = mockResponse();
    await controller.removePermissions(req, res, next);
    expect(removePermissionsSpy).toHaveBeenCalledTimes(1);
    expect(removePermissionsSpy).toHaveBeenCalledWith(req.params.objId, ['oid-1d', 'oid-2d'], [req.query.permCode]);
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
    expect(next).toHaveBeenCalledWith(new Problem(502, 'Unknown PermissionService Error'));
  });
});
