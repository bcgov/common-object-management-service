const { NIL: BUCKET_ID, NIL: SYSTEM_USER } = require('uuid');

const { resetReturnThis } = require('../../common/helper');
const Bucket = require('../../../src/db/models/tables/bucket');

jest.mock('../../../src/db/models/tables/bucket', () => ({
  commit: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),

  allowGraph: jest.fn().mockReturnThis(),
  deleteById: jest.fn().mockReturnThis(),
  findById: jest.fn().mockReturnThis(),
  first: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  modify: jest.fn().mockReturnThis(),
  patchAndFetchById: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  // then: jest.fn().mockReturnThis(),
  throwIfNotFound: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis()
}));

const service = require('../../../src/services/bucket');
const bucketPermissionService = require('../../../src/services/bucketPermission');

const bucketId = BUCKET_ID;
const data = {
  bucketId: BUCKET_ID,
  bucketName: 'bucketName',
  accessKeyId: 'accesskeyid',
  bucket: 'bucket',
  endpoint: 'endpoint',
  key: 'key',
  secretAccessKey: 'secretaccesskey',
  region: 'region',
  active: 'true',
  createdBy: SYSTEM_USER,
  userId: SYSTEM_USER
};

beforeEach(() => {
  jest.clearAllMocks();
  resetReturnThis(Bucket);
});

describe('checkGrantPermissions', () => {
  const readUniqueSpy = jest.spyOn(service, 'readUnique');

  beforeEach(() => {
    readUniqueSpy.mockReset();
  });

  afterAll(() => {
    readUniqueSpy.mockRestore();
  });

  it('Grants a user full permissions to the bucket if the data precisely matches', async () => {
    readUniqueSpy.mockResolvedValue({ accessKeyId: data.accessKeyId, secretAccessKey: data.secretAccessKey });

    await service.checkGrantPermissions(data);

    expect(Bucket.startTransaction).toHaveBeenCalledTimes(1);
    expect(Bucket.commit).toHaveBeenCalledTimes(1);
  });
});

describe('create', () => {
  const addPermissionsSpy = jest.spyOn(bucketPermissionService, 'addPermissions');

  beforeEach(() => {
    addPermissionsSpy.mockReset();
  });

  afterAll(() => {
    addPermissionsSpy.mockRestore();
  });

  it('Create a bucket record and give the uploader (if authed) permissions', async () => {
    addPermissionsSpy.mockResolvedValue({ ...data });

    await service.create(data);

    expect(Bucket.startTransaction).toHaveBeenCalledTimes(1);
    expect(Bucket.query).toHaveBeenCalledTimes(1);
    expect(Bucket.insert).toHaveBeenCalledTimes(1);
    expect(Bucket.insert).toBeCalledWith(expect.anything());
    expect(Bucket.returning).toHaveBeenCalledTimes(1);
    expect(Bucket.returning).toBeCalledWith('*');
    expect(Bucket.commit).toHaveBeenCalledTimes(1);
  });
});

describe('delete', () => {
  it('Delete a bucket record, this will also delete all objects and permissions', async () => {
    await service.delete(bucketId);

    expect(Bucket.startTransaction).toHaveBeenCalledTimes(1);
    expect(Bucket.query).toHaveBeenCalledTimes(1);
    expect(Bucket.deleteById).toHaveBeenCalledTimes(1);
    expect(Bucket.deleteById).toBeCalledWith(bucketId);
    expect(Bucket.throwIfNotFound).toHaveBeenCalledTimes(1);
    expect(Bucket.throwIfNotFound).toBeCalledWith();
    expect(Bucket.returning).toHaveBeenCalledTimes(1);
    expect(Bucket.returning).toBeCalledWith('*');
    expect(Bucket.commit).toHaveBeenCalledTimes(1);
  });
});

// describe('searchBuckets', () => {
//   it('search and filter for specific bucket records', () => {
//     Bucket.then.mockImplementation();

//     service.searchBuckets([]);

//     expect(Bucket.query).toHaveBeenCalledTimes(1);
//     expect(Bucket.allowGraph).toHaveBeenCalledTimes(1);
//     expect(Bucket.modify).toHaveBeenCalledTimes(5);
//     expect(Bucket.then).toHaveBeenCalledTimes(1);
//   });
// });

describe('read', () => {
  it('Get a bucket db record based on bucketId', () => {
    service.read(bucketId);

    expect(Bucket.query).toHaveBeenCalledTimes(1);
    expect(Bucket.findById).toHaveBeenCalledTimes(1);
    expect(Bucket.findById).toBeCalledWith(bucketId);
    expect(Bucket.throwIfNotFound).toHaveBeenCalledTimes(1);
    expect(Bucket.throwIfNotFound).toBeCalledWith();
  });
});

describe('readUnique', () => {
  it('Get a bucket db record based on unique parameters', () => {
    service.readUnique(data);

    expect(Bucket.query).toHaveBeenCalledTimes(1);
    expect(Bucket.where).toHaveBeenCalledTimes(3);
    expect(Bucket.where).toBeCalledWith('bucket', expect.any(String));
    expect(Bucket.where).toBeCalledWith('endpoint', expect.any(String));
    expect(Bucket.where).toBeCalledWith('key', expect.any(String));
    expect(Bucket.first).toHaveBeenCalledTimes(1);
    expect(Bucket.first).toBeCalledWith();
    expect(Bucket.throwIfNotFound).toHaveBeenCalledTimes(1);
    expect(Bucket.throwIfNotFound).toBeCalledWith();
  });
});

describe('update', () => {
  it('Update a bucket DB record', async () => {
    await service.update(data);

    expect(Bucket.startTransaction).toHaveBeenCalledTimes(1);
    expect(Bucket.query).toHaveBeenCalledTimes(1);
    expect(Bucket.patchAndFetchById).toHaveBeenCalledTimes(1);
    expect(Bucket.patchAndFetchById).toBeCalledWith(data.bucketId, {
      bucketName: data.bucketName,
      accessKeyId: data.accessKeyId,
      bucket: data.bucket,
      endpoint: data.endpoint,
      key: data.key,
      secretAccessKey: data.secretAccessKey,
      region: data.region,
      active: data.active,
      updatedBy: data.userId
    });
    expect(Bucket.commit).toHaveBeenCalledTimes(1);
  });
});
