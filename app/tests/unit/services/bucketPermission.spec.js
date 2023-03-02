const { MockModel, MockTransaction } = require('../../common/dbHelper');
const { NIL: SYSTEM_USER } = require('uuid');

jest.mock('../../../src/db/models/tables/bucketPermission', () => MockModel);

const service = require('../../../src/services/bucketPermission');

const bucketId = '00000000-0000-0000-0000-000000000000';
const userId = '00000000-0000-0000-0000-000000000000';

const data = {
  bucketId: bucketId,
  bucketName: 'bucketName',
  accessKeyId: 'accessKeyId',
  bucket: 'bucket',
  endpoint: 'endpoint',
  key: 'key',
  secretAccessKey: 'secretAccessKey',
  region: 'region',
  active: 'true',
  createdBy: undefined,
  userId: userId
};

const params = {
  bucketId: bucketId,
  userId: userId,
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
  const removePermissionsSpy = jest.spyOn(service, 'removePermissions');
  const getBucketIdsWithObjectSpy = jest.spyOn(service, 'getBucketIdsWithObject');
  const searchPermissionsSpy = jest.spyOn(service, 'searchPermissions');

  beforeEach(() => {
    addPermissionsSpy.mockReset();
    removePermissionsSpy.mockReset();
    getBucketIdsWithObjectSpy.mockReset();
    searchPermissionsSpy.mockReset();
  });

  afterAll(() => {
    addPermissionsSpy.mockRestore();
    removePermissionsSpy.mockRestore();
    getBucketIdsWithObjectSpy.mockRestore();
    searchPermissionsSpy.mockRestore();
  });

  it('Add permissions', async () => {
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.addPermissions(bucketId, data, {currentUserId: SYSTEM_USER}, etrx);
    expect(addPermissionsSpy).toHaveBeenCalledTimes(1);
  });

  it('Add permissions - no bucketId', async () => {
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.addPermissions(null, data, {currentUserId: SYSTEM_USER}, etrx);
    expect(addPermissionsSpy).toHaveBeenCalledWith(null, data, {currentUserId: SYSTEM_USER}, etrx);
    expect(addPermissionsSpy).toHaveBeenCalledTimes(1);
  });

  it('Add permissions - no data', async () => {
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.addPermissions(bucketId, null, {currentUserId: SYSTEM_USER}, etrx);
    expect(addPermissionsSpy).toHaveBeenCalledTimes(1);
  });

  it('Remove permissions', async () => {
    await service.removePermissions(bucketId);
    expect(removePermissionsSpy).toHaveBeenCalledTimes(1);
  });

  it('Get bucket ids with object', async () => {
    await service.getBucketIdsWithObject(userId);
    expect(getBucketIdsWithObjectSpy).toHaveBeenCalledTimes(1);
  });

  it('Search permissions', async () => {
    service.searchPermissions(params);
    expect(searchPermissionsSpy).toHaveBeenCalledTimes(1);
  });
});
