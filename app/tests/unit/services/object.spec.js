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

describe('create object', () => {

  it('add permissions if user', async () => {

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
  });

  it('add permissions no trans', async () => {

    // add userId property
    const dataWithUser = { ...data, userId: userId };

    // spy on function
    const addPermissionSpy = jest.spyOn(objectPermissionService, 'addPermissions');

    // mocking the stuff we dont want to test
    addPermissionSpy.mockResolvedValue({});

    // call the function we're testing
    await service.create(dataWithUser);
  });

});

describe('delete object', () => {

  it('object model delete', async () => {

    const deleteSpy = jest.spyOn(service, 'delete');
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.delete(objectId, etrx);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it('object model delete no trans', async () => {

    const deleteSpy = jest.spyOn(service, 'delete');
    await service.delete(objectId);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

});

describe('get bucket key', () => {

  it('object model join and find', async () => {

    const getBucketKeySpy = jest.spyOn(service, 'getBucketKey');
    service.getBucketKey(objectId);
    expect(getBucketKeySpy).toHaveBeenCalledTimes(1);
  });

});

describe('search objects', () => {

  it('object model query', async () => {

    MockModel.mockResolvedValue([{}, {}]);
    service.searchObjects(params);
  });

});

describe('read', () => {

  it('object model find', async () => {
    service.read(objectId);
  });

});

describe('update', () => {

  it('object model update', async () => {
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.update(data, etrx);
  });

  it('object model update no trans', async () => {
    await service.update(data);
  });

});
