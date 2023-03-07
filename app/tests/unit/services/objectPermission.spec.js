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


describe('add permissions', () => {

  it('search permissions', async () => {
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
  });

});

describe('get object ids with bucket', () => {

  it('bucket permission', async () => {
    MockModel.mockResolvedValue([{}, {}]);
    await service.getObjectIdsWithBucket();
  });
});

describe('remove permissions', () => {

  it('delete', async () => {
    await service.removePermissions(objectId);
  });
});

describe('search permissions', () => {

  it('filter', async () => {
    MockModel.mockResolvedValue({
      objId: objectId,
      bucketId: bucketId,
      createdBy: userId,
      permCode: 'READ',
      userId: userId
    });
    service.searchPermissions(params);
  });
});
