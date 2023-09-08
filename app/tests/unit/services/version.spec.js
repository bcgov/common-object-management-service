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
  where: jest.fn()
}));

const service = require('../../../src/services/version');
// const { version } = require('winston');

beforeEach(() => {
  jest.clearAllMocks();
  resetModel(Version, versionTrx);
});

describe('copy', () => {
  // skipping these because we don't currently mock the reponse form a query
  it.skip('Creates a new version db record from an existing record', async () => {
    await service.copy(VERSION_ID, S3_VERSION_ID, OBJECT_ID, ETAG, SYSTEM_USER);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(3);
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
        createdBy: SYSTEM_USER
      })
    );
    expect(Version.insert).toHaveBeenCalledTimes(1);
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });

  it.skip('Creates a new version db record from an existing record - no sourceVersionId provided', async () => {
    await service.copy(undefined, S3_VERSION_ID, OBJECT_ID, ETAG, SYSTEM_USER);

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
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('create', () => {
  it('Saves a version of an object', async () => {
    await service.create({ s3VersionId: S3_VERSION_ID, mimeType: 'mimeType', id: OBJECT_ID, deleteMarker: 'deleteMarker' }, SYSTEM_USER);

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
  it.skip('Delete a version record of an object', async () => {
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
