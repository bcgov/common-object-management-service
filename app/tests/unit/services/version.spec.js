const { NIL: OBJECT_ID, NIL: SYSTEM_USER, NIL: S3_VERSION_ID, NIL: VERSION_ID } = require('uuid');

const { resetReturnThis } = require('../../common/helper');
const Version = require('../../../src/db/models/tables/version');

jest.mock('../../../src/db/models/tables/version', () => ({
  commit: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),

  andWhere: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  first: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  patch: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  returning: jest.fn().mockReturnThis(),
  throwIfNotFound: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis()
}));

const service = require('../../../src/services/version');
const { version } = require('winston');

const objectId = OBJECT_ID;
const s3VersionId = S3_VERSION_ID;
const userId = SYSTEM_USER;
const versionId = VERSION_ID;

beforeEach(() => {
  jest.clearAllMocks();
  resetReturnThis(Version);
});

describe('copy', () => {
  it('Creates a new version db record from an existing record', async () => {
    await service.copy(version, s3VersionId, objectId, userId);

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
        s3VersionId: s3VersionId,
        objectId: objectId,
        mimeType: undefined,
        deleteMarker: undefined,
        createdBy: userId
      })
    );
    expect(Version.insert).toHaveBeenCalledTimes(1);
    expect(Version.commit).toHaveBeenCalledTimes(1);
  });

  it('Creates a new version db record from an existing record - no sourceVersionId provided', async () => {
    await service.copy(undefined, s3VersionId, objectId, userId);

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
    expect(Version.first).toHaveBeenCalledTimes(1);
    expect(Version.insert).toHaveBeenCalledTimes(1);
    expect(Version.commit).toHaveBeenCalledTimes(1);
  });
});

describe('create', () => {
  it('Saves a version of an object', async () => {
    await service.create({ s3VersionId: s3VersionId, mimeType: 'mimeType', id: objectId, deleteMarker: 'deleteMarker' }, userId);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledWith(expect.anything());
    expect(Version.insert).toHaveBeenCalledTimes(1);
    expect(Version.insert).toBeCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        s3VersionId: s3VersionId,
        objectId: objectId,
        mimeType: 'mimeType',
        deleteMarker: 'deleteMarker',
        createdBy: userId
      })
    );
    expect(Version.returning).toHaveBeenCalledTimes(1);
    expect(Version.returning).toBeCalledWith('id', 'objectId');
  });
});

describe('delete', () => {
  it('Delete a version record of an object', async () => {
    await service.delete(objectId, versionId);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledWith(expect.anything());
    expect(Version.delete).toHaveBeenCalledTimes(1);
    expect(Version.where).toHaveBeenCalledTimes(2);
    expect(Version.where).toBeCalledWith('objectId', objectId);
    expect(Version.where).toBeCalledWith('s3VersionId', versionId);
    expect(Version.returning).toHaveBeenCalledTimes(1);
    expect(Version.returning).toBeCalledWith('*');
    expect(Version.throwIfNotFound).toHaveBeenCalledTimes(1);
    expect(Version.commit).toHaveBeenCalledTimes(1);
  });
});

describe('get', () => {
  it('Get a given version from the database - s3versionId provided', async () => {
    await service.get({ s3VersionId: s3VersionId, objectId: objectId });

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledWith(expect.anything());
    expect(Version.where).toHaveBeenCalledTimes(1);
    expect(Version.where).toBeCalledWith(
      expect.objectContaining({
        s3VersionId: s3VersionId,
        objectId: objectId
      })
    );
    expect(Version.first).toHaveBeenCalledTimes(1);
    expect(Version.commit).toHaveBeenCalledTimes(1);
  });

  it('Get a given version from the database - no s3versionId provided', async () => {
    await service.get({ versionId: versionId, objectId: objectId });

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledWith(expect.anything());
    expect(Version.where).toHaveBeenCalledTimes(1);
    expect(Version.where).toBeCalledWith(
      expect.objectContaining({
        id: versionId,
        objectId: objectId
      })
    );
    expect(Version.first).toHaveBeenCalledTimes(1);
    expect(Version.commit).toHaveBeenCalledTimes(1);
  });

  it('Get a given version from the database - no s3versionId and no versionId provided', async () => {
    await service.get({ objectId: objectId });

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledWith(expect.anything());
    expect(Version.where).toHaveBeenCalledTimes(1);
    expect(Version.where).toBeCalledWith('objectId', objectId);
    expect(Version.andWhere).toHaveBeenCalledTimes(1);
    expect(Version.andWhere).toBeCalledWith('deleteMarker', false);
    expect(Version.orderBy).toHaveBeenCalledTimes(1);
    expect(Version.orderBy).toBeCalledWith('createdAt', 'desc');
    expect(Version.first).toHaveBeenCalledTimes(1);
    expect(Version.commit).toHaveBeenCalledTimes(1);
  });
});

describe('list', () => {
  it('Query versions by objectId', async () => {
    await service.list('abc');

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledWith(expect.anything());
    expect(Version.where).toHaveBeenCalledWith({ objectId: 'abc' });
    expect(Version.orderBy).toHaveBeenCalledWith('createdAt', 'DESC');
  });
});

describe('update', () => {
  it('Updates a version of an object', async () => {
    await service.update({ id: objectId, s3VersionId: s3VersionId, mimeType: 'mimeType' });

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(1);
    expect(Version.where).toHaveBeenCalledTimes(1);
    expect(Version.where).toHaveBeenCalledWith(
      {
        objectId: objectId,
        s3VersionId: s3VersionId
      }
    );
    expect(Version.patch).toHaveBeenCalledTimes(1);
    expect(Version.patch).toHaveBeenCalledWith(
      {
        objectId: objectId,
        updatedBy: userId,
        mimeType: 'mimeType'
      }
    );
    expect(Version.first).toHaveBeenCalledTimes(1);
    expect(Version.returning).toHaveBeenCalledTimes(1);
    expect(Version.commit).toHaveBeenCalledTimes(1);
  });
});
