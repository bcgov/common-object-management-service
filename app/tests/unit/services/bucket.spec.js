const { MockModel, MockTransaction } = require('../../common/dbHelper');

jest.mock('../../../src/db/models/tables/bucket', () => MockModel);

const service = require('../../../src/services/bucket');
const bucketPermissionService = require('../../../src/services/bucketPermission');

const bucketId = '00000000-0000-0000-0000-000000000000';
const userId = '00000000-0000-0000-0000-000000000000';

const data = {
  bucketId: bucketId,
  bucketName: 'bucketName',
  accessKeyId: 'accesskeyid',
  bucket: 'bucket',
  endpoint: 'endpoint',
  key: 'key',
  secretAccessKey: 'secretaccesskey',
  region: 'region',
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
  jest.resetAllMocks();
});

describe('create', () => {

  it('should insert bucket model', async () => {
    const addPermissionSpy = jest.spyOn(bucketPermissionService, 'addPermissions');
    MockModel.mockResolvedValue(undefined);
    addPermissionSpy.mockResolvedValue({});
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.create(data, etrx);
    expect(addPermissionSpy).toHaveBeenCalledTimes(1);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});

describe('delete', () => {

  it.skip('should delete bucket by bucket id', async () => {
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.delete(bucketId, etrx);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});

describe('checkGrantPermissions', () => {

  it('should add bucket permissions', async () => {
    const readUniqueBucketSpy = jest.spyOn(service, 'readUnique');
    const bucket =
    {
      accessKeyId: 'accesskeyid',
      secretAccessKey: 'secretaccesskey'
    };
    MockModel.mockResolvedValue(undefined);
    readUniqueBucketSpy.mockResolvedValue(bucket);
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.checkGrantPermissions(data, etrx);
    expect(readUniqueBucketSpy).toHaveBeenCalledTimes(1);
  });

});

describe('searchBuckets', () => {

  it.skip('should filter object model', async () => {
    MockModel.mockResolvedValue([{}, {}]);
    service.searchBuckets(params);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});

describe('read', () => {

  it.skip('should find and return bucket by bucket id', async () => {
    await service.read(bucketId);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});

describe('readUnique', () => {

  it.skip('should find and return bucket by bucket id', async () => {
    await service.readUnique(data);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});

describe('update', () => {

  it.skip('should find bucket and update with new values', async () => {
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.update(data, etrx);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});
