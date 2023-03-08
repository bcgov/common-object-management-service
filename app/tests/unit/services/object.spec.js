const { MockModel, MockTransaction } = require('../../common/dbHelper');

jest.mock('../../../src/db/models/tables/objectModel', () => MockModel);

const service = require('../../../src/services/object');
const objectPermissionService = require('../../../src/services/objectPermission');

const { Permissions } = require('../../../src/components/constants');

const bucketId = '00000000-0000-0000-0000-000000000000';
const objectId = '00000000-0000-0000-0000-000000000123';
const userId = '00000000-0000-0000-0000-000000000000';

const data = {
  id: objectId,
  bucketId: bucketId,
  path: 'path',
  public: 'true',
  active: 'true',
  createdBy: userId,
  userId: userId
};

const params = {
  bucketId: bucketId,
  bucketName: 'bucketName',
  active: 'true',
  key: 'key',
  userId: userId
};

beforeEach(() => {
  MockModel.mockReset();
  MockTransaction.mockReset();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('create', () => {

  it('should add object permissions if user exists', async () => {

    // add userId property
    const dataWithUser = { ...data, userId: userId };

    // create perms object
    const perms = Object.values(Permissions).map((p) => ({
      userId: dataWithUser.userId,
      permCode: p
    }));

    // spy on function
    const addPermissionSpy = jest.spyOn(objectPermissionService, 'addPermissions');

    // mocking the stuff we dont want to test
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    addPermissionSpy.mockResolvedValue({});

    // call the function we're testing
    await service.create(dataWithUser, etrx);

    // the tests:
    // userId was passed, so addPermissions was called
    expect(addPermissionSpy).toHaveBeenCalledTimes(1);
    // addPermissions was called with expected paramters
    expect(addPermissionSpy).toHaveBeenCalledWith(objectId, perms, userId, etrx);
    // expect(MockModel.query).toHaveBeenCalledTimes(1);
  });

  it.skip('should add object permissions, no transaction provided', async () => {

    // add userId property
    const dataWithUser = { ...data, userId: userId };

    // spy on function
    const addPermissionSpy = jest.spyOn(objectPermissionService, 'addPermissions');

    // mocking the stuff we dont want to test
    addPermissionSpy.mockResolvedValue({});

    // call the function we're testing
    await service.create(dataWithUser);
    // expect(MockModel.query).toHaveBeenCalledTimes(1);
    expect(MockTransaction.query).toHaveBeenCalledTimes(1);
  });
});

describe('delete', () => {

  it('should delete object', async () => {

    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.delete(objectId, etrx);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});

describe('getBucketKey', () => {

  it('should find and return bucket key', async () => {

    service.getBucketKey(objectId);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});

describe('searchObjects', () => {

  it('should find and return objects', async () => {

    MockModel.mockResolvedValue([{}, {}]);
    service.searchObjects(params);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});

describe('read', () => {

  it('should find and return object model find', async () => {
    service.read(objectId);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});

describe('update', () => {

  it('should update object with new values', async () => {
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.update(data, etrx);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });

  it('should update object model update no transaction', async () => {
    await service.update(data);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});
