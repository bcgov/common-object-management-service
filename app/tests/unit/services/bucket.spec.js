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

describe('Check grant permissions', () => {

  it('add permissions', async () => {
    const readUniqueBucketSpy = jest.spyOn(service, 'readUnique');
    const bucket =
    {
      accessKeyId: 'accesskeyid',
      secretAccessKey: 'secretaccesskey'
    };
    readUniqueBucketSpy.mockResolvedValue(bucket);
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.checkGrantPermissions(data, etrx);
  });

});

describe('Create', () => {

  it('insert', async () => {
    const addPermissionSpy = jest.spyOn(bucketPermissionService, 'addPermissions');
    addPermissionSpy.mockResolvedValue({});
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.create(data, etrx);
  });
});

describe('Delete', () => {

  it('delete by id', async () => {
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.delete(bucketId, etrx);
  });
});

describe('Search buckets', () => {

  it('filter', async () => {
    MockModel.mockResolvedValue([{}, {}]);
    service.searchBuckets(params);
  });
});

describe('Read', () => {

  it('find by id', async () => {
    await service.read(bucketId);
  });
});

describe('Read unique', () => {

  it('find by id', async () => {
    await service.readUnique(data);
  });
});

describe('Update', () => {

  it('find by id', async () => {
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.update(data, etrx);
  });
});
