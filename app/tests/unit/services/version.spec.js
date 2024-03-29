const { NIL: OBJECT_ID, NIL: SYSTEM_USER, NIL: S3_VERSION_ID, NIL: VERSION_ID, NIL: ETAG } = require('uuid');

const { resetModel, trxBuilder } = require('../../common/helper');
const Version = require('../../../src/db/models/tables/version');

const versionTrx = trxBuilder();
jest.mock('../../../src/db/models/tables/version', () => ({
  startTransaction: jest.fn(),
  then: jest.fn(),

  andWhere: jest.fn(),
  delete: jest.fn(),
  first: jest.fn(),
  insert: jest.fn(),
  modify: jest.fn(),
  orderBy: jest.fn(),
  patch: jest.fn(),
  query: jest.fn(),
  returning: jest.fn(),
  throwIfNotFound: jest.fn(),
  update: jest.fn(),
  updateAndFetchById: jest.fn(),
  where: jest.fn(),
  whereNot: jest.fn()
}));

const validUuidv4 = '3f4da093-6399-4711-8765-36ec5f8017c2';

const service = require('../../../src/services/version');
const objectService = require('../../../src/services/object');
const storageService = require('../../../src/services/storage');

beforeEach(() => {
  jest.clearAllMocks();
  resetModel(Version, versionTrx);
});

afterAll(() => {
  jest.clearAllMocks();
});

describe('copy', () => {
  const LAST_MODIFIED = new Date().toString();
  const removeDuplicateLatestSpy = jest.spyOn(service, 'removeDuplicateLatest');

  beforeEach(() => {
    removeDuplicateLatestSpy.mockReset();
  });

  afterAll(() => {
    removeDuplicateLatestSpy.mockRestore();
  });

  it('Creates a new version db record from an existing record', async () => {
    removeDuplicateLatestSpy.mockResolvedValue([]);

    await service.copy(VERSION_ID, S3_VERSION_ID, OBJECT_ID, ETAG, LAST_MODIFIED, SYSTEM_USER);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(2);
    expect(Version.query).toHaveBeenCalledWith(expect.anything());
    expect(Version.where).toHaveBeenCalledTimes(1);
    expect(Version.where).toBeCalledWith(
      expect.objectContaining({
        s3VersionId: expect.any(String),
        objectId: expect.any(String)
      })
    );
    expect(Version.first).toHaveBeenCalledTimes(1);
    expect(Version.insert).toBeCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        s3VersionId: S3_VERSION_ID,
        objectId: OBJECT_ID,
        mimeType: undefined,
        deleteMarker: undefined,
        createdBy: SYSTEM_USER,
        lastModifiedDate: new Date(LAST_MODIFIED).toISOString()
      })
    );
    expect(Version.insert).toHaveBeenCalledTimes(1);
    expect(Version.returning).toHaveBeenCalledTimes(1);
    expect(Version.returning).toHaveBeenCalledWith('*');
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
    expect(removeDuplicateLatestSpy).toHaveBeenCalledTimes(1);
  });

  it('Creates a new version db record from an existing record - no sourceVersionId provided', async () => {
    removeDuplicateLatestSpy.mockResolvedValue([]);

    await service.copy(undefined, S3_VERSION_ID, OBJECT_ID, ETAG, LAST_MODIFIED, SYSTEM_USER);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(2);
    expect(Version.query).toHaveBeenCalledWith(expect.anything());
    expect(Version.where).toHaveBeenCalledTimes(1);
    expect(Version.where).toBeCalledWith(
      expect.objectContaining({
        objectId: expect.any(String)
      })
    );
    expect(Version.orderBy).toHaveBeenCalledTimes(1);
    expect(Version.orderBy).toHaveBeenCalledWith(expect.arrayContaining([
      { column: 'createdAt', order: 'desc' },
      { column: 'updatedAt', order: 'desc', nulls: 'last' }
    ]));
    expect(Version.first).toHaveBeenCalledTimes(1);
    expect(Version.insert).toHaveBeenCalledTimes(1);
    expect(Version.returning).toHaveBeenCalledTimes(1);
    expect(Version.returning).toHaveBeenCalledWith('*');
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
    expect(removeDuplicateLatestSpy).toHaveBeenCalledTimes(1);
  });
});

describe('create', () => {
  it('Saves a version of an object', async () => {
    await service.create({
      s3VersionId: S3_VERSION_ID,
      mimeType: 'mimeType',
      id: OBJECT_ID,
      deleteMarker: 'deleteMarker'
    }, SYSTEM_USER);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledWith(expect.anything());
    expect(Version.insert).toHaveBeenCalledTimes(1);
    expect(Version.insert).toBeCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        s3VersionId: S3_VERSION_ID,
        objectId: OBJECT_ID,
        mimeType: 'mimeType',
        deleteMarker: 'deleteMarker',
        createdBy: SYSTEM_USER
      })
    );
    expect(Version.returning).toHaveBeenCalledTimes(1);
    expect(Version.returning).toBeCalledWith('*');
  });
});

