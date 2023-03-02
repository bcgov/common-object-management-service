const { MockModel, MockTransaction } = require('../../common/dbHelper');
const { NIL: SYSTEM_USER } = require('uuid');

jest.mock('../../../src/db/models/tables/objectPermission', () => MockModel);

const service = require('../../../src/services/objectPermission');

const bucketId = '00000000-0000-0000-0000-000000000000';
const objectId = '00000000-0000-0000-0000-000000000000';
const userId = '00000000-0000-0000-0000-000000000000';

const data = {
  id: objectId,
  bucketId: bucketId,
  path: 'path',
  public: 'true',
  active: 'true',
  createdBy: userId
};

const params = {
  objId: objectId,
  bucketId: bucketId,
  createdBy: userId,
  permCode: 'READ'
};

beforeEach(() => {
  MockModel.mockReset();
  MockTransaction.mockReset();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Bucket permission', () => {
  const addPermissionsSpy = jest.spyOn(service, 'addPermissions');
  const getObjectIdsWithBucketSpy = jest.spyOn(service, 'getObjectIdsWithBucket');
  const removePermissionsSpy = jest.spyOn(service, 'removePermissions');
  const searchPermissionsSpy = jest.spyOn(service, 'searchPermissions');

  beforeEach(() => {
    addPermissionsSpy.mockReset();
    removePermissionsSpy.mockReset();
    getObjectIdsWithBucketSpy.mockReset();
    searchPermissionsSpy.mockReset();
  });

  afterAll(() => {
    addPermissionsSpy.mockRestore();
    removePermissionsSpy.mockRestore();
    getObjectIdsWithBucketSpy.mockRestore();
    searchPermissionsSpy.mockRestore();
  });

  it('Add permissions', async () => {
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.addPermissions(objectId, data, {currentUserId: SYSTEM_USER}, etrx);
    expect(addPermissionsSpy).toHaveBeenCalledTimes(1);
  });

  it('Get bucket ids with object', async () => {
    await service.getObjectIdsWithBucket();
    expect(getObjectIdsWithBucketSpy).toHaveBeenCalledTimes(1);
  });

  it('Remove permissions', async () => {
    await service.removePermissions(objectId);
    expect(removePermissionsSpy).toHaveBeenCalledTimes(1);
  });

  it('Search permissions', async () => {
    service.searchPermissions(params);
    expect(searchPermissionsSpy).toHaveBeenCalledTimes(1);
  });
});
