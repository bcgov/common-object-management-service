const { MockModel, MockTransaction } = require('../../common/dbHelper');
const { NIL: SYSTEM_USER } = require('uuid');

jest.mock('../../../src/db/models/tables/objectPermission', () => MockModel);
jest.mock('../../../src/db/models/tables/bucketPermission', () => MockModel);

const { Permissions } = require('../../../src/components/constants');

const service = require('../../../src/services/bucketPermission');

const bucketId = '00000000-0000-0000-0000-000000000000';
const objectId = '00000000-0000-0000-0000-000000000000';
const userId = '00000000-0000-0000-0000-000000000000';

const data = [{
  id: objectId,
  bucketId: bucketId,
  path: 'path',
  public: 'true',
  active: 'true',
  createdBy: userId,
  permCode: 'READ'
}];

const params = {
  bucketId: bucketId,
  permCode: 'READ',
  userId: userId
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('searchPermissions', () => {

  it('should filter and return bucket permissions', async () => {
    service.searchPermissions(params);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});

describe('addPermissions', () => {

  it('should search and return bucket permissions', async () => {
    // add userId property
    const dataWithUser = { ...data, userId: userId };

    const perms = Object.values(Permissions).map((p) => ({
      userId: dataWithUser.userId,
      permCode: p
    }));

    const searchPermissionSpy = jest.spyOn(service, 'searchPermissions');
    searchPermissionSpy.mockResolvedValue(perms);

    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.addPermissions(objectId, data, {currentUserId: SYSTEM_USER}, etrx);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });

});

describe('removePermissions', () => {

  it('should delete bucket permissions', async () => {
    await service.removePermissions(objectId);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});

describe('getBucketIdsWithObject', () => {

  it('should return bucket ids with object', async () => {
    MockModel.mockResolvedValue([{}, {}]);
    await service.getBucketIdsWithObject();
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});