describe('delete', () => {
  const updateIsLatestSpy = jest.spyOn(service, 'updateIsLatest');

  beforeEach(() => {
    updateIsLatestSpy.mockReset();
  });

  afterAll(() => {
    updateIsLatestSpy.mockRestore();
  });

  it('Delete a version record of an object', async () => {
    updateIsLatestSpy.mockResolvedValue({});

    await service.delete(OBJECT_ID, VERSION_ID);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledWith(expect.anything());
    expect(Version.delete).toHaveBeenCalledTimes(1);
    expect(Version.where).toHaveBeenCalledTimes(2);
    expect(Version.where).toBeCalledWith('objectId', OBJECT_ID);
    expect(Version.where).toBeCalledWith('s3VersionId', VERSION_ID);
    expect(Version.returning).toHaveBeenCalledTimes(1);
    expect(Version.returning).toBeCalledWith('*');
    expect(Version.throwIfNotFound).toHaveBeenCalledTimes(1);
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
    expect(updateIsLatestSpy).toHaveBeenCalledTimes(1);
    expect(updateIsLatestSpy).toHaveBeenCalledWith(OBJECT_ID, expect.anything());
  });
});

describe('get', () => {
  it('Get a given version from the database - s3versionId provided', async () => {
    await service.get({ s3VersionId: S3_VERSION_ID, objectId: OBJECT_ID });

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledWith(expect.anything());
    expect(Version.where).toHaveBeenCalledTimes(1);
    expect(Version.where).toBeCalledWith(
      expect.objectContaining({
        s3VersionId: S3_VERSION_ID,
        objectId: OBJECT_ID
      })
    );
    expect(Version.first).toHaveBeenCalledTimes(1);
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });

  it('Get a given version from the database - no s3versionId provided', async () => {
    await service.get({ versionId: VERSION_ID, objectId: OBJECT_ID });

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledWith(expect.anything());
    expect(Version.where).toHaveBeenCalledTimes(1);
    expect(Version.where).toBeCalledWith(
      expect.objectContaining({
        id: VERSION_ID,
        objectId: OBJECT_ID
      })
    );
    expect(Version.first).toHaveBeenCalledTimes(1);
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });

  it('Get a given version from the database - no s3versionId and no versionId provided', async () => {
    await service.get({ objectId: OBJECT_ID });

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledWith(expect.anything());
    expect(Version.where).toHaveBeenCalledTimes(1);
    expect(Version.where).toBeCalledWith('objectId', OBJECT_ID);
    expect(Version.andWhere).toHaveBeenCalledTimes(1);
    expect(Version.andWhere).toBeCalledWith('deleteMarker', false);
    expect(Version.orderBy).toHaveBeenCalledTimes(1);
    expect(Version.orderBy).toBeCalledWith('createdAt', 'desc');
    expect(Version.first).toHaveBeenCalledTimes(1);
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('list', () => {
  it('Query versions by objectId', async () => {
    await service.list('abc');

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledWith(expect.anything());
    expect(Version.modify).toHaveBeenCalledTimes(1);
    expect(Version.modify).toHaveBeenCalledWith('filterObjectId', 'abc');
    expect(Version.orderBy).toHaveBeenCalledTimes(1);
    expect(Version.orderBy).toHaveBeenCalledWith('createdAt', 'DESC');
  });
});

describe('update', () => {
  it('Updates a version of an object', async () => {
    await service.update({ id: OBJECT_ID, s3VersionId: S3_VERSION_ID, mimeType: 'mimeType' });

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(1);
    expect(Version.where).toHaveBeenCalledTimes(1);
    expect(Version.where).toHaveBeenCalledWith(
      {
        objectId: OBJECT_ID,
        s3VersionId: S3_VERSION_ID
      }
    );
    expect(Version.patch).toHaveBeenCalledTimes(1);
    expect(Version.patch).toHaveBeenCalledWith(
      {
        objectId: OBJECT_ID,
        updatedBy: SYSTEM_USER,
        mimeType: 'mimeType'
      }
    );
    expect(Version.first).toHaveBeenCalledTimes(1);
    expect(Version.returning).toHaveBeenCalledTimes(1);
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('updateIsLatest', () => {
  const listAllObjectVersionsSpy = jest.spyOn(storageService, 'listAllObjectVersions');
  const objectSpy = jest.spyOn(objectService, 'read');

  beforeEach(() => {
    listAllObjectVersionsSpy.mockReset();
    objectSpy.mockReset();
  });

  afterAll(() => {
    listAllObjectVersionsSpy.mockRestore();
    objectSpy.mockRestore();
  });

  it('Updates a version of an object if it is the latest', async () => {
    const versionSpy = jest.spyOn(service, 'removeDuplicateLatest');
    versionSpy.mockResolvedValueOnce(true);
    listAllObjectVersionsSpy.mockResolvedValue({
      DeleteMarkers: [{}],
      Versions: [{ IsLatest: true, VersionId: validUuidv4 }]
    });
    objectSpy.mockResolvedValue({
      path: '/test',
      bucketId: '0000-0000'
    });

    await service.updateIsLatest(OBJECT_ID);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(2);
    expect(Version.where).toHaveBeenCalledTimes(1);
    expect(Version.where).toHaveBeenCalledWith(
      {
        objectId: OBJECT_ID,
        s3VersionId: validUuidv4
      }
    );
    expect(Version.updateAndFetchById).toHaveBeenCalledTimes(1);
    expect(Version.first).toHaveBeenCalledTimes(1);
    expect(versionSpy).toHaveBeenCalledTimes(1);
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });

  it('Does not update if file is not the latest', async () => {
    const versionSpy = jest.spyOn(service, 'removeDuplicateLatest');
    versionSpy.mockResolvedValueOnce(true);
    listAllObjectVersionsSpy.mockResolvedValue({
      DeleteMarkers: [{}],
      Versions: [
        { IsLatest: true, VersionId: validUuidv4 },
      ]
    });
    objectSpy.mockResolvedValue({
      path: '/test',
      bucketId: '0000-0000'
    });
    Version.throwIfNotFound.mockResolvedValue({ isLatest: true });

    await service.updateIsLatest(OBJECT_ID);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(1);
    expect(Version.first).toHaveBeenCalledTimes(1);
    expect(Version.where).toHaveBeenCalledTimes(1);
    expect(Version.where).toHaveBeenCalledWith(
      {
        objectId: OBJECT_ID,
        s3VersionId: validUuidv4
      }
    );
    expect(Version.updateAndFetchById).toHaveBeenCalledTimes(0);

    expect(versionSpy).toHaveBeenCalledTimes(1);
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('removeDuplicateLatest', () => {
  const listAllObjectVersionsSpy = jest.spyOn(storageService, 'listAllObjectVersions');
  const objectSpy = jest.spyOn(objectService, 'read');

  beforeEach(() => {
    listAllObjectVersionsSpy.mockReset();
    objectSpy.mockReset();
  });

  afterAll(() => {
    listAllObjectVersionsSpy.mockRestore();
    objectSpy.mockRestore();
  });

  it('sets all other versions to isLatest=false', async () => {
    listAllObjectVersionsSpy.mockResolvedValue({
      DeleteMarkers: [{}],
      Versions: [{ IsLatest: true, VersionId: validUuidv4 }]
    });
    objectSpy.mockResolvedValue({
      path: '/test',
      bucketId: '0000-0000'
    });
    Version.where.mockResolvedValueOnce([{ isLatest: true }, { isLatest: true }]);

    await service.removeDuplicateLatest(validUuidv4, OBJECT_ID);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(2);
    expect(Version.update).toHaveBeenCalledTimes(1);

    expect(Version.where).toHaveBeenCalledTimes(1);
    expect(Version.where).toHaveBeenCalledWith('objectId', OBJECT_ID);

    expect(Version.whereNot).toHaveBeenCalledTimes(1);
    expect(Version.whereNot).toHaveBeenCalledWith({ 'id': validUuidv4 });

    expect(Version.andWhere).toHaveBeenCalledTimes(2);
    expect(Version.andWhere).toHaveBeenCalledWith('objectId', OBJECT_ID);
    expect(Version.andWhere).toHaveBeenCalledWith({ 'isLatest': true });
  });

  it('does not set other versions to false', async () => {
    listAllObjectVersionsSpy.mockResolvedValue({
      DeleteMarkers: [{}],
      Versions: [{ IsLatest: false, VersionId: validUuidv4 }]
    });
    objectSpy.mockResolvedValue({
      path: '/test',
      bucketId: '0000-0000'
    });
    Version.where.mockResolvedValueOnce([{ isLatest: false }, { isLatest: false }]);

    await service.removeDuplicateLatest(validUuidv4, OBJECT_ID);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(1);

    expect(Version.where).toHaveBeenCalledTimes(1);
    expect(Version.where).toHaveBeenCalledWith('objectId', OBJECT_ID);

    expect(Version.update).toHaveBeenCalledTimes(0);
    expect(Version.whereNot).toHaveBeenCalledTimes(0);
    expect(Version.andWhere).toHaveBeenCalledTimes(0);
  });
});
