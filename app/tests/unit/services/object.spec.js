const { NIL: BUCKET_ID, NIL: OBJECT_ID, NIL: SYSTEM_USER } = require('uuid');

const { resetReturnThis } = require('../../common/helper');
const ObjectModel = require('../../../src/db/models/tables/objectModel');

jest.mock('../../../src/db/models/tables/objectModel', () => ({
  commit: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),

  allowGraph: jest.fn().mockReturnThis(),
  deleteById: jest.fn().mockReturnThis(),
  findById: jest.fn().mockReturnThis(),
  first: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  joinRelated: jest.fn().mockReturnThis(),
  modify: jest.fn().mockReturnThis(),
  patchAndFetchById: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  // then: jest.fn().mockReturnThis(),
  throwIfNotFound: jest.fn().mockReturnThis()
}));

const service = require('../../../src/services/object');
const objectPermissionService = require('../../../src/services/objectPermission');

const bucketId = BUCKET_ID;
const objectId = OBJECT_ID;
const userId = SYSTEM_USER;
const data = {
  id: objectId,
  bucketId: bucketId,
  path: 'path',
  public: 'true',
  active: 'true',
  createdBy: userId,
  userId: userId
};

beforeEach(() => {
  jest.clearAllMocks();
  resetReturnThis(ObjectModel);
});

describe('create', () => {
  const addPermissionsSpy = jest.spyOn(objectPermissionService, 'addPermissions');

  beforeEach(() => {
    addPermissionsSpy.mockReset();
  });

  afterAll(() => {
    addPermissionsSpy.mockRestore();
  });

  it('Create an object db record and give the uploader (if authed) permissions', async () => {
    addPermissionsSpy.mockResolvedValue({});

    await service.create({ ...data, userId: userId });

    expect(ObjectModel.startTransaction).toHaveBeenCalledTimes(1);
    expect(ObjectModel.query).toHaveBeenCalledTimes(1);
    expect(ObjectModel.query).toHaveBeenCalledWith(expect.anything());
    expect(ObjectModel.insert).toHaveBeenCalledTimes(1);
    expect(ObjectModel.insert).toBeCalledWith(expect.anything());
    expect(ObjectModel.returning).toHaveBeenCalledTimes(1);
    expect(ObjectModel.returning).toBeCalledWith('*');
    expect(ObjectModel.commit).toHaveBeenCalledTimes(1);
  });
});

describe('delete', () => {
  it('Delete an object record', async () => {
    await service.delete(objectId);

    expect(ObjectModel.startTransaction).toHaveBeenCalledTimes(1);
    expect(ObjectModel.query).toHaveBeenCalledTimes(1);
    expect(ObjectModel.query).toHaveBeenCalledWith(expect.anything());
    expect(ObjectModel.deleteById).toHaveBeenCalledTimes(1);
    expect(ObjectModel.deleteById).toBeCalledWith(objectId);
    expect(ObjectModel.throwIfNotFound).toHaveBeenCalledTimes(1);
    expect(ObjectModel.throwIfNotFound).toBeCalledWith();
    expect(ObjectModel.returning).toHaveBeenCalledTimes(1);
    expect(ObjectModel.returning).toBeCalledWith('*');
    expect(ObjectModel.commit).toHaveBeenCalledTimes(1);
  });
});

describe('getBucketKey', () => {
  it('Gets the associated key path for a specific object record', () => {
    service.getBucketKey(objectId);

    expect(ObjectModel.query).toHaveBeenCalledTimes(1);
    expect(ObjectModel.findById).toHaveBeenCalledTimes(1);
    expect(ObjectModel.findById).toBeCalledWith(objectId);
    expect(ObjectModel.select).toHaveBeenCalledTimes(1);
    expect(ObjectModel.select).toBeCalledWith('bucket.key');
    expect(ObjectModel.joinRelated).toHaveBeenCalledTimes(1);
    expect(ObjectModel.joinRelated).toBeCalledWith('bucket');
    expect(ObjectModel.first).toHaveBeenCalledTimes(1);
    expect(ObjectModel.first).toBeCalledWith();
    expect(ObjectModel.throwIfNotFound).toHaveBeenCalledTimes(1);
    expect(ObjectModel.throwIfNotFound).toBeCalledWith();
  });
});

// describe('searchObjects', () => {
//   it('Search and filter for specific object records', () => {
//     ObjectModel.then.mockImplementation(() => { });

//     service.searchObjects({
//       bucketId: bucketId,
//       bucketName: 'bucketName',
//       active: 'true',
//       key: 'key',
//       userId: userId
//     });

//     expect(ObjectModel.query).toHaveBeenCalledTimes(1);
//     expect(ObjectModel.allowGraph).toHaveBeenCalledTimes(1);
//     expect(ObjectModel.modify).toHaveBeenCalledTimes(10);
//     expect(ObjectModel.then).toHaveBeenCalledTimes(1);
//   });
// });

describe('read', () => {
  it('Get an object db record', () => {
    service.read(objectId);

    expect(ObjectModel.query).toHaveBeenCalledTimes(1);
    expect(ObjectModel.findById).toHaveBeenCalledTimes(1);
    expect(ObjectModel.findById).toBeCalledWith(objectId);
    expect(ObjectModel.throwIfNotFound).toHaveBeenCalledTimes(1);
    expect(ObjectModel.throwIfNotFound).toBeCalledWith();
  });
});

describe('update', () => {
  it('Update an object DB record', async () => {
    await service.update({ ...data });

    expect(ObjectModel.startTransaction).toHaveBeenCalledTimes(1);
    expect(ObjectModel.query).toHaveBeenCalledTimes(1);
    expect(ObjectModel.patchAndFetchById).toHaveBeenCalledTimes(1);
    expect(ObjectModel.patchAndFetchById).toBeCalledWith(data.id, {
      path: data.path,
      public: data.public,
      active: data.active,
      updatedBy: data.userId
    });
    expect(ObjectModel.commit).toHaveBeenCalledTimes(1);
  });
});
