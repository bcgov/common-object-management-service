const { NIL: BUCKET_ID, NIL: OBJECT_ID, NIL: SYSTEM_USER } = require('uuid');

const { resetReturnThis } = require('../../common/helper');
const BucketPermission = require('../../../src/db/models/tables/bucketPermission');
const ObjectPermission = require('../../../src/db/models/tables/objectPermission');

jest.mock('../../../src/db/models/tables/bucketPermission', () => ({
  commit: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),

  delete: jest.fn().mockReturnThis(),
  insertAndFetch: jest.fn().mockReturnThis(),
  modify: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis()
}));
jest.mock('../../../src/db/models/tables/objectPermission', () => ({
  commit: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),

  // query: jest.fn().mockReturnThis(),
  // then: jest.fn().mockReturnThis(), // TODO: kicks off a timeout error
}));

const service = require('../../../src/services/bucketPermission');

const bucketId = BUCKET_ID;
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
  resetReturnThis(BucketPermission);
  resetReturnThis(ObjectPermission);
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
    searchPermissionsSpy.mockReturnValue([{ userId: SYSTEM_USER, permCode: 'READ'}]);
    await service.addPermissions(BUCKET_ID, data);

    expect(BucketPermission.startTransaction).toHaveBeenCalledTimes(1);
    expect(BucketPermission.insertAndFetch).toHaveBeenCalledTimes(1);
    expect(BucketPermission.insertAndFetch).toBeCalledWith(expect.anything());
    expect(BucketPermission.commit).toHaveBeenCalledTimes(1);
  });
});

describe('removePermissions', () => {

  it('Deletes bucket permissions for a user', async () => {
    await service.removePermissions(bucketId, [ SYSTEM_USER ]);

    expect(BucketPermission.startTransaction).toHaveBeenCalledTimes(1);
    expect(BucketPermission.delete).toHaveBeenCalledTimes(1);
    expect(BucketPermission.delete).toBeCalledWith();
    expect(BucketPermission.modify).toHaveBeenCalledTimes(3);
    expect(BucketPermission.modify).toBeCalledWith('filterUserId', [ SYSTEM_USER ]);
    expect(BucketPermission.modify).toBeCalledWith('filterBucketId', bucketId);
    expect(BucketPermission.returning).toHaveBeenCalledTimes(1);
    expect(BucketPermission.returning).toBeCalledWith('*');
    expect(BucketPermission.commit).toHaveBeenCalledTimes(1);
  });
});

// describe('getBucketIdsWithObject', () => {

//   it('Searches for specific (bucket) object permissions', async () => {
//     await service.getBucketIdsWithObject();

//     // expect(ObjectPermission.query).toHaveBeenCalledTimes(1);
//     // expect(ObjectPermission.select).toHaveBeenCalledTimes(3);
//     // expect(ObjectPermission.distinct).toHaveBeenCalledTimes(1);
//     // expect(ObjectPermission.joinRelated).toHaveBeenCalledTimes(1);
//     // expect(ObjectPermission.modify).toHaveBeenCalledTimes(1);
//     // expect(ObjectPermission.whereNotNull).toHaveBeenCalledTimes(1);
//   });
// });

describe('searchPermissions', () => {

  it('Search and filter for specific bucket permissions', () => {
    service.searchPermissions({ userId: SYSTEM_USER, bucketId: bucketId, permCode: 'READ' });

    expect(BucketPermission.query).toHaveBeenCalledTimes(1);
    expect(BucketPermission.modify).toHaveBeenCalledTimes(3);
    expect(BucketPermission.modify).toBeCalledWith('filterUserId', SYSTEM_USER);
    expect(BucketPermission.modify).toBeCalledWith('filterBucketId', bucketId);
    expect(BucketPermission.modify).toBeCalledWith('filterPermissionCode', 'READ');
    expect(BucketPermission.modify).toHaveBeenCalledTimes(3);
  });
});
