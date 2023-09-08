const { NIL: SYSTEM_USER, NIL: VERSION_ID } = require('uuid');

const { resetModel, trxBuilder } = require('../../common/helper');
const Metadata = require('../../../src/db/models/tables/metadata');
const ObjectModel = require('../../../src/db/models/tables/objectModel');
const Version = require('../../../src/db/models/tables/version');
const VersionMetadata = require('../../../src/db/models/tables/versionMetadata');

const metadataTrx = trxBuilder();
jest.mock('../../../src/db/models/tables/metadata', () => ({
  startTransaction: jest.fn(),
  then: jest.fn(),

  allowGraph: jest.fn(),
  delete: jest.fn(),
  find: jest.fn(),
  insert: jest.fn(),
  map: jest.fn(),
  modify: jest.fn(),
  query: jest.fn(),
  returning: jest.fn(),
  select: jest.fn(),
  whereIn: jest.fn(),
  whereNull: jest.fn(),
  withGraphJoined: jest.fn()
}));

const objectModelTrx = trxBuilder();
jest.mock('../../../src/db/models/tables/objectModel', () => ({
  startTransaction: jest.fn(),
  then: jest.fn(),

  allowGraph: jest.fn(),
  modify: jest.fn(),
  modifyGraph: jest.fn(),
  query: jest.fn(),
  select: jest.fn(),
  withGraphJoined: jest.fn()
}));

const versionTrx = trxBuilder();
jest.mock('../../../src/db/models/tables/version', () => ({
  startTransaction: jest.fn(),
  then: jest.fn(),

  allowGraph: jest.fn(),
  modify: jest.fn(),
  modifyGraph: jest.fn(),
  orderBy: jest.fn(),
  query: jest.fn(),
  select: jest.fn(),
  withGraphJoined: jest.fn()
}));

const versionMetadataTrx = trxBuilder();
jest.mock('../../../src/db/models/tables/versionMetadata', () => ({
  startTransaction: jest.fn(),
  then: jest.fn(),

  modify: jest.fn(),
  query: jest.fn()
}));

const service = require('../../../src/services/metadata');
const utils = require('../../../src/components/utils');

const metadata = [{ key: 'a', value: '1' }, { key: 'B', value: '2' }];
const params = { objId: 1, metadata: metadata, userId: SYSTEM_USER, privacyMask: 'privacyMask' };

beforeEach(() => {
  jest.clearAllMocks();
  resetModel(Metadata, metadataTrx);
  resetModel(ObjectModel, objectModelTrx);
  resetModel(Version, versionTrx);
  resetModel(VersionMetadata, versionMetadataTrx);
});

describe('associateMetadata', () => {
  const createMetadataSpy = jest.spyOn(service, 'createMetadata');
  const pruneOrphanedMetadataSpy = jest.spyOn(service, 'pruneOrphanedMetadata');

  beforeEach(() => {
    createMetadataSpy.mockReset();
    pruneOrphanedMetadataSpy.mockReset();
  });

  afterAll(() => {
    createMetadataSpy.mockRestore();
    pruneOrphanedMetadataSpy.mockRestore();
  });

  it('Makes the incoming list of metadata the definitive set associated with versionId', async () => {
    createMetadataSpy.mockResolvedValue({ ...metadata });
    pruneOrphanedMetadataSpy.mockImplementation(() => { });

    await service.associateMetadata(VERSION_ID, metadata);

    expect(Metadata.startTransaction).toHaveBeenCalledTimes(1);
    expect(VersionMetadata.query).toHaveBeenCalledTimes(1);
    expect(VersionMetadata.query).toHaveBeenCalledWith(expect.anything());
    expect(VersionMetadata.modify).toHaveBeenCalledTimes(1);
    expect(VersionMetadata.modify).toHaveBeenCalledWith('filterVersionId', VERSION_ID);
    expect(metadataTrx.commit).toHaveBeenCalledTimes(1);
    expect(createMetadataSpy).toHaveBeenCalledTimes(1);
    expect(createMetadataSpy).toHaveBeenCalledWith(metadata, expect.anything());
    expect(pruneOrphanedMetadataSpy).toHaveBeenCalledTimes(1);
    expect(pruneOrphanedMetadataSpy).toHaveBeenCalledWith(expect.anything());
  });
});

describe('pruneOrphanedMetadata', () => {
  it('Deletes metadata records if they are no longer related to any versions', async () => {
    Metadata.whereNull.mockResolvedValue([
      {
        ...metadata,
        map: jest.fn()
      }
    ]);

    await service.pruneOrphanedMetadata();

    expect(Metadata.query).toHaveBeenCalledTimes(2);
    expect(Metadata.allowGraph).toHaveBeenCalledTimes(1);
    expect(Metadata.allowGraph).toHaveBeenCalledWith('versionMetadata');
    expect(Metadata.withGraphJoined).toHaveBeenCalledTimes(1);
    expect(Metadata.withGraphJoined).toHaveBeenCalledWith('versionMetadata');
    expect(Metadata.select).toHaveBeenCalledTimes(1);
    expect(Metadata.select).toHaveBeenCalledWith('metadata.id');
    expect(Metadata.whereNull).toHaveBeenCalledTimes(1);
    expect(Metadata.whereNull).toHaveBeenCalledWith('versionMetadata.metadataId');
    expect(Metadata.delete).toHaveBeenCalledTimes(1);
    expect(Metadata.whereIn).toHaveBeenCalledTimes(1);
  });
});

