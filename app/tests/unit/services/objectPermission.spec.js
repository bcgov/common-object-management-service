const { NIL: BUCKET_ID, NIL: OBJECT_ID, NIL: SYSTEM_USER } = require('uuid');

const { resetReturnThis } = require('../../common/helper');
const BucketPermission = require('../../../src/db/models/tables/bucketPermission');
const ObjectPermission = require('../../../src/db/models/tables/objectPermission');

jest.mock('../../../src/db/models/tables/bucketPermission', () => ({
  commit: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),

  distinct: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis()
}));
jest.mock('../../../src/db/models/tables/objectPermission', () => ({
  commit: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),

  delete: jest.fn().mockReturnThis(),
  insertAndFetch: jest.fn().mockReturnThis(),
  modify: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  // then: jest.fn().mockReturnThis()
}));

const service = require('../../../src/services/objectPermission');

const bucketId = BUCKET_ID;
const objectId = OBJECT_ID;
const userId = SYSTEM_USER;

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

  it('Grants object permissions to users', async () => {
    searchPermissionsSpy.mockReturnValue([{ userId: SYSTEM_USER, permCode: 'READ'}]);
    await service.addPermissions(objectId, [{
      id: objectId,
      bucketId: bucketId,
      path: 'path',
      public: 'true',
      active: 'true',
      createdBy: userId,
      permCode: 'READ'
    }]);

    expect(ObjectPermission.startTransaction).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.query).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.insertAndFetch).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.insertAndFetch).toBeCalledWith(expect.any(Object));
    expect(ObjectPermission.commit).toHaveBeenCalledTimes(1);
  });
});

// describe('getObjectIdsWithBucket', () => {

//   it('searches for specific (object) bucket permissions', async () => {
//     await service.getObjectIdsWithBucket();

//     expect(ObjectPermission.distinct).toHaveBeenCalledTimes(1);
//     expect(ObjectPermission.rightJoin).toHaveBeenCalledTimes(1);
//     expect(ObjectPermission.modify).toHaveBeenCalledTimes(1);
//     expect(ObjectPermission.then).toHaveBeenCalledTimes(1);
//   });
// });

describe('removePermissions', () => {

  it('Deletes object permissions for a user', async () => {
    await service.removePermissions(objectId, [ SYSTEM_USER ]);

    expect(ObjectPermission.startTransaction).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.query).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.delete).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.delete).toBeCalledWith();
    expect(ObjectPermission.modify).toHaveBeenCalledTimes(3);
    expect(ObjectPermission.modify).toBeCalledWith('filterUserId', [ SYSTEM_USER ]);
    expect(ObjectPermission.modify).toBeCalledWith('filterObjectId', objectId);
    expect(ObjectPermission.returning).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.returning).toBeCalledWith('*');
    expect(ObjectPermission.commit).toHaveBeenCalledTimes(1);
  });
});

describe('SearchPermissions', () => {

  it('search and filter for specific object permissions', async () => {
    await service.searchPermissions({bucketId: BUCKET_ID, userId: SYSTEM_USER, objId: OBJECT_ID, permCode: 'READ'});

    expect(ObjectPermission.query).toHaveBeenCalledTimes(1);
    expect(ObjectPermission.modify).toBeCalledWith('filterBucketId', BUCKET_ID);
    expect(ObjectPermission.modify).toBeCalledWith('filterUserId', SYSTEM_USER);
    expect(ObjectPermission.modify).toBeCalledWith('filterObjectId', OBJECT_ID);
    expect(ObjectPermission.modify).toBeCalledWith('filterPermissionCode', 'READ');
    expect(ObjectPermission.modify).toHaveBeenCalledTimes(4);
  });
});
