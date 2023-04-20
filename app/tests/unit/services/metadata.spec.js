const { NIL: SYSTEM_USER, NIL: VERSION_ID } = require('uuid');

const { resetReturnThis } = require('../../common/helper');
const Metadata = require('../../../src/db/models/tables/metadata');
const ObjectModel = require('../../../src/db/models/tables/objectModel');
const Version = require('../../../src/db/models/tables/version');
const VersionMetadata = require('../../../src/db/models/tables/versionMetadata');

jest.mock('../../../src/db/models/tables/metadata', () => ({
  commit: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),

  allowGraph: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  find: jest.fn().mockReturnThis(),
  map: jest.fn().mockReturnThis(),
  modify: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  whereNull: jest.fn().mockReturnThis(),
  withGraphJoined: jest.fn().mockReturnThis()
}));
jest.mock('../../../src/db/models/tables/objectModel', () => ({
  allowGraph: jest.fn().mockReturnThis(),
  modify: jest.fn().mockReturnThis(),
  modifyGraph: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  then: jest.fn().mockReturnThis(),
  withGraphJoined: jest.fn().mockReturnThis()
}));
jest.mock('../../../src/db/models/tables/version', () => ({
  allowGraph: jest.fn().mockReturnThis(),
  modify: jest.fn().mockReturnThis(),
  modifyGraph: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  then: jest.fn().mockReturnThis(),
  withGraphJoined: jest.fn().mockReturnThis()
}));
jest.mock('../../../src/db/models/tables/versionMetadata', () => ({
  modify: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis()
}));

const service = require('../../../src/services/metadata');
const utils = require('../../../src/components/utils');

const metadata = [{ key: 'a', value: '1' }, { key: 'B', value: '2' }];
const params = { objId: 1, metadata: metadata, userId: SYSTEM_USER, privacyMask: 'privacyMask' };
const versionId = VERSION_ID;

beforeEach(() => {
  jest.clearAllMocks();
  resetReturnThis(Metadata);
  resetReturnThis(ObjectModel);
  resetReturnThis(Version);
  resetReturnThis(VersionMetadata);
});

describe('associateMetadata', () => {
  const createMetadataSpy = jest.spyOn(service, 'createMetadata');

  beforeEach(() => {
    createMetadataSpy.mockReset();
  });

  afterAll(() => {
    createMetadataSpy.mockRestore();
  });

  it('Makes the incoming list of metadata the definitive set associated with versionId', async () => {
    createMetadataSpy.mockResolvedValue({ ...metadata });

    await service.associateMetadata(versionId, metadata);

    expect(Metadata.startTransaction).toHaveBeenCalledTimes(1);
    expect(VersionMetadata.query).toHaveBeenCalledTimes(1);
    expect(VersionMetadata.query).toHaveBeenCalledWith(expect.anything());
    expect(VersionMetadata.modify).toHaveBeenCalledTimes(1);
    expect(VersionMetadata.modify).toHaveBeenCalledWith('filterVersionId', versionId);
    expect(Metadata.commit).toHaveBeenCalledTimes(1);
  });
});

describe('pruneOrphanedMetadata', () => {
  it('Deletes metadata records if they are no longer related to any versions', async () => {
    const etrx = await jest.fn().mockResolvedValue();

    await service.pruneOrphanedMetadata(etrx);

    expect(Metadata.query).toHaveBeenCalledTimes(2);
    expect(Metadata.query).toHaveBeenNthCalledWith(1, etrx);
    expect(Metadata.query).toHaveBeenNthCalledWith(2, etrx);
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
    getObjectsByKeyValueSpy.mockResolvedValue({ key: 'a', value: '1' });

    await service.createMetadata(metadata);

    expect(Metadata.startTransaction).toHaveBeenCalledTimes(1);
    expect(Metadata.query).toHaveBeenCalledTimes(1);
    expect(Metadata.query).toHaveBeenCalledWith(expect.anything());
    expect(Metadata.select).toHaveBeenCalledTimes(1);
    expect(Metadata.select).toHaveBeenCalledWith();
    expect(Metadata.commit).toHaveBeenCalledTimes(1);
  });
});

describe('fetchMetadataForObject', () => {
  it('Fetch metadata for specific objects', () => {
    service.fetchMetadataForObject(params);

    expect(ObjectModel.query).toHaveBeenCalledTimes(1);
    expect(ObjectModel.select).toHaveBeenCalledTimes(1);
    expect(ObjectModel.select).toHaveBeenCalledWith('object.id AS objectId');
    expect(ObjectModel.allowGraph).toHaveBeenCalledTimes(1);
    expect(ObjectModel.allowGraph).toHaveBeenCalledWith('version.metadata');
    expect(ObjectModel.withGraphJoined).toHaveBeenCalledTimes(1);
    expect(ObjectModel.withGraphJoined).toHaveBeenCalledWith('version.metadata');
    expect(ObjectModel.modifyGraph).toHaveBeenCalledTimes(2);
    expect(ObjectModel.modifyGraph).toHaveBeenCalledWith('version', expect.anything());
    expect(ObjectModel.modifyGraph).toHaveBeenCalledWith('version.metadata', expect.anything());
    expect(ObjectModel.modify).toHaveBeenCalledTimes(2);
    expect(ObjectModel.modify).toHaveBeenCalledWith('filterIds', params.objId);
    expect(ObjectModel.modify).toHaveBeenCalledWith('hasPermission', params.userId, 'READ');
    expect(ObjectModel.then).toHaveBeenCalledTimes(1);
  });
});

describe('fetchMetadataForVersion', () => {
  it('Fetch metadata for specific versions', () => {
    service.fetchMetadataForVersion(params);

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
  });
});

describe('searchMetadata', () => {
  it('Search and filter for specific metadata keys', () => {
    service.searchMetadata(params);

    expect(Metadata.query).toHaveBeenCalledTimes(1);
    expect(Metadata.modify).toHaveBeenCalledTimes(1);
  });
});