describe('createMetadata', () => {
  const getObjectsByKeyValueSpy = jest.spyOn(utils, 'getObjectsByKeyValue');

  beforeEach(() => {
    getObjectsByKeyValueSpy.mockReset();
  });

  afterAll(() => {
    getObjectsByKeyValueSpy.mockRestore();
  });

  it('Inserts any metadata records if they dont already exist in db', async () => {
    Metadata.select.mockResolvedValue([
      {
        ...metadata,
        find: jest.fn()
      }
    ]);

    getObjectsByKeyValueSpy.mockResolvedValue({ key: 'a', value: '1' });

    await service.createMetadata(metadata);

    expect(Metadata.startTransaction).toHaveBeenCalledTimes(1);
    expect(Metadata.query).toHaveBeenCalledTimes(2);
    expect(Metadata.query).toHaveBeenCalledWith(expect.anything());
    expect(Metadata.select).toHaveBeenCalledTimes(1);
    expect(metadataTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('fetchMetadataForObject', () => {
  it('Fetch metadata for specific objects', () => {
    ObjectModel.then.mockResolvedValue([
      {
        ...metadata,
        map: jest.fn()
      }
    ]);

    service.fetchMetadataForObject(params);

    expect(ObjectModel.query).toHaveBeenCalledTimes(1);
    expect(ObjectModel.select).toHaveBeenCalledTimes(1);
    expect(ObjectModel.select).toHaveBeenCalledWith('object.id AS objectId', 'object.bucketId as bucketId');
    expect(ObjectModel.allowGraph).toHaveBeenCalledTimes(1);
    expect(ObjectModel.allowGraph).toHaveBeenCalledWith('version.metadata');
    expect(ObjectModel.withGraphJoined).toHaveBeenCalledTimes(1);
    expect(ObjectModel.withGraphJoined).toHaveBeenCalledWith('version.metadata');
    expect(ObjectModel.modifyGraph).toHaveBeenCalledTimes(2);
    expect(ObjectModel.modifyGraph).toHaveBeenCalledWith('version', expect.anything());
    expect(ObjectModel.modifyGraph).toHaveBeenCalledWith('version.metadata', expect.anything());
    expect(ObjectModel.modify).toHaveBeenCalledTimes(3);
    expect(ObjectModel.modify).toHaveBeenCalledWith('filterIds', params.objId);
    expect(ObjectModel.modify).toHaveBeenCalledWith('hasPermission', params.userId, 'READ');
    expect(ObjectModel.then).toHaveBeenCalledTimes(1);
  });
});

describe('fetchMetadataForVersion', () => {
  it('Fetch metadata for specific versions', async () => {
    Version.then.mockResolvedValue([
      {
        ...metadata,
        map: jest.fn()
      }
    ]);

    await service.fetchMetadataForVersion(params);

    expect(Metadata.startTransaction).toHaveBeenCalledTimes(1);
    expect(Version.query).toHaveBeenCalledTimes(1);
    expect(Version.select).toHaveBeenCalledTimes(1);
    expect(Version.select).toHaveBeenCalledWith('version.id as versionId', 'version.s3VersionId');
    expect(Version.allowGraph).toHaveBeenCalledTimes(1);
    expect(Version.allowGraph).toHaveBeenCalledWith('metadata');
    expect(Version.withGraphJoined).toHaveBeenCalledTimes(1);
    expect(Version.withGraphJoined).toHaveBeenCalledWith('metadata');
    expect(Version.modifyGraph).toHaveBeenCalledTimes(1);
    expect(Version.modifyGraph).toHaveBeenCalledWith('metadata', expect.anything());
    expect(Version.modify).toHaveBeenCalledTimes(3);
    expect(Version.modify).toHaveBeenCalledWith('filterId', params.versionId);
    expect(Version.orderBy).toHaveBeenCalledTimes(1);
    expect(Version.orderBy).toHaveBeenCalledWith('version.createdAt', 'desc');
    expect(Version.then).toHaveBeenCalledTimes(1);
    expect(metadataTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('searchMetadata', () => {
  it('Search and filter for specific metadata keys', () => {
    service.searchMetadata(params);

    expect(Metadata.query).toHaveBeenCalledTimes(1);
    expect(Metadata.modify).toHaveBeenCalledTimes(1);
  });
});
