const { NIL: BUCKET_ID, NIL: OBJECT_ID, NIL: SYSTEM_USER } = require('uuid');

const { resetModel, trxBuilder } = require('../../common/helper');
const BucketPermission = require('../../../src/db/models/tables/bucketPermission');
const ObjectPermission = require('../../../src/db/models/tables/objectPermission');

const bucketPermissionTrx = trxBuilder();
jest.mock('../../../src/db/models/tables/bucketPermission', () => ({
  startTransaction: jest.fn(),
  then: jest.fn(),

  distinct: jest.fn(),
  rightJoin: jest.fn(),
  modify: jest.fn(),
  query: jest.fn(),
}));

const objectPermissionTrx = trxBuilder();
jest.mock('../../../src/db/models/tables/objectPermission', () => ({
  startTransaction: jest.fn(),
  then: jest.fn(),

  delete: jest.fn(),
  insertAndFetch: jest.fn(),
  modify: jest.fn(),
  query: jest.fn(),
  returning: jest.fn()
}));

const service = require('../../../src/services/objectPermission');

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

  it('Grants object permissions to users', async () => {
    searchPermissionsSpy.mockResolvedValue([{ userId: SYSTEM_USER, permCode: 'READ' }]);

    await service.addPermissions(OBJECT_ID, [{
      id: OBJECT_ID,
      bucketId: BUCKET_ID,
      path: 'path',
      public: 'true',
      active: 'true',
      createdBy: SYSTEM_USER,
      permCode: 'READ'
    }]);

    expect(ObjectPermission.startTransaction).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.query).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.insertAndFetch).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.insertAndFetch).toBeCalledWith(expect.any(Object));
    expect(objectPermissionTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('listInheritedObjectIds', () => {
  it('searches for specific (object) bucket permissions', async () => {
    BucketPermission.then.mockImplementation();

    await service.listInheritedObjectIds();

    expect(BucketPermission.distinct).toHaveBeenCalledTimes(1);
    expect(BucketPermission.rightJoin).toHaveBeenCalledTimes(1);
    expect(BucketPermission.modify).toHaveBeenCalledTimes(2);
    expect(BucketPermission.then).toHaveBeenCalledTimes(1);
  });
});

describe('removePermissions', () => {
  it('Deletes object permissions for a user', async () => {
    await service.removePermissions(OBJECT_ID, [SYSTEM_USER]);

    expect(ObjectPermission.startTransaction).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.query).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.delete).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.delete).toBeCalledWith();
    expect(ObjectPermission.modify).toHaveBeenCalledTimes(3);
    expect(ObjectPermission.modify).toBeCalledWith('filterUserId', [SYSTEM_USER]);
    expect(ObjectPermission.modify).toBeCalledWith('filterObjectId', OBJECT_ID);
    expect(ObjectPermission.returning).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.returning).toBeCalledWith('*');
    expect(objectPermissionTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('SearchPermissions', () => {
  it('search and filter for specific object permissions', async () => {
    await service.searchPermissions({ bucketId: BUCKET_ID, userId: SYSTEM_USER, objId: OBJECT_ID, permCode: 'READ' });

    expect(ObjectPermission.query).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.modify).toBeCalledWith('filterBucketId', BUCKET_ID);
    expect(ObjectPermission.modify).toBeCalledWith('filterUserId', SYSTEM_USER);
    expect(ObjectPermission.modify).toBeCalledWith('filterObjectId', OBJECT_ID);
    expect(ObjectPermission.modify).toBeCalledWith('filterPermissionCode', 'READ');
    expect(ObjectPermission.modify).toHaveBeenCalledTimes(4);
  });
});
