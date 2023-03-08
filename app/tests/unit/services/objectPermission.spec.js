const { MockModel, MockTransaction } = require('../../common/dbHelper');
const { NIL: SYSTEM_USER } = require('uuid');

jest.mock('../../../src/db/models/tables/objectPermission', () => MockModel);
jest.mock('../../../src/db/models/tables/bucketPermission', () => MockModel);

const { Permissions } = require('../../../src/components/constants');

const service = require('../../../src/services/objectPermission');

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
  objId: objectId,
  bucketId: bucketId,
  createdBy: userId,
  permCode: 'READ',
  userId: userId
};

beforeEach(() => {
  MockModel.mockReset();
  MockTransaction.mockReset();
});

afterEach(() => {
  jest.clearAllMocks();
});


describe('addPermissions', () => {

  it('should search and add object permissions', async () => {
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

describe('getObjectIdsWithBucket', () => {

  it('should get object ids with bucket', async () => {
    MockModel.mockResolvedValue([{}, {}]);
    await service.getObjectIdsWithBucket();
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});

describe('removePermissions', () => {

  it('should delete object permissions', async () => {
    await service.removePermissions(objectId);
    expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});

describe('searchPermissions', () => {

  it('should find and return object permissions', async () => {
    MockModel.mockResolvedValue({
      objId: objectId,
      bucketId: bucketId,
      createdBy: userId,
      permCode: 'READ',
      userId: userId
    });
    service.searchPermissions(params);
    // expect(MockModel.query).toHaveBeenCalledTimes(1);
  });
});
