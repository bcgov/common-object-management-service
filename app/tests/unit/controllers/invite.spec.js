const Problem = require('api-problem');
const { NIL: RESOURCE, NIL: TOKEN, NIL: SYSTEM_USER } = require('uuid');

const controller = require('../../../src/controllers/invite');
const {
  bucketPermissionService,
  bucketService,
  inviteService,
  objectPermissionService,
  objectService,
  userService
} = require('../../../src/services');
const utils = require('../../../src/components/utils');
const { Permissions, ResourceType, AuthType } = require('../../../src/components/constants');

// Mock out utils library and use a spy to observe behavior
jest.mock('../../../src/components/utils');
const SYSTEM_TIME = new Date('2024-03-08T19:00:00.000Z');
const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};

let res = undefined;

beforeAll(() => {
  jest.useFakeTimers();
  jest.setSystemTime(SYSTEM_TIME);
});

beforeEach(() => {
  res = mockResponse();
});

afterEach(() => {
  jest.resetAllMocks();
});

afterAll(() => {
  jest.setSystemTime(jest.getRealSystemTime());
  jest.useRealTimers();
});

describe('createInvite', () => {
  const bucketReadSpy = jest.spyOn(bucketService, 'read');
  const bucketSearchPermissionSpy = jest.spyOn(bucketPermissionService, 'searchPermissions');
  const getCurrentIdentitySpy = jest.spyOn(utils, 'getCurrentIdentity');
  const getCurrentUserIdSpy = jest.spyOn(userService, 'getCurrentUserId');
  const addDashesToUuidSpy = jest.spyOn(utils, 'addDashesToUuid');
  const inviteCreateSpy = jest.spyOn(inviteService, 'create');
  const objectReadSpy = jest.spyOn(objectService, 'read');
  const objectSearchPermissionSpy = jest.spyOn(objectPermissionService, 'searchPermissions');
  const next = jest.fn();

  const USR_IDENTITY = SYSTEM_USER;
  const USR_ID = 'abc-123';

  beforeEach(() => {
    getCurrentIdentitySpy.mockReturnValue(USR_IDENTITY);
    getCurrentUserIdSpy.mockResolvedValue(USR_ID);
    addDashesToUuidSpy.mockReturnValue(RESOURCE);
  });

  it('should 422 when expiresAt is more than 7 days away', async () => {
    const expiresAt = Math.floor(new Date('2037-01-01T19:00:00.000Z') / 1000);
    const req = { body: { expiresAt: expiresAt, objectId: RESOURCE } };

    await controller.createInvite(req, res, next);

    expect(bucketReadSpy).toHaveBeenCalledTimes(0);
    expect(bucketSearchPermissionSpy).toHaveBeenCalledTimes(0);
    expect(inviteCreateSpy).toHaveBeenCalledTimes(0);
    expect(objectReadSpy).toHaveBeenCalledTimes(0);
    expect(objectSearchPermissionSpy).toHaveBeenCalledTimes(0);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Problem(422));
  });

  it('should 500 for unexpected errors', async () => {
    const req = { body: { objectId: RESOURCE } };

    objectReadSpy.mockImplementation(() => { throw new Error(); });

    await controller.createInvite(req, res, next);

    expect(bucketReadSpy).toHaveBeenCalledTimes(0);
    expect(bucketSearchPermissionSpy).toHaveBeenCalledTimes(0);
    expect(inviteCreateSpy).toHaveBeenCalledTimes(0);
    expect(objectReadSpy).toHaveBeenCalledTimes(1);
    expect(objectReadSpy).toHaveBeenCalledWith(RESOURCE);
    expect(objectSearchPermissionSpy).toHaveBeenCalledTimes(0);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Problem(500));
  });

  describe('object', () => {
    it('should 409 when object not found', async () => {
      const req = { body: { objectId: RESOURCE } };

      objectReadSpy.mockRejectedValue({ statusCode: 404 });

      await controller.createInvite(req, res, next);

      expect(bucketReadSpy).toHaveBeenCalledTimes(0);
      expect(bucketSearchPermissionSpy).toHaveBeenCalledTimes(0);
      expect(inviteCreateSpy).toHaveBeenCalledTimes(0);
      expect(objectReadSpy).toHaveBeenCalledTimes(1);
      expect(objectReadSpy).toHaveBeenCalledWith(RESOURCE);
      expect(objectSearchPermissionSpy).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(new Problem(409));
    });

    it('should 403 when no object manage permission found', async () => {
      const req = {
        body: { objectId: RESOURCE },
        currentUser: { authType: AuthType.BEARER }
      };

      objectReadSpy.mockResolvedValue({});
      objectSearchPermissionSpy.mockResolvedValue([]);

      await controller.createInvite(req, res, next);

      expect(bucketReadSpy).toHaveBeenCalledTimes(0);
      expect(bucketSearchPermissionSpy).toHaveBeenCalledTimes(0);
      expect(inviteCreateSpy).toHaveBeenCalledTimes(0);
      expect(objectReadSpy).toHaveBeenCalledTimes(1);
      expect(objectReadSpy).toHaveBeenCalledWith(RESOURCE);
      expect(objectSearchPermissionSpy).toHaveBeenCalledTimes(1);
      expect(objectSearchPermissionSpy).toHaveBeenCalledWith({
        userId: USR_ID, objId: RESOURCE, permCode: Permissions.MANAGE
      });
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(new Problem(403));
    });

    it('should 403 when no object nor bucket manage permission found', async () => {
      const req = {
        body: { objectId: RESOURCE },
        currentUser: { authType: AuthType.BEARER }
      };

      bucketSearchPermissionSpy.mockResolvedValue([]);
      objectReadSpy.mockResolvedValue({ bucketId: RESOURCE });
      objectSearchPermissionSpy.mockResolvedValue([]);

      await controller.createInvite(req, res, next);

      expect(bucketReadSpy).toHaveBeenCalledTimes(0);
      expect(bucketSearchPermissionSpy).toHaveBeenCalledTimes(1);
      expect(bucketSearchPermissionSpy).toHaveBeenCalledWith({
        userId: USR_ID, bucketId: RESOURCE, permCode: Permissions.MANAGE
      });
      expect(inviteCreateSpy).toHaveBeenCalledTimes(0);
      expect(objectReadSpy).toHaveBeenCalledTimes(1);
      expect(objectReadSpy).toHaveBeenCalledWith(RESOURCE);
      expect(objectSearchPermissionSpy).toHaveBeenCalledTimes(1);
      expect(objectSearchPermissionSpy).toHaveBeenCalledWith({
        userId: USR_ID, objId: RESOURCE, permCode: Permissions.MANAGE
      });
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(new Problem(403));
    });

    it('should 201 when object manage permission found', async () => {
      const req = {
        body: { objectId: RESOURCE },
        currentUser: { authType: AuthType.BEARER }
      };

      inviteCreateSpy.mockResolvedValue({ token: TOKEN });
      objectReadSpy.mockResolvedValue({ bucketId: RESOURCE });
      objectSearchPermissionSpy.mockResolvedValue([{}]);

      await controller.createInvite(req, res, next);

      expect(bucketReadSpy).toHaveBeenCalledTimes(0);
      expect(bucketSearchPermissionSpy).toHaveBeenCalledTimes(0);
      expect(inviteCreateSpy).toHaveBeenCalledTimes(1);
      expect(inviteCreateSpy).toHaveBeenCalledWith(expect.objectContaining({
        token: expect.any(String), resource: RESOURCE, type: ResourceType.OBJECT, userId: USR_ID
      }));
      expect(objectReadSpy).toHaveBeenCalledTimes(1);
      expect(objectReadSpy).toHaveBeenCalledWith(RESOURCE);
      expect(objectSearchPermissionSpy).toHaveBeenCalledTimes(1);
      expect(objectSearchPermissionSpy).toHaveBeenCalledWith({
        userId: USR_ID, objId: RESOURCE, permCode: Permissions.MANAGE
      });
      expect(next).toHaveBeenCalledTimes(0);
      expect(res.json).toHaveBeenCalledWith(expect.any(String));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should 201 when bucket manage permission found', async () => {
      const email = 'expected@foo.bar';
      const req = {
        body: { objectId: RESOURCE, email: email },
        currentUser: { authType: AuthType.BEARER }
      };

      bucketSearchPermissionSpy.mockResolvedValue([{}]);
      inviteCreateSpy.mockResolvedValue({ token: TOKEN });
      objectReadSpy.mockResolvedValue({ bucketId: RESOURCE });
      objectSearchPermissionSpy.mockResolvedValue([]);

      await controller.createInvite(req, res, next);

      expect(bucketReadSpy).toHaveBeenCalledTimes(0);
      expect(bucketSearchPermissionSpy).toHaveBeenCalledTimes(1);
      expect(bucketSearchPermissionSpy).toHaveBeenCalledWith({
        userId: USR_ID, bucketId: RESOURCE, permCode: Permissions.MANAGE
      });
      expect(inviteCreateSpy).toHaveBeenCalledTimes(1);
      expect(inviteCreateSpy).toHaveBeenCalledWith(expect.objectContaining({
        token: expect.any(String), email: email, resource: RESOURCE, type: ResourceType.OBJECT, userId: USR_ID
      }));
      expect(objectReadSpy).toHaveBeenCalledTimes(1);
      expect(objectReadSpy).toHaveBeenCalledWith(RESOURCE);
      expect(objectSearchPermissionSpy).toHaveBeenCalledTimes(1);
      expect(objectSearchPermissionSpy).toHaveBeenCalledWith({
        userId: USR_ID, objId: RESOURCE, permCode: Permissions.MANAGE
      });
      expect(next).toHaveBeenCalledTimes(0);
      expect(res.json).toHaveBeenCalledWith(expect.any(String));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should 201 when using basic authentication', async () => {
      const expiresAt = Math.floor(new Date('2024-03-09T19:00:00.000Z') / 1000);
      const req = {
        body: { objectId: RESOURCE, expiresAt: expiresAt },
        currentUser: { authType: AuthType.BASIC }
      };

      inviteCreateSpy.mockResolvedValue({ token: TOKEN });
      objectReadSpy.mockResolvedValue({ bucketId: RESOURCE });

      await controller.createInvite(req, res, next);

      expect(bucketReadSpy).toHaveBeenCalledTimes(0);
      expect(bucketSearchPermissionSpy).toHaveBeenCalledTimes(0);
      expect(inviteCreateSpy).toHaveBeenCalledTimes(1);
      expect(inviteCreateSpy).toHaveBeenCalledWith(expect.objectContaining({
        token: expect.any(String),
        resource: RESOURCE,
        type: ResourceType.OBJECT,
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        userId: USR_ID
      }));
      expect(objectReadSpy).toHaveBeenCalledTimes(1);
      expect(objectReadSpy).toHaveBeenCalledWith(RESOURCE);
      expect(objectSearchPermissionSpy).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(0);
      expect(res.json).toHaveBeenCalledWith(expect.any(String));
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });

  describe('bucket', () => {
    it('should 409 when bucket not found', async () => {
      const req = { body: { bucketId: RESOURCE } };

      bucketReadSpy.mockRejectedValue({ statusCode: 404 });

      await controller.createInvite(req, res, next);

      expect(bucketReadSpy).toHaveBeenCalledTimes(1);
      expect(bucketReadSpy).toHaveBeenCalledWith(RESOURCE);
      expect(bucketSearchPermissionSpy).toHaveBeenCalledTimes(0);
      expect(inviteCreateSpy).toHaveBeenCalledTimes(0);
      expect(objectReadSpy).toHaveBeenCalledTimes(0);
      expect(objectSearchPermissionSpy).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(new Problem(409));
    });

    it('should 403 when no bucket manage permission found', async () => {
      const req = {
        body: { bucketId: RESOURCE },
        currentUser: { authType: AuthType.BEARER }
      };

      bucketReadSpy.mockResolvedValue({});
      bucketSearchPermissionSpy.mockResolvedValue([]);

      await controller.createInvite(req, res, next);

      expect(bucketReadSpy).toHaveBeenCalledTimes(1);
      expect(bucketReadSpy).toHaveBeenCalledWith(RESOURCE);
      expect(bucketSearchPermissionSpy).toHaveBeenCalledTimes(1);
      expect(bucketSearchPermissionSpy).toHaveBeenCalledWith({
        userId: USR_ID, bucketId: RESOURCE, permCode: Permissions.MANAGE
      });
      expect(inviteCreateSpy).toHaveBeenCalledTimes(0);
      expect(objectReadSpy).toHaveBeenCalledTimes(0);
      expect(objectSearchPermissionSpy).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(new Problem(403));
    });

    it('should 201 when bucket manage permission found', async () => {
      const email = 'expected@foo.bar';
      const req = {
        body: { bucketId: RESOURCE, email: email },
        currentUser: { authType: AuthType.BEARER }
      };

      bucketReadSpy.mockResolvedValue({});
      bucketSearchPermissionSpy.mockResolvedValue([{}]);
      inviteCreateSpy.mockResolvedValue({ token: TOKEN });

      await controller.createInvite(req, res, next);

      expect(bucketReadSpy).toHaveBeenCalledTimes(1);
      expect(bucketReadSpy).toHaveBeenCalledWith(RESOURCE);
      expect(bucketSearchPermissionSpy).toHaveBeenCalledTimes(1);
      expect(bucketSearchPermissionSpy).toHaveBeenCalledWith({
        userId: USR_ID, bucketId: RESOURCE, permCode: Permissions.MANAGE
      });
      expect(inviteCreateSpy).toHaveBeenCalledTimes(1);
      expect(inviteCreateSpy).toHaveBeenCalledWith(expect.objectContaining({
        token: expect.any(String), email: email, resource: RESOURCE, type: ResourceType.BUCKET, userId: USR_ID
      }));
      expect(objectReadSpy).toHaveBeenCalledTimes(0);
      expect(objectSearchPermissionSpy).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(0);
      expect(res.json).toHaveBeenCalledWith(expect.any(String));
      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('should 201 when using basic authentication', async () => {
      const expiresAt = Math.floor(new Date('2024-03-09T19:00:00.000Z') / 1000);
      const req = {
        body: { bucketId: RESOURCE, expiresAt: expiresAt },
        currentUser: { authType: AuthType.BASIC }
      };

      bucketReadSpy.mockResolvedValue({ bucketId: RESOURCE });
      inviteCreateSpy.mockResolvedValue({ token: TOKEN });

      await controller.createInvite(req, res, next);

      expect(bucketReadSpy).toHaveBeenCalledTimes(1);
      expect(bucketReadSpy).toHaveBeenCalledWith(RESOURCE);
      expect(bucketSearchPermissionSpy).toHaveBeenCalledTimes(0);
      expect(inviteCreateSpy).toHaveBeenCalledTimes(1);
      expect(inviteCreateSpy).toHaveBeenCalledWith(expect.objectContaining({
        token: expect.any(String),
        resource: RESOURCE,
        type: ResourceType.BUCKET,
        expiresAt: new Date(expiresAt * 1000).toISOString(),
        userId: USR_ID
      }));
      expect(objectReadSpy).toHaveBeenCalledTimes(0);
      expect(objectSearchPermissionSpy).toHaveBeenCalledTimes(0);
      expect(next).toHaveBeenCalledTimes(0);
      expect(res.json).toHaveBeenCalledWith(expect.any(String));
      expect(res.status).toHaveBeenCalledWith(201);
    });
  });
});

describe('useInvite', () => {
  const bucketAddPermissionsSpy = jest.spyOn(bucketPermissionService, 'addPermissions');
  const bucketReadSpy = jest.spyOn(bucketService, 'read');
  const getCurrentIdentitySpy = jest.spyOn(utils, 'getCurrentIdentity');
  const getCurrentUserIdSpy = jest.spyOn(userService, 'getCurrentUserId');
  const addDashesToUuidSpy = jest.spyOn(utils, 'addDashesToUuid');
  const inviteDeleteSpy = jest.spyOn(inviteService, 'delete');
  const inviteReadSpy = jest.spyOn(inviteService, 'read');
  const objectAddPermissionsSpy = jest.spyOn(objectPermissionService, 'addPermissions');
  const objectReadSpy = jest.spyOn(objectService, 'read');
  const next = jest.fn();

  const USR_IDENTITY = SYSTEM_USER;
  const USR_ID = 'abc-123';

  beforeEach(() => {
    getCurrentIdentitySpy.mockReturnValue(USR_IDENTITY);
    getCurrentUserIdSpy.mockResolvedValue(USR_ID);
    addDashesToUuidSpy.mockReturnValue(TOKEN);
  });


  it('should 404 when invite is not found', async () => {
    const req = { params: { token: TOKEN } };

    inviteReadSpy.mockRejectedValue({ statusCode: 404 });

    await controller.useInvite(req, res, next);

    expect(bucketAddPermissionsSpy).toHaveBeenCalledTimes(0);
    expect(bucketReadSpy).toHaveBeenCalledTimes(0);
    expect(inviteDeleteSpy).toHaveBeenCalledTimes(0);
    expect(inviteReadSpy).toHaveBeenCalledTimes(1);
    expect(inviteReadSpy).toHaveBeenCalledWith(TOKEN);
    expect(objectAddPermissionsSpy).toHaveBeenCalledTimes(0);
    expect(objectReadSpy).toHaveBeenCalledTimes(0);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Problem(404));
  });

  it('should 410 when invite has expired', async () => {
    const req = { params: { token: TOKEN } };

    inviteReadSpy.mockResolvedValue({ expiresAt: new Date('2024-03-07T19:00:00.000Z').toISOString() });

    await controller.useInvite(req, res, next);

    expect(bucketAddPermissionsSpy).toHaveBeenCalledTimes(0);
    expect(bucketReadSpy).toHaveBeenCalledTimes(0);
    expect(inviteDeleteSpy).toHaveBeenCalledTimes(1);
    expect(inviteDeleteSpy).toHaveBeenCalledWith(TOKEN);
    expect(inviteReadSpy).toHaveBeenCalledTimes(1);
    expect(inviteReadSpy).toHaveBeenCalledWith(TOKEN);
    expect(objectAddPermissionsSpy).toHaveBeenCalledTimes(0);
    expect(objectReadSpy).toHaveBeenCalledTimes(0);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Problem(410));
  });

  it('should 403 when emails mismatch', async () => {
    const email = 'expected@foo.bar';
    const req = {
      currentUser: { tokenPayload: { email: 'other@foo.bar' } },
      params: { token: TOKEN }
    };

    inviteReadSpy.mockResolvedValue({ email: email });

    await controller.useInvite(req, res, next);

    expect(bucketAddPermissionsSpy).toHaveBeenCalledTimes(0);
    expect(bucketReadSpy).toHaveBeenCalledTimes(0);
    expect(inviteDeleteSpy).toHaveBeenCalledTimes(0);
    expect(inviteReadSpy).toHaveBeenCalledTimes(1);
    expect(inviteReadSpy).toHaveBeenCalledWith(TOKEN);
    expect(objectAddPermissionsSpy).toHaveBeenCalledTimes(0);
    expect(objectReadSpy).toHaveBeenCalledTimes(0);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Problem(403));
  });

  it('should 409 when object not found', async () => {
    const email = 'expected@foo.bar';
    const req = {
      currentUser: { tokenPayload: { email: email } },
      params: { token: TOKEN }
    };

    objectReadSpy.mockRejectedValue({});

    await controller.useInvite(req, res, next);

    expect(bucketAddPermissionsSpy).toHaveBeenCalledTimes(0);
    expect(bucketReadSpy).toHaveBeenCalledTimes(0);
    expect(inviteDeleteSpy).toHaveBeenCalledTimes(0);
    expect(inviteReadSpy).toHaveBeenCalledTimes(1);
    expect(inviteReadSpy).toHaveBeenCalledWith(TOKEN);
    expect(objectAddPermissionsSpy).toHaveBeenCalledTimes(0);
  });

  it('should 200 when object grant successful', async () => {
    const email = 'expected@foo.bar';
    const req = {
      currentUser: { tokenPayload: { email: email } },
      params: { token: TOKEN }
    };

    inviteReadSpy.mockResolvedValue({
      email: email, resource: RESOURCE, type: ResourceType.OBJECT, createdBy: SYSTEM_USER, permCodes: ['READ']
    });
    objectAddPermissionsSpy.mockResolvedValue({});
    objectReadSpy.mockResolvedValue({});

    await controller.useInvite(req, res, next);

    expect(bucketAddPermissionsSpy).toHaveBeenCalledTimes(0);
    expect(bucketReadSpy).toHaveBeenCalledTimes(0);
    expect(inviteDeleteSpy).toHaveBeenCalledTimes(1);
    expect(inviteDeleteSpy).toHaveBeenCalledWith(TOKEN);
    expect(inviteReadSpy).toHaveBeenCalledTimes(1);
    expect(inviteReadSpy).toHaveBeenCalledWith(TOKEN);
    expect(objectAddPermissionsSpy).toHaveBeenCalledTimes(1);
    expect(objectReadSpy).toHaveBeenCalledTimes(1);
    expect(objectReadSpy).toHaveBeenCalledWith(RESOURCE);
    expect(next).toHaveBeenCalledTimes(0);
    expect(res.json).toHaveBeenCalledWith({ resource: RESOURCE, type: ResourceType.OBJECT });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should 409 when bucket not found', async () => {
    const email = 'expected@foo.bar';
    const req = {
      currentUser: { tokenPayload: { email: email } },
      params: { token: TOKEN }
    };

    bucketReadSpy.mockRejectedValue({});

    await controller.useInvite(req, res, next);

    expect(bucketAddPermissionsSpy).toHaveBeenCalledTimes(0);
    expect(bucketReadSpy).toHaveBeenCalledTimes(0);
    expect(inviteDeleteSpy).toHaveBeenCalledTimes(0);
    expect(inviteReadSpy).toHaveBeenCalledTimes(1);
    expect(inviteReadSpy).toHaveBeenCalledWith(TOKEN);
    expect(objectAddPermissionsSpy).toHaveBeenCalledTimes(0);
    expect(objectReadSpy).toHaveBeenCalledTimes(0);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('should 200 when bucket grant successful', async () => {
    const email = 'expected@foo.bar';
    const req = {
      currentUser: { tokenPayload: { email: email } },
      params: { token: TOKEN }
    };

    inviteReadSpy.mockResolvedValue({
      email: email, resource: RESOURCE, type: ResourceType.BUCKET, createdBy: SYSTEM_USER, permCodes: ['READ']
    });
    bucketAddPermissionsSpy.mockResolvedValue({});
    bucketReadSpy.mockResolvedValue({});

    await controller.useInvite(req, res, next);

    expect(bucketAddPermissionsSpy).toHaveBeenCalledTimes(1);
    expect(bucketReadSpy).toHaveBeenCalledTimes(1);
    expect(inviteDeleteSpy).toHaveBeenCalledTimes(1);
    expect(inviteDeleteSpy).toHaveBeenCalledWith(TOKEN);
    expect(inviteReadSpy).toHaveBeenCalledTimes(1);
    expect(inviteReadSpy).toHaveBeenCalledWith(TOKEN);
    expect(bucketAddPermissionsSpy).toHaveBeenCalledTimes(1);
    expect(bucketReadSpy).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(0);
    expect(res.json).toHaveBeenCalledWith({ resource: RESOURCE, type: ResourceType.BUCKET });
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should 500 for unexpected errors', async () => {
    const req = { params: { token: TOKEN } };

    inviteReadSpy.mockImplementation(() => { throw new Error(); });

    await controller.useInvite(req, res, next);

    expect(bucketAddPermissionsSpy).toHaveBeenCalledTimes(0);
    expect(bucketReadSpy).toHaveBeenCalledTimes(0);
    expect(inviteDeleteSpy).toHaveBeenCalledTimes(0);
    expect(inviteReadSpy).toHaveBeenCalledTimes(1);
    expect(inviteReadSpy).toHaveBeenCalledWith(TOKEN);
    expect(objectAddPermissionsSpy).toHaveBeenCalledTimes(0);
    expect(objectReadSpy).toHaveBeenCalledTimes(0);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Problem(500));
  });
});
