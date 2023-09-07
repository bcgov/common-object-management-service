const { NIL: BUCKET_ID, NIL: OBJECT_ID, NIL: SYSTEM_USER } = require('uuid');

const { resetModel, trxBuilder } = require('../../common/helper');
const ObjectModel = require('../../../src/db/models/tables/objectModel');

const objectModelTrx = trxBuilder();
jest.mock('../../../src/db/models/tables/objectModel', () => ({
  startTransaction: jest.fn(),
  then: jest.fn(),

  allowGraph: jest.fn(),
  deleteById: jest.fn(),
  findById: jest.fn(),
  first: jest.fn(),
  insert: jest.fn(),
  joinRelated: jest.fn(),
  modify: jest.fn(),
  patchAndFetchById: jest.fn(),
  query: jest.fn(),
  returning: jest.fn(),
  select: jest.fn(),
  throwIfNotFound: jest.fn()
}));

const service = require('../../../src/services/object');
const objectPermissionService = require('../../../src/services/objectPermission');

const data = {
  id: OBJECT_ID,
  bucketId: BUCKET_ID,
  path: 'path',
  public: 'true',
  active: 'true',
  createdBy: SYSTEM_USER,
  userId: SYSTEM_USER
};

beforeEach(() => {
  jest.clearAllMocks();
  resetModel(ObjectModel, objectModelTrx);
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

    await service.create({ ...data, userId: SYSTEM_USER });

    expect(ObjectModel.startTransaction).toHaveBeenCalledTimes(1);
    expect(ObjectModel.query).toHaveBeenCalledTimes(1);
    expect(ObjectModel.query).toHaveBeenCalledWith(expect.anything());
    expect(ObjectModel.insert).toHaveBeenCalledTimes(1);
    expect(ObjectModel.insert).toBeCalledWith(expect.anything());
    expect(ObjectModel.returning).toHaveBeenCalledTimes(1);
    expect(ObjectModel.returning).toBeCalledWith('*');
    expect(objectModelTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('delete', () => {
  it('Delete an object record', async () => {
    await service.delete(OBJECT_ID);

    expect(ObjectModel.startTransaction).toHaveBeenCalledTimes(1);
    expect(ObjectModel.query).toHaveBeenCalledTimes(1);
    expect(ObjectModel.query).toHaveBeenCalledWith(expect.anything());
    expect(ObjectModel.deleteById).toHaveBeenCalledTimes(1);
    expect(ObjectModel.deleteById).toBeCalledWith(OBJECT_ID);
    expect(ObjectModel.throwIfNotFound).toHaveBeenCalledTimes(1);
    expect(ObjectModel.throwIfNotFound).toBeCalledWith();
    expect(ObjectModel.returning).toHaveBeenCalledTimes(1);
    expect(ObjectModel.returning).toBeCalledWith('*');
    expect(objectModelTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('getBucketKey', () => {
  it('Gets the associated key path for a specific object record', () => {
    service.getBucketKey(OBJECT_ID);

    expect(ObjectModel.query).toHaveBeenCalledTimes(1);
    expect(ObjectModel.findById).toHaveBeenCalledTimes(1);
    expect(ObjectModel.findById).toBeCalledWith(OBJECT_ID);
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

describe('searchObjects', () => {
  it('Search and filter for specific object records', async () => {
    ObjectModel.then.mockImplementation(() => { });
    const params = {
      bucketId: BUCKET_ID,
      bucketName: 'bucketName',
      active: 'true',
      key: 'key',
      userId: SYSTEM_USER
    };

    await service.searchObjects(params);

    expect(ObjectModel.startTransaction).toHaveBeenCalledTimes(1);
    expect(ObjectModel.query).toHaveBeenCalledTimes(1);
    expect(ObjectModel.query).toHaveBeenCalledWith(expect.anything());
    expect(ObjectModel.allowGraph).toHaveBeenCalledTimes(1);
    expect(ObjectModel.modify).toHaveBeenCalledTimes(11);
    expect(ObjectModel.modify).toHaveBeenNthCalledWith(1, 'filterIds', params.id);
    expect(ObjectModel.modify).toHaveBeenNthCalledWith(2, 'filterBucketIds', params.bucketId);
    expect(ObjectModel.modify).toHaveBeenNthCalledWith(3, 'filterName', params.name);
    expect(ObjectModel.modify).toHaveBeenNthCalledWith(4, 'filterPath', params.path);
    expect(ObjectModel.modify).toHaveBeenNthCalledWith(5, 'filterPublic', params.public);
    expect(ObjectModel.modify).toHaveBeenNthCalledWith(6, 'filterActive', params.active);
    expect(ObjectModel.modify).toHaveBeenNthCalledWith(7, 'filterMimeType', params.mimeType);
    expect(ObjectModel.modify).toHaveBeenNthCalledWith(8, 'filterDeleteMarker', params.deleteMarker);
    expect(ObjectModel.modify).toHaveBeenNthCalledWith(9, 'filterLatest', params.latest);
    expect(ObjectModel.modify).toHaveBeenNthCalledWith(10, 'filterMetadataTag', {
      metadata: params.metadata,
      tag: params.tag
    });
    expect(ObjectModel.modify).toHaveBeenNthCalledWith(11, 'hasPermission', params.userId, 'READ');
    expect(ObjectModel.then).toHaveBeenCalledTimes(1);
    expect(objectModelTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('read', () => {
  it('Get an object db record', async () => {
    await service.read(SYSTEM_USER);

    expect(ObjectModel.startTransaction).toHaveBeenCalledTimes(1);
    expect(ObjectModel.query).toHaveBeenCalledTimes(1);
    expect(ObjectModel.query).toHaveBeenCalledWith(expect.anything());
    expect(ObjectModel.findById).toHaveBeenCalledTimes(1);
    expect(ObjectModel.findById).toBeCalledWith(OBJECT_ID);
    expect(ObjectModel.throwIfNotFound).toHaveBeenCalledTimes(1);
    expect(ObjectModel.throwIfNotFound).toBeCalledWith();
    expect(objectModelTrx.commit).toHaveBeenCalledTimes(1);
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
    expect(objectModelTrx.commit).toHaveBeenCalledTimes(1);
  });
});
