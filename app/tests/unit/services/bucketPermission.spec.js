const { NIL: BUCKET_ID, NIL: OBJECT_ID, NIL: SYSTEM_USER } = require('uuid');

const { resetModel, trxBuilder } = require('../../common/helper');
const BucketPermission = require('../../../src/db/models/tables/bucketPermission');
const ObjectPermission = require('../../../src/db/models/tables/objectPermission');

const bucketPermissionTrx = trxBuilder();
jest.mock('../../../src/db/models/tables/bucketPermission', () => ({
  startTransaction: jest.fn(),
  then: jest.fn(),

  delete: jest.fn(),
  insertAndFetch: jest.fn(),
  modify: jest.fn(),
  query: jest.fn(),
  returning: jest.fn()
}));

const objectPermissionTrx = trxBuilder();
jest.mock('../../../src/db/models/tables/objectPermission', () => ({
  startTransaction: jest.fn(),
  then: jest.fn(),

  distinct: jest.fn(),
  joinRelated: jest.fn(),
  modify: jest.fn(),
  query: jest.fn(),
  select: jest.fn(),
  whereNotNull: jest.fn()
}));

const service = require('../../../src/services/bucketPermission');

const data = [{
  id: OBJECT_ID,
  bucketId: BUCKET_ID,
  path: 'path',
  public: 'true',
  active: 'true',
  createdBy: SYSTEM_USER,
  permCode: 'READ'
}];

beforeEach(() => {
  jest.clearAllMocks();
  resetModel(BucketPermission, bucketPermissionTrx);
  resetModel(ObjectPermission, objectPermissionTrx);
});

describe('addPermissions', () => {
  const searchPermissionsSpy = jest.spyOn(service, 'searchPermissions');

  beforeEach(() => {
    searchPermissionsSpy.mockReset();
  });

  afterAll(() => {
    searchPermissionsSpy.mockRestore();
  });

  it('Grants bucket permissions to users', async () => {
    searchPermissionsSpy.mockResolvedValue([{ userId: SYSTEM_USER, permCode: 'READ' }]);

    await service.addPermissions(BUCKET_ID, data);

    expect(BucketPermission.startTransaction).toHaveBeenCalledTimes(1);
    expect(BucketPermission.insertAndFetch).toHaveBeenCalledTimes(1);
    expect(BucketPermission.insertAndFetch).toBeCalledWith(expect.anything());
    expect(bucketPermissionTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('removePermissions', () => {
  it('Deletes bucket permissions for a user', async () => {
    await service.removePermissions(BUCKET_ID, [SYSTEM_USER]);

    expect(BucketPermission.startTransaction).toHaveBeenCalledTimes(1);
    expect(BucketPermission.delete).toHaveBeenCalledTimes(1);
    expect(BucketPermission.delete).toBeCalledWith();
    expect(BucketPermission.modify).toHaveBeenCalledTimes(3);
    expect(BucketPermission.modify).toBeCalledWith('filterUserId', [SYSTEM_USER]);
    expect(BucketPermission.modify).toBeCalledWith('filterBucketId', BUCKET_ID);
    expect(BucketPermission.returning).toHaveBeenCalledTimes(1);
    expect(BucketPermission.returning).toBeCalledWith('*');
    expect(bucketPermissionTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('listInheritedBucketIds', () => {
  it('Searches for specific (bucket) object permissions', async () => {
    ObjectPermission.then.mockImplementation();

    await service.listInheritedBucketIds();

    expect(ObjectPermission.query).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.select).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.distinct).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.joinRelated).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.modify).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.whereNotNull).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.then).toHaveBeenCalledTimes(1);
  });
});

describe('searchPermissions', () => {
  it('Search and filter for specific bucket permissions', () => {
    service.searchPermissions({ userId: SYSTEM_USER, bucketId: BUCKET_ID, permCode: 'READ' });

    expect(BucketPermission.query).toHaveBeenCalledTimes(1);
    expect(BucketPermission.modify).toHaveBeenCalledTimes(3);
    expect(BucketPermission.modify).toBeCalledWith('filterUserId', SYSTEM_USER);
    expect(BucketPermission.modify).toBeCalledWith('filterBucketId', BUCKET_ID);
    expect(BucketPermission.modify).toBeCalledWith('filterPermissionCode', 'READ');
    expect(BucketPermission.modify).toHaveBeenCalledTimes(3);
  });
});
