const { MockModel, MockTransaction } = require('../../common/dbHelper');

jest.mock('../../../src/db/models/tables/bucket', () => MockModel);

const service = require('../../../src/services/bucket');

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

describe('bucket', () => {
  const checkGrantPermissionsSpy = jest.spyOn(service, 'checkGrantPermissions');
  const createBucketSpy = jest.spyOn(service, 'create');
  const deleteBucketSpy = jest.spyOn(service, 'delete');
  const searchBucketsSpy = jest.spyOn(service, 'searchBuckets');
  const readBucketSpy = jest.spyOn(service, 'read');
  const readUniqueBucketSpy = jest.spyOn(service, 'readUnique');
  const updateBucketSpy = jest.spyOn(service, 'update');

  beforeEach(() => {
    checkGrantPermissionsSpy.mockReset();
    createBucketSpy.mockReset();
    deleteBucketSpy.mockReset();
    searchBucketsSpy.mockReset();
    readBucketSpy.mockReset();
    readUniqueBucketSpy.mockReset();
    updateBucketSpy.mockReset();
  });

  afterAll(() => {
    checkGrantPermissionsSpy.mockRestore();
    createBucketSpy.mockRestore();
    deleteBucketSpy.mockRestore();
    searchBucketsSpy.mockRestore();
    readBucketSpy.mockRestore();
    readUniqueBucketSpy.mockRestore();
    updateBucketSpy.mockRestore();
  });

  it('Check grant permissions', async () => {
    const bucket = { accessKeyId: 'accessKeyId', secretAccessKey: 'secretAccessKey' };
    readUniqueBucketSpy.mockResolvedValue(bucket);
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.checkGrantPermissions(data, etrx);
    expect(checkGrantPermissionsSpy).toHaveBeenCalledTimes(1);
  });

  it('Create bucket', async () => {
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.create(data, etrx);
    expect(createBucketSpy).toHaveBeenCalledTimes(1);
  });

  it('Delete bucket', async () => {
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.delete(bucketId, etrx);
    expect(deleteBucketSpy).toHaveBeenCalledTimes(1);
  });

  it('Search buckets', async () => {
    const bucket = { accessKeyId: 'accessKeyId', secretAccessKey: 'secretAccessKey' };
    searchBucketsSpy.mockResolvedValue(bucket);
    await service.searchBuckets(params);
    expect(searchBucketsSpy).toHaveBeenCalledTimes(1);
  });

  it('Read bucket', async () => {
    await service.read(bucketId);
    expect(readBucketSpy).toHaveBeenCalledTimes(1);
  });

  it('Read bucket unique', async () => {
    await service.readUnique(data);
    expect(readUniqueBucketSpy).toHaveBeenCalledTimes(1);
  });

  it('Update bucket', async () => {
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.update(data, etrx);
    expect(updateBucketSpy).toHaveBeenCalledTimes(1);
  });

});
