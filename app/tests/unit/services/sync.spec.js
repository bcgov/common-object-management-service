const { resetModel, trxBuilder } = require('../../common/helper');
const utils = require('../../../src/db/models/utils');
const ObjectModel = require('../../../src/db/models/tables/objectModel');
const Version = require('../../../src/db/models/tables/version');

const objectModelTrx = trxBuilder();
jest.mock('../../../src/db/models/tables/objectModel', () => ({
  startTransaction: jest.fn(),
  then: jest.fn()
}));

const versionTrx = trxBuilder();
jest.mock('../../../src/db/models/tables/version', () => ({
  delete: jest.fn(),
  query: jest.fn(),
  startTransaction: jest.fn(),
  then: jest.fn(),
  where: jest.fn(),
  whereIn: jest.fn(),
  whereNotNull: jest.fn(),
}));

const {
  objectService,
  metadataService,
  storageService,
  tagService,
  versionService
} = require('../../../src/services');
const service = require('../../../src/services/sync');

const bucketId = 'bucketId';
const path = 'path';
const uuidv4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const validUuidv4 = '3f4da093-6399-4711-8765-36ec5f8017c2';

// Shared Spy Scopes
const getSpy = jest.spyOn(versionService, 'get');
const getObjectTaggingSpy = jest.spyOn(storageService, 'getObjectTagging');
const headObjectSpy = jest.spyOn(storageService, 'headObject');
const listAllObjectVersionsSpy = jest.spyOn(storageService, 'listAllObjectVersions');
const putObjectTaggingSpy = jest.spyOn(storageService, 'putObjectTagging');

beforeEach(() => {
  jest.clearAllMocks();
  resetModel(ObjectModel, objectModelTrx);
  resetModel(Version, versionTrx);

  getSpy.mockReset();
  getObjectTaggingSpy.mockReset();
  headObjectSpy.mockReset();
  listAllObjectVersionsSpy.mockReset();
  putObjectTaggingSpy.mockReset();
});

afterAll(() => { // Mockrestores must only happen after suite is completed
  getSpy.mockRestore();
  getObjectTaggingSpy.mockRestore();
  headObjectSpy.mockRestore();
  listAllObjectVersionsSpy.mockRestore();
  putObjectTaggingSpy.mockRestore();
});

describe('_deriveObjectId', () => {
  describe('Regular S3 Object', () => {
    it('Returns an existing coms-id if valid', async () => {
      getObjectTaggingSpy.mockResolvedValue({
        TagSet: [{ Key: 'coms-id', Value: validUuidv4 }]
      });

      const result = await service._deriveObjectId({}, path, bucketId);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toMatch(validUuidv4);
      expect(getObjectTaggingSpy).toHaveBeenCalledTimes(1);
      expect(getObjectTaggingSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: path,
        bucketId: bucketId
      }));
      expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(0);
      expect(putObjectTaggingSpy).toHaveBeenCalledTimes(0);
    });

    it('Returns a new uuid if invalid and pushes tags when less than 10 present', async () => {
      getObjectTaggingSpy.mockResolvedValue({
        TagSet: [{ Key: 'coms-id', Value: 'garbage' }]
      });

      const result = await service._deriveObjectId({}, path, bucketId);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toMatch(uuidv4Regex);
      expect(getObjectTaggingSpy).toHaveBeenCalledTimes(1);
      expect(getObjectTaggingSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: path,
        bucketId: bucketId
      }));
      expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(0);
      expect(putObjectTaggingSpy).toHaveBeenCalledTimes(1);
      expect(putObjectTaggingSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: path,
        bucketId: bucketId,
        tags: expect.any(Array)
      }));
    });

    it('Returns a new uuid if unavailable and pushes tags when less than 10 present', async () => {
      getObjectTaggingSpy.mockResolvedValue({ TagSet: [] });

      const result = await service._deriveObjectId({}, path, bucketId);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toMatch(uuidv4Regex);
      expect(getObjectTaggingSpy).toHaveBeenCalledTimes(1);
      expect(getObjectTaggingSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: path,
        bucketId: bucketId
      }));
      expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(0);
      expect(putObjectTaggingSpy).toHaveBeenCalledTimes(1);
      expect(putObjectTaggingSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: path,
        bucketId: bucketId,
        tags: expect.any(Array)
      }));
    });

    it('Returns an existing coms-id if found', async () => {
      getObjectTaggingSpy.mockResolvedValue({ TagSet: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}] });

      const result = await service._deriveObjectId({}, path, bucketId);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toMatch(uuidv4Regex);
      expect(getObjectTaggingSpy).toHaveBeenCalledTimes(1);
      expect(getObjectTaggingSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: path,
        bucketId: bucketId
      }));
      expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(0);
      expect(putObjectTaggingSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('Soft-Deleted S3 Object', () => {
    it('Returns a new uuid if valid found', async () => {
      listAllObjectVersionsSpy.mockResolvedValue({ Versions: [{ VersionId: '2' }, { VersionId: '1' }] });
      getObjectTaggingSpy.mockResolvedValueOnce({ TagSet: [] });
      getObjectTaggingSpy.mockResolvedValueOnce({
        TagSet: [{ Key: 'coms-id', Value: validUuidv4 }]
      });

      const result = await service._deriveObjectId(true, path, bucketId);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toMatch(validUuidv4);
      expect(getObjectTaggingSpy).toHaveBeenCalledTimes(2);
      expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(1);
      expect(listAllObjectVersionsSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: path,
        bucketId: bucketId
      }));
      expect(putObjectTaggingSpy).toHaveBeenCalledTimes(0);
    });

    it('Returns a new uuid if valid not found', async () => {
      listAllObjectVersionsSpy.mockResolvedValue({ Versions: [{ VersionId: '1' }] });
      getObjectTaggingSpy.mockResolvedValueOnce({ TagSet: [] });

      const result = await service._deriveObjectId(true, path, bucketId);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toMatch(uuidv4Regex);
      expect(getObjectTaggingSpy).toHaveBeenCalledTimes(1);
      expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(1);
      expect(listAllObjectVersionsSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: path,
        bucketId: bucketId
      }));
      expect(putObjectTaggingSpy).toHaveBeenCalledTimes(0);
    });
  });

  describe('Unexpected S3 Object definition', () => {
    it('Returns a new uuid for all other cases', async () => {
      const result = await service._deriveObjectId(undefined, path, bucketId);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
      expect(result).toMatch(uuidv4Regex);
      expect(getObjectTaggingSpy).toHaveBeenCalledTimes(0);
      expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(0);
      expect(putObjectTaggingSpy).toHaveBeenCalledTimes(0);
    });
  });
});

describe('syncJob', () => {
  const trxWrapperSpy = jest.spyOn(utils, 'trxWrapper');
  const syncObjectSpy = jest.spyOn(service, 'syncObject');
  const syncVersionsSpy = jest.spyOn(service, 'syncVersions');
  const syncTagsSpy = jest.spyOn(service, 'syncTags');
  const syncMetadataSpy = jest.spyOn(service, 'syncMetadata');

  beforeEach(() => {
    syncObjectSpy.mockReset();
    syncVersionsSpy.mockReset();
    syncTagsSpy.mockReset();
    syncMetadataSpy.mockReset();
    trxWrapperSpy.mockReset();

    trxWrapperSpy.mockImplementation(callback => callback({}));
  });

  afterAll(() => {
    syncObjectSpy.mockRestore();
    syncVersionsSpy.mockRestore();
    syncTagsSpy.mockRestore();
    syncMetadataSpy.mockRestore();
    trxWrapperSpy.mockRestore();
  });

  it('Throws when path is not defined', () => {
    const result = (() => service.syncJob(undefined, bucketId))();

    expect(result).rejects.toThrow();
    expect(syncObjectSpy).toHaveBeenCalledTimes(0);
    expect(syncVersionsSpy).toHaveBeenCalledTimes(0);
    expect(syncTagsSpy).toHaveBeenCalledTimes(0);
    expect(syncMetadataSpy).toHaveBeenCalledTimes(0);
  });

  it('Only calls syncObject when object is deleted from S3', async () => {
    syncObjectSpy.mockResolvedValue({ modified: false, object: undefined });

    const result = await service.syncJob(path, bucketId);

    expect(result).toBeUndefined();
    expect(syncObjectSpy).toHaveBeenCalledTimes(1);
    expect(syncObjectSpy).toHaveBeenCalledWith(path, bucketId, expect.any(String), expect.any(Object));
    expect(syncVersionsSpy).toHaveBeenCalledTimes(0);
    expect(syncTagsSpy).toHaveBeenCalledTimes(0);
    expect(syncMetadataSpy).toHaveBeenCalledTimes(0);
  });

  it('Always calls at syncObject, syncVersions and syncTags', async () => {
    syncObjectSpy.mockResolvedValue({ modified: true, object: { id: validUuidv4 } });
    syncVersionsSpy.mockResolvedValue([{ modified: false, version: {} }]);
    syncTagsSpy.mockResolvedValue([]);
    syncMetadataSpy.mockResolvedValue([]);

    const result = await service.syncJob(path, bucketId);

    expect(result).toMatch(validUuidv4);
    expect(syncObjectSpy).toHaveBeenCalledTimes(1);
    expect(syncObjectSpy).toHaveBeenCalledWith(path, bucketId, expect.any(String), expect.any(Object));
    expect(syncVersionsSpy).toHaveBeenCalledTimes(1);
    expect(syncVersionsSpy).toHaveBeenCalledWith(expect.any(Object), expect.any(String), expect.any(Object));
    expect(syncTagsSpy).toHaveBeenCalledTimes(1);
    expect(syncTagsSpy).toHaveBeenCalledWith(expect.any(Object), path, bucketId, expect.any(String), expect.any(Object));
    expect(syncMetadataSpy).toHaveBeenCalledTimes(0);
  });

  it('Calls syncTags and syncMetadata when version modified', async () => {
    syncObjectSpy.mockResolvedValue({ modified: true, object: { id: validUuidv4 } });
    syncVersionsSpy.mockResolvedValue([{ modified: true, version: {} }]);
    syncTagsSpy.mockResolvedValue([]);
    syncMetadataSpy.mockResolvedValue([]);

    const result = await service.syncJob(path, bucketId);

    expect(result).toMatch(validUuidv4);
    expect(syncObjectSpy).toHaveBeenCalledTimes(1);
    expect(syncObjectSpy).toHaveBeenCalledWith(path, bucketId, expect.any(String), expect.any(Object));
    expect(syncVersionsSpy).toHaveBeenCalledTimes(1);
    expect(syncVersionsSpy).toHaveBeenCalledWith(expect.any(Object), expect.any(String), expect.any(Object));
    expect(syncTagsSpy).toHaveBeenCalledTimes(1);
    expect(syncTagsSpy).toHaveBeenCalledWith(expect.any(Object), path, bucketId, expect.any(String), expect.any(Object));
    expect(syncMetadataSpy).toHaveBeenCalledTimes(1);
    expect(syncMetadataSpy).toHaveBeenCalledWith(expect.any(Object), path, bucketId, expect.any(String), expect.any(Object));
  });

  it('Calls everything when full mode', async () => {
    syncObjectSpy.mockResolvedValue({ modified: false, object: { id: validUuidv4 } });
    syncVersionsSpy.mockResolvedValue([{ modified: false, version: {} }]);
    syncTagsSpy.mockResolvedValue([]);
    syncMetadataSpy.mockResolvedValue([]);

    const result = await service.syncJob(path, bucketId, true);

    expect(result).toMatch(validUuidv4);
    expect(syncObjectSpy).toHaveBeenCalledTimes(1);
    expect(syncObjectSpy).toHaveBeenCalledWith(path, bucketId, expect.any(String), expect.any(Object));
    expect(syncVersionsSpy).toHaveBeenCalledTimes(1);
    expect(syncVersionsSpy).toHaveBeenCalledWith(expect.any(Object), expect.any(String), expect.any(Object));
    expect(syncTagsSpy).toHaveBeenCalledTimes(1);
    expect(syncTagsSpy).toHaveBeenCalledWith(expect.any(Object), path, bucketId, expect.any(String), expect.any(Object));
    expect(syncMetadataSpy).toHaveBeenCalledTimes(1);
    expect(syncMetadataSpy).toHaveBeenCalledWith(expect.any(Object), path, bucketId, expect.any(String), expect.any(Object));
  });
});

describe('syncObject', () => {
  const _deriveObjectIdSpy = jest.spyOn(service, '_deriveObjectId');
  const createSpy = jest.spyOn(objectService, 'create');
  const deleteSpy = jest.spyOn(objectService, 'delete');
  const pruneOrphanedMetadataSpy = jest.spyOn(metadataService, 'pruneOrphanedMetadata');
  const pruneOrphanedTagsSpy = jest.spyOn(tagService, 'pruneOrphanedTags');
  const searchObjectsSpy = jest.spyOn(objectService, 'searchObjects');

  beforeEach(() => {
    _deriveObjectIdSpy.mockReset();
    createSpy.mockReset();
    deleteSpy.mockReset();
    pruneOrphanedMetadataSpy.mockReset();
    pruneOrphanedTagsSpy.mockReset();
    searchObjectsSpy.mockReset();
  });

  afterAll(() => {
    _deriveObjectIdSpy.mockRestore();
    createSpy.mockRestore();
    deleteSpy.mockRestore();
    pruneOrphanedMetadataSpy.mockRestore();
    pruneOrphanedTagsSpy.mockRestore();
    searchObjectsSpy.mockRestore();
  });

  it('should return object when already synced', async () => {
    const comsObject = { id: validUuidv4 };
    headObjectSpy.mockResolvedValue({});
    searchObjectsSpy.mockResolvedValue([comsObject]);

    const result = await service.syncObject(path, bucketId);

    expect(result).toBeTruthy();
    expect(result.modified).toBeFalsy();
    expect(result.object).toEqual(comsObject);

    expect(ObjectModel.startTransaction).toHaveBeenCalledTimes(1);
    expect(_deriveObjectIdSpy).toHaveBeenCalledTimes(0);
    expect(createSpy).toHaveBeenCalledTimes(0);
    expect(deleteSpy).toHaveBeenCalledTimes(0);
    expect(headObjectSpy).toHaveBeenCalledTimes(1);
    expect(headObjectSpy).toHaveBeenCalledWith(expect.objectContaining({
      filePath: path, bucketId: bucketId
    }));
    expect(pruneOrphanedMetadataSpy).toHaveBeenCalledTimes(0);
    expect(pruneOrphanedTagsSpy).toHaveBeenCalledTimes(0);
    expect(searchObjectsSpy).toHaveBeenCalledTimes(1);
    expect(searchObjectsSpy).toHaveBeenCalledWith(expect.objectContaining({
      path: path, bucketId: bucketId
    }), expect.any(Object));
    expect(objectModelTrx.commit).toHaveBeenCalledTimes(1);
  });

  it('should insert new object when not in COMS', async () => {
    const comsObject = {};
    _deriveObjectIdSpy.mockResolvedValue(validUuidv4);
    createSpy.mockResolvedValue(comsObject);
    headObjectSpy.mockResolvedValue({});
    searchObjectsSpy.mockResolvedValue(undefined);

    const result = await service.syncObject(path, bucketId);

    expect(result).toBeTruthy();
    expect(result.modified).toBeTruthy();
    expect(result.object).toEqual(comsObject);

    expect(ObjectModel.startTransaction).toHaveBeenCalledTimes(1);
    expect(_deriveObjectIdSpy).toHaveBeenCalledTimes(1);
    expect(_deriveObjectIdSpy).toHaveBeenCalledWith(expect.any(Object), path, bucketId);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith(expect.objectContaining({
      id: validUuidv4,
      name: path.match(/(?!.*\/)(.*)$/)[0],
      path: path,
      bucketId: bucketId,
      userId: expect.any(String)
    }), expect.any(Object));
    expect(deleteSpy).toHaveBeenCalledTimes(0);
    expect(headObjectSpy).toHaveBeenCalledTimes(1);
    expect(headObjectSpy).toHaveBeenCalledWith(expect.objectContaining({
      filePath: path, bucketId: bucketId
    }));
    expect(pruneOrphanedMetadataSpy).toHaveBeenCalledTimes(0);
    expect(pruneOrphanedTagsSpy).toHaveBeenCalledTimes(0);
    expect(searchObjectsSpy).toHaveBeenCalledTimes(1);
    expect(searchObjectsSpy).toHaveBeenCalledWith(expect.objectContaining({
      path: path, bucketId: bucketId
    }), expect.any(Object));
    expect(objectModelTrx.commit).toHaveBeenCalledTimes(1);
  });

  it('should drop COMS object when not in S3', async () => {
    const comsObject = { id: validUuidv4 };
    deleteSpy.mockResolvedValue(comsObject);
    headObjectSpy.mockRejectedValue({});
    pruneOrphanedMetadataSpy.mockResolvedValue(0);
    pruneOrphanedTagsSpy.mockResolvedValue(0);
    searchObjectsSpy.mockResolvedValue([comsObject]);

    const result = await service.syncObject(path, bucketId);

    expect(result).toBeTruthy();
    expect(result.modified).toBeFalsy();
    expect(result.object).toBeUndefined();

    expect(ObjectModel.startTransaction).toHaveBeenCalledTimes(1);
    expect(_deriveObjectIdSpy).toHaveBeenCalledTimes(0);
    expect(createSpy).toHaveBeenCalledTimes(0);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
    expect(deleteSpy).toHaveBeenCalledWith(validUuidv4, expect.any(Object));
    expect(headObjectSpy).toHaveBeenCalledTimes(1);
    expect(headObjectSpy).toHaveBeenCalledWith(expect.objectContaining({
      filePath: path, bucketId: bucketId
    }));
    expect(pruneOrphanedMetadataSpy).toHaveBeenCalledTimes(1);
    expect(pruneOrphanedMetadataSpy).toHaveBeenCalledWith(expect.any(Object));
    expect(pruneOrphanedTagsSpy).toHaveBeenCalledTimes(1);
    expect(pruneOrphanedTagsSpy).toHaveBeenCalledWith(expect.any(Object));
    expect(searchObjectsSpy).toHaveBeenCalledTimes(1);
    expect(searchObjectsSpy).toHaveBeenCalledWith(expect.objectContaining({
      path: path, bucketId: bucketId
    }), expect.any(Object));
    expect(objectModelTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('syncVersions', () => {
  const createSpy = jest.spyOn(versionService, 'create');
  const listSpy = jest.spyOn(versionService, 'list');
  const listAllObjectVersionsSpy = jest.spyOn(storageService, 'listAllObjectVersions');
  const readSpy = jest.spyOn(objectService, 'read');
  const updateSpy = jest.spyOn(versionService, 'update');
  const updateIsLatestSpy = jest.spyOn(versionService, 'updateIsLatest');

  const comsObject = {
    id: validUuidv4,
    path: path,
    bucketId: validUuidv4
  };

  beforeEach(() => {
    createSpy.mockReset();
    headObjectSpy.mockReset();
    listSpy.mockReset();
    listAllObjectVersionsSpy.mockReset();
    readSpy.mockReset();
    updateSpy.mockReset();
    updateIsLatestSpy.mockReset();
  });

  afterAll(() => {
    createSpy.mockRestore();
    listSpy.mockRestore();
    listAllObjectVersionsSpy.mockRestore();
    readSpy.mockRestore();
    updateSpy.mockRestore();
    updateIsLatestSpy.mockRestore();
  });

  describe('Common', () => {
    it('should look up COMS object when given an objectId', async () => {
      createSpy.mockResolvedValue({});
      headObjectSpy.mockResolvedValue({});
      listSpy.mockResolvedValue([]);
      listAllObjectVersionsSpy.mockResolvedValue({ DeleteMarkers: [{}], Versions: [{}] });
      readSpy.mockResolvedValue(comsObject);

      const result = await service.syncVersions(validUuidv4);

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBeTruthy();
      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining([expect.objectContaining({
        modified: true,
        version: expect.any(Object)
      })]));

      expect(Version.startTransaction).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(Version.delete).toHaveBeenCalledTimes(0);
      expect(headObjectSpy).toHaveBeenCalledTimes(1);
      expect(headObjectSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: comsObject.path,
        bucketId: comsObject.bucketId
      }));
      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenCalledWith(validUuidv4, expect.any(Object));
      expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(1);
      expect(listAllObjectVersionsSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: comsObject.path,
        bucketId: comsObject.bucketId
      }));
      expect(readSpy).toHaveBeenCalledTimes(1);
      expect(readSpy).toHaveBeenCalledWith(validUuidv4, expect.any(Object));
      expect(updateSpy).toHaveBeenCalledTimes(0);
      expect(updateIsLatestSpy).toHaveBeenCalledTimes(0);
      expect(versionTrx.commit).toHaveBeenCalledTimes(1);
    });

    it('should use COMS object when given an object', async () => {
      createSpy.mockResolvedValue({});
      headObjectSpy.mockResolvedValue({});
      listSpy.mockResolvedValue([]);
      listAllObjectVersionsSpy.mockResolvedValue({ DeleteMarkers: [{}], Versions: [{}] });

      const result = await service.syncVersions(comsObject);

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBeTruthy();
      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining([expect.objectContaining({
        modified: true,
        version: expect.any(Object)
      })]));

      expect(Version.startTransaction).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(Version.delete).toHaveBeenCalledTimes(0);
      expect(headObjectSpy).toHaveBeenCalledTimes(1);
      expect(headObjectSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: comsObject.path,
        bucketId: comsObject.bucketId
      }));
      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenCalledWith(validUuidv4, expect.any(Object));
      expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(1);
      expect(listAllObjectVersionsSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: comsObject.path,
        bucketId: comsObject.bucketId
      }));
      expect(readSpy).toHaveBeenCalledTimes(0);
      expect(updateSpy).toHaveBeenCalledTimes(0);
      expect(updateIsLatestSpy).toHaveBeenCalledTimes(0);
      expect(versionTrx.commit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Unversioned Bucket', () => {
    it('should create a new version if not already present', async () => {
      createSpy.mockResolvedValue({});
      headObjectSpy.mockResolvedValue({ ContentType: 'application/octet-stream' });
      listSpy.mockResolvedValue([]);
      listAllObjectVersionsSpy.mockResolvedValue({
        DeleteMarkers: [],
        Versions: [{ IsLatest: true, VersionId: 'null' }]
      });

      const result = await service.syncVersions(comsObject);

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBeTruthy();
      expect(result).toHaveLength(1);
      expect(result).toEqual(expect.arrayContaining([expect.objectContaining({
        modified: true,
        version: expect.any(Object)
      })]));

      expect(Version.startTransaction).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(Version.delete).toHaveBeenCalledTimes(0);
      expect(headObjectSpy).toHaveBeenCalledTimes(1);
      expect(headObjectSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: comsObject.path,
        bucketId: comsObject.bucketId
      }));
      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenCalledWith(validUuidv4, expect.any(Object));
      expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(1);
      expect(listAllObjectVersionsSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: comsObject.path,
        bucketId: comsObject.bucketId
      }));
      expect(readSpy).toHaveBeenCalledTimes(0);
      expect(updateSpy).toHaveBeenCalledTimes(0);
      expect(updateIsLatestSpy).toHaveBeenCalledTimes(0);
      expect(versionTrx.commit).toHaveBeenCalledTimes(1);
    });

    it('should update existing version if mimeType has changed', async () => {
      headObjectSpy.mockResolvedValue({ ContentType: 'application/octet-stream' });
      listSpy.mockResolvedValue([{ etag: 'etag', mimeType: 'text/plain', s3VersionId: null }]);
      listAllObjectVersionsSpy.mockResolvedValue({
        DeleteMarkers: [],
        Versions: [{ ETag: 'etag', IsLatest: true, VersionId: 'null' }]
      });
      updateSpy.mockResolvedValue({});

      const result = await service.syncVersions(comsObject);

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBeTruthy();
      expect(result).toHaveLength(1);
      expect(result).toEqual(expect.arrayContaining([expect.objectContaining({
        modified: true,
        version: expect.any(Object)
      })]));

      expect(Version.startTransaction).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(0);
      expect(Version.delete).toHaveBeenCalledTimes(0);
      expect(headObjectSpy).toHaveBeenCalledTimes(1);
      expect(headObjectSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: comsObject.path,
        bucketId: comsObject.bucketId
      }));
      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenCalledWith(validUuidv4, expect.any(Object));
      expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(1);
      expect(listAllObjectVersionsSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: comsObject.path,
        bucketId: comsObject.bucketId
      }));
      expect(readSpy).toHaveBeenCalledTimes(0);
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateIsLatestSpy).toHaveBeenCalledTimes(0);
      expect(versionTrx.commit).toHaveBeenCalledTimes(1);
    });

    it('should update existing version if etag has changed', async () => {
      headObjectSpy.mockResolvedValue({ ContentType: 'application/octet-stream' });
      listSpy.mockResolvedValue([{ etag: 'old', mimeType: 'application/octet-stream', s3VersionId: null }]);
      listAllObjectVersionsSpy.mockResolvedValue({
        DeleteMarkers: [],
        Versions: [{ ETag: 'new', IsLatest: true, VersionId: 'null' }]
      });
      updateSpy.mockResolvedValue({});

      const result = await service.syncVersions(comsObject);

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBeTruthy();
      expect(result).toHaveLength(1);
      expect(result).toEqual(expect.arrayContaining([expect.objectContaining({
        modified: true,
        version: expect.any(Object)
      })]));

      expect(Version.startTransaction).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(0);
      expect(Version.delete).toHaveBeenCalledTimes(0);
      expect(headObjectSpy).toHaveBeenCalledTimes(1);
      expect(headObjectSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: comsObject.path,
        bucketId: comsObject.bucketId
      }));
      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenCalledWith(validUuidv4, expect.any(Object));
      expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(1);
      expect(listAllObjectVersionsSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: comsObject.path,
        bucketId: comsObject.bucketId
      }));
      expect(readSpy).toHaveBeenCalledTimes(0);
      expect(updateSpy).toHaveBeenCalledTimes(1);
      expect(updateIsLatestSpy).toHaveBeenCalledTimes(0);
      expect(versionTrx.commit).toHaveBeenCalledTimes(1);
    });

    it('should update nothing when version record not modified', async () => {
      headObjectSpy.mockResolvedValue({ ContentType: 'application/octet-stream' });
      listSpy.mockResolvedValue([{ etag: 'etag', mimeType: 'application/octet-stream', s3VersionId: null }]);
      listAllObjectVersionsSpy.mockResolvedValue({
        DeleteMarkers: [],
        Versions: [{ ETag: 'etag', IsLatest: true, VersionId: 'null' }]
      });
      updateSpy.mockResolvedValue({});

      const result = await service.syncVersions(comsObject);

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBeTruthy();
      expect(result).toHaveLength(1);
      expect(result).toEqual(expect.arrayContaining([expect.objectContaining({
        version: expect.any(Object)
      })]));

      expect(Version.startTransaction).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(0);
      expect(Version.delete).toHaveBeenCalledTimes(0);
      expect(headObjectSpy).toHaveBeenCalledTimes(1);
      expect(headObjectSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: comsObject.path,
        bucketId: comsObject.bucketId
      }));
      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenCalledWith(validUuidv4, expect.any(Object));
      expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(1);
      expect(listAllObjectVersionsSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: comsObject.path,
        bucketId: comsObject.bucketId
      }));
      expect(readSpy).toHaveBeenCalledTimes(0);
      expect(updateSpy).toHaveBeenCalledTimes(0);
      expect(updateIsLatestSpy).toHaveBeenCalledTimes(0);
      expect(versionTrx.commit).toHaveBeenCalledTimes(1);
    });
  });

  describe('Versioned Bucket', () => {
    it('should drop COMS versions that are not in S3', async () => {
      createSpy.mockResolvedValue({});
      headObjectSpy.mockResolvedValue({});
      // extra versions in coms to delete
      listSpy.mockResolvedValue([
        { s3VersionId: validUuidv4 },
        { s3VersionId: validUuidv4 },
        { s3VersionId: validUuidv4 }
      ]);
      listAllObjectVersionsSpy.mockResolvedValue({ DeleteMarkers: [{}], Versions: [{}] });

      const result = await service.syncVersions(comsObject);

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBeTruthy();
      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining([expect.objectContaining({
        modified: true,
        version: expect.any(Object)
      })]));

      expect(Version.startTransaction).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(2);
      expect(Version.delete).toHaveBeenCalledTimes(1);

      expect(headObjectSpy).toHaveBeenCalledTimes(1);
      expect(headObjectSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: comsObject.path,
        bucketId: comsObject.bucketId
      }));
      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenCalledWith(validUuidv4, expect.any(Object));
      expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(1);
      expect(listAllObjectVersionsSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: comsObject.path,
        bucketId: comsObject.bucketId
      }));
      expect(readSpy).toHaveBeenCalledTimes(0);
      expect(updateSpy).toHaveBeenCalledTimes(0);
      expect(updateIsLatestSpy).toHaveBeenCalledTimes(0);
      expect(versionTrx.commit).toHaveBeenCalledTimes(1);
    });

    it('should update isLatest values when evaluated S3 version IsLatest', async () => {
      createSpy.mockResolvedValue({});
      headObjectSpy.mockResolvedValue({});
      listSpy.mockResolvedValue([{ id: validUuidv4, s3VersionId: validUuidv4 }]);
      listAllObjectVersionsSpy.mockResolvedValue({
        DeleteMarkers: [{}],
        Versions: [{ IsLatest: true, VersionId: validUuidv4 }]
      });
      updateIsLatestSpy.mockResolvedValue([{}]);

      const result = await service.syncVersions(comsObject);

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBeTruthy();
      expect(result).toHaveLength(2);
      expect(result).toEqual(expect.arrayContaining([expect.objectContaining({
        modified: true,
        version: expect.any(Object)
      })]));

      expect(Version.startTransaction).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(Version.delete).toHaveBeenCalledTimes(0);
      expect(headObjectSpy).toHaveBeenCalledTimes(0);
      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenCalledWith(validUuidv4, expect.any(Object));
      expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(1);
      expect(listAllObjectVersionsSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: comsObject.path,
        bucketId: comsObject.bucketId
      }));
      expect(readSpy).toHaveBeenCalledTimes(0);
      expect(updateSpy).toHaveBeenCalledTimes(0);
      expect(updateIsLatestSpy).toHaveBeenCalledTimes(1);
      expect(updateIsLatestSpy).toHaveBeenCalledWith(validUuidv4, expect.any(Object));
      expect(versionTrx.commit).toHaveBeenCalledTimes(1);
    });

    it('should update nothing when version record not modified', async () => {
      createSpy.mockResolvedValue({});
      headObjectSpy.mockResolvedValue({});
      listSpy.mockResolvedValue([{ id: validUuidv4, s3VersionId: validUuidv4 }]);
      listAllObjectVersionsSpy.mockResolvedValue({
        DeleteMarkers: [{}],
        Versions: [{ VersionId: validUuidv4 }]
      });
      updateIsLatestSpy.mockResolvedValue([{}]);

      const result = await service.syncVersions(comsObject);

      expect(result).toBeTruthy();
      expect(Array.isArray(result)).toBeTruthy();
      expect(result).toEqual(expect.arrayContaining([expect.objectContaining({
        version: expect.any(Object)
      })]));

      expect(Version.startTransaction).toHaveBeenCalledTimes(1);
      expect(createSpy).toHaveBeenCalledTimes(1);
      expect(Version.delete).toHaveBeenCalledTimes(0);
      expect(headObjectSpy).toHaveBeenCalledTimes(0);
      expect(listSpy).toHaveBeenCalledTimes(1);
      expect(listSpy).toHaveBeenCalledWith(validUuidv4, expect.any(Object));
      expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(1);
      expect(listAllObjectVersionsSpy).toHaveBeenCalledWith(expect.objectContaining({
        filePath: comsObject.path,
        bucketId: comsObject.bucketId
      }));
      expect(readSpy).toHaveBeenCalledTimes(0);
      expect(updateSpy).toHaveBeenCalledTimes(0);
      expect(updateIsLatestSpy).toHaveBeenCalledTimes(0);
      expect(versionTrx.commit).toHaveBeenCalledTimes(1);
    });
  });
});

describe('syncTags', () => {
  const associateTagsSpy = jest.spyOn(tagService, 'associateTags');
  const dissociateTagsSpy = jest.spyOn(tagService, 'dissociateTags');
  const fetchTagsForVersionSpy = jest.spyOn(tagService, 'fetchTagsForVersion');

  const comsVersion = {
    id: validUuidv4,
    objectId: validUuidv4,
    s3VersionId: validUuidv4,
    isLatest: true
  };

  beforeEach(() => {
    associateTagsSpy.mockReset();
    dissociateTagsSpy.mockReset();
    fetchTagsForVersionSpy.mockReset();
  });

  afterAll(() => {
    associateTagsSpy.mockRestore();
    dissociateTagsSpy.mockRestore();
    fetchTagsForVersionSpy.mockRestore();
  });

  it('should short circuit if version is delete marker', async () => {
    getSpy.mockResolvedValue({ deleteMarker: true, ...comsVersion });

    const result = await service.syncTags(validUuidv4, path, bucketId);

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(0);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(associateTagsSpy).toHaveBeenCalledTimes(0);
    expect(dissociateTagsSpy).toHaveBeenCalledTimes(0);
    expect(fetchTagsForVersionSpy).toHaveBeenCalledTimes(0);
    expect(getObjectTaggingSpy).toHaveBeenCalledTimes(0);
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledWith(expect.objectContaining({ versionId: validUuidv4 }), expect.any(Object));
    expect(putObjectTaggingSpy).toHaveBeenCalledTimes(0);
    expect(versionTrx.commit).toHaveBeenCalledTimes(0);
  });

  it('should look up COMS version when given a versionId', async () => {
    fetchTagsForVersionSpy.mockResolvedValue([{}]);
    getObjectTaggingSpy.mockResolvedValue({});
    getSpy.mockResolvedValue(comsVersion);
    putObjectTaggingSpy.mockResolvedValue({});

    const result = await service.syncTags(validUuidv4, path, bucketId);

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(1);
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'coms-id', value: validUuidv4 })
    ]));

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(associateTagsSpy).toHaveBeenCalledTimes(1);
    expect(associateTagsSpy).toHaveBeenCalledWith(comsVersion.id, expect.any(Array), expect.any(String), expect.any(Object));
    expect(dissociateTagsSpy).toHaveBeenCalledTimes(0);
    expect(fetchTagsForVersionSpy).toHaveBeenCalledTimes(1);
    expect(fetchTagsForVersionSpy).toHaveBeenCalledWith(expect.objectContaining({
      versionIds: comsVersion.id
    }), expect.any(Object));
    expect(getObjectTaggingSpy).toHaveBeenCalledTimes(1);
    expect(getObjectTaggingSpy).toHaveBeenCalledWith(expect.objectContaining({
      filePath: path,
      s3VersionId: comsVersion.s3VersionId,
      bucketId: bucketId
    }));
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledWith(expect.objectContaining({ versionId: validUuidv4 }), expect.any(Object));
    expect(putObjectTaggingSpy).toHaveBeenCalledTimes(1);
    expect(putObjectTaggingSpy).toHaveBeenCalledWith(expect.objectContaining({
      filePath: path,
      tags: expect.arrayContaining([{
        Key: 'coms-id',
        Value: comsVersion.objectId
      }]),
      bucketId: bucketId,
    }));
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });

  it('should use COMS version when given a version', async () => {
    fetchTagsForVersionSpy.mockResolvedValue([{}]);
    getObjectTaggingSpy.mockResolvedValue({});
    putObjectTaggingSpy.mockResolvedValue({});

    const result = await service.syncTags(comsVersion, path, bucketId);

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(1);
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'coms-id', value: validUuidv4 })
    ]));

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(associateTagsSpy).toHaveBeenCalledTimes(1);
    expect(associateTagsSpy).toHaveBeenCalledWith(comsVersion.id, expect.any(Array), expect.any(String), expect.any(Object));
    expect(dissociateTagsSpy).toHaveBeenCalledTimes(0);
    expect(fetchTagsForVersionSpy).toHaveBeenCalledTimes(1);
    expect(fetchTagsForVersionSpy).toHaveBeenCalledWith(expect.objectContaining({
      versionIds: comsVersion.id
    }), expect.any(Object));
    expect(getObjectTaggingSpy).toHaveBeenCalledTimes(1);
    expect(getObjectTaggingSpy).toHaveBeenCalledWith(expect.objectContaining({
      filePath: path,
      s3VersionId: comsVersion.s3VersionId,
      bucketId: bucketId
    }));
    expect(getSpy).toHaveBeenCalledTimes(0);
    expect(putObjectTaggingSpy).toHaveBeenCalledTimes(1);
    expect(putObjectTaggingSpy).toHaveBeenCalledWith(expect.objectContaining({
      filePath: path,
      tags: expect.arrayContaining([{
        Key: 'coms-id',
        Value: comsVersion.objectId
      }]),
      bucketId: bucketId,
    }));
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });

  it('should not write coms-id tag when coms version is not latest', async () => {
    fetchTagsForVersionSpy.mockResolvedValue([{}]);
    getObjectTaggingSpy.mockResolvedValue({});
    putObjectTaggingSpy.mockResolvedValue({});

    comsVersion.isLatest = false;
    const result = await service.syncTags(comsVersion, path, bucketId);
    // reset for other tests
    comsVersion.isLatest = true;

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(0);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(associateTagsSpy).toHaveBeenCalledTimes(0);
    expect(dissociateTagsSpy).toHaveBeenCalledTimes(0);
    expect(fetchTagsForVersionSpy).toHaveBeenCalledTimes(1);
    expect(fetchTagsForVersionSpy).toHaveBeenCalledWith(expect.objectContaining({
      versionIds: comsVersion.id
    }), expect.any(Object));
    expect(getObjectTaggingSpy).toHaveBeenCalledTimes(1);
    expect(getObjectTaggingSpy).toHaveBeenCalledWith(expect.objectContaining({
      filePath: path,
      s3VersionId: comsVersion.s3VersionId,
      bucketId: bucketId
    }));
    expect(getSpy).toHaveBeenCalledTimes(0);
    expect(putObjectTaggingSpy).toHaveBeenCalledTimes(0);
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });

  it('should write coms-id tag when coms version is latest', async () => {
    fetchTagsForVersionSpy.mockResolvedValue([{}]);
    getObjectTaggingSpy.mockResolvedValue({});
    putObjectTaggingSpy.mockResolvedValue({});

    const result = await service.syncTags(comsVersion, path, bucketId);

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(1);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(associateTagsSpy).toHaveBeenCalledTimes(1);
    expect(dissociateTagsSpy).toHaveBeenCalledTimes(0);
    expect(fetchTagsForVersionSpy).toHaveBeenCalledTimes(1);
    expect(fetchTagsForVersionSpy).toHaveBeenCalledWith(expect.objectContaining({
      versionIds: comsVersion.id
    }), expect.any(Object));
    expect(getObjectTaggingSpy).toHaveBeenCalledTimes(1);
    expect(getObjectTaggingSpy).toHaveBeenCalledWith(expect.objectContaining({
      filePath: path,
      s3VersionId: comsVersion.s3VersionId,
      bucketId: bucketId
    }));
    expect(getSpy).toHaveBeenCalledTimes(0);
    expect(putObjectTaggingSpy).toHaveBeenCalledTimes(1);
    expect(putObjectTaggingSpy).toHaveBeenCalledWith(expect.objectContaining({
      filePath: path,
      tags: expect.arrayContaining([{
        Key: 'coms-id',
        Value: comsVersion.objectId
      }]),
      bucketId: bucketId,
    }));
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });

  it('should not write coms-id tag when there are already 10 tags', async () => {
    fetchTagsForVersionSpy.mockResolvedValue([{}]);
    getObjectTaggingSpy.mockResolvedValue({
      TagSet: [{}, {}, {}, {}, {}, {}, {}, {}, {}, {}]
    });
    putObjectTaggingSpy.mockResolvedValue({});

    const result = await service.syncTags(comsVersion, path, bucketId);

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(10);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(associateTagsSpy).toHaveBeenCalledTimes(1);
    expect(associateTagsSpy).toHaveBeenCalledWith(comsVersion.id, expect.any(Array), expect.any(String), expect.any(Object));
    expect(dissociateTagsSpy).toHaveBeenCalledTimes(0);
    expect(fetchTagsForVersionSpy).toHaveBeenCalledTimes(1);
    expect(fetchTagsForVersionSpy).toHaveBeenCalledWith(expect.objectContaining({
      versionIds: comsVersion.id
    }), expect.any(Object));
    expect(getObjectTaggingSpy).toHaveBeenCalledTimes(1);
    expect(getObjectTaggingSpy).toHaveBeenCalledWith(expect.objectContaining({
      filePath: path,
      s3VersionId: comsVersion.s3VersionId,
      bucketId: bucketId
    }));
    expect(getSpy).toHaveBeenCalledTimes(0);
    expect(putObjectTaggingSpy).toHaveBeenCalledTimes(0);
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });

  it('should not write coms-id tag when it already exists', async () => {
    fetchTagsForVersionSpy.mockResolvedValue([{}]);
    getObjectTaggingSpy.mockResolvedValue({
      TagSet: [{
        Key: 'coms-id',
        Value: comsVersion.objectId
      }]
    });
    putObjectTaggingSpy.mockResolvedValue({});

    const result = await service.syncTags(comsVersion, path, bucketId);

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(1);
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'coms-id', value: validUuidv4 })
    ]));

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(associateTagsSpy).toHaveBeenCalledTimes(1);
    expect(associateTagsSpy).toHaveBeenCalledWith(comsVersion.id, expect.any(Array), expect.any(String), expect.any(Object));
    expect(dissociateTagsSpy).toHaveBeenCalledTimes(0);
    expect(fetchTagsForVersionSpy).toHaveBeenCalledTimes(1);
    expect(fetchTagsForVersionSpy).toHaveBeenCalledWith(expect.objectContaining({
      versionIds: comsVersion.id
    }), expect.any(Object));
    expect(getObjectTaggingSpy).toHaveBeenCalledTimes(1);
    expect(getObjectTaggingSpy).toHaveBeenCalledWith(expect.objectContaining({
      filePath: path,
      s3VersionId: comsVersion.s3VersionId,
      bucketId: bucketId
    }));
    expect(getSpy).toHaveBeenCalledTimes(0);
    expect(putObjectTaggingSpy).toHaveBeenCalledTimes(0);
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });

  it('should dissociate and associate tags appropriately', async () => {
    fetchTagsForVersionSpy.mockResolvedValue([{
      tagset: [{
        key: 'currentKey',
        value: 'currentValue'
      },
      {
        key: 'oldKey',
        value: 'oldValue'
      }]
    }]);
    getObjectTaggingSpy.mockResolvedValue({
      TagSet: [{
        Key: 'coms-id',
        Value: comsVersion.objectId
      },
      {
        Key: 'currentKey',
        Value: 'currentValue'
      },
      {
        Key: 'newKey',
        Value: 'newValue'
      }]
    });
    putObjectTaggingSpy.mockResolvedValue({});

    const result = await service.syncTags(comsVersion, path, bucketId);

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(3);
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'coms-id', value: validUuidv4 }),
      expect.objectContaining({ key: 'currentKey', value: 'currentValue' }),
      expect.objectContaining({ key: 'newKey', value: 'newValue' })
    ]));

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(associateTagsSpy).toHaveBeenCalledTimes(1);
    expect(associateTagsSpy).toHaveBeenCalledWith(comsVersion.id, expect.arrayContaining([expect.objectContaining({
      key: 'newKey',
      value: 'newValue'
    })]), expect.any(String), expect.any(Object));
    expect(dissociateTagsSpy).toHaveBeenCalledTimes(1);
    expect(dissociateTagsSpy).toHaveBeenCalledWith(comsVersion.id, expect.arrayContaining([expect.objectContaining({
      key: 'oldKey',
      value: 'oldValue'
    })]), expect.any(Object));
    expect(fetchTagsForVersionSpy).toHaveBeenCalledTimes(1);
    expect(fetchTagsForVersionSpy).toHaveBeenCalledWith(expect.objectContaining({
      versionIds: comsVersion.id
    }), expect.any(Object));
    expect(getObjectTaggingSpy).toHaveBeenCalledTimes(1);
    expect(getObjectTaggingSpy).toHaveBeenCalledWith(expect.objectContaining({
      filePath: path,
      s3VersionId: comsVersion.s3VersionId,
      bucketId: bucketId
    }));
    expect(getSpy).toHaveBeenCalledTimes(0);
    expect(putObjectTaggingSpy).toHaveBeenCalledTimes(0);
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('syncMetadata', () => {
  const associateMetadataSpy = jest.spyOn(metadataService, 'associateMetadata');
  const dissociateMetadataSpy = jest.spyOn(metadataService, 'dissociateMetadata');
  const fetchMetadataForVersionSpy = jest.spyOn(metadataService, 'fetchMetadataForVersion');

  const comsVersion = {
    id: validUuidv4,
    objectId: validUuidv4,
    s3VersionId: validUuidv4
  };

  beforeEach(() => {
    associateMetadataSpy.mockReset();
    dissociateMetadataSpy.mockReset();
    fetchMetadataForVersionSpy.mockReset();
  });

  afterAll(() => {
    associateMetadataSpy.mockRestore();
    dissociateMetadataSpy.mockRestore();
    fetchMetadataForVersionSpy.mockRestore();
  });

  it('should short circuit if version is delete marker', async () => {
    getSpy.mockResolvedValue({ deleteMarker: true, ...comsVersion });

    const result = await service.syncMetadata(validUuidv4, path, bucketId);

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(0);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(associateMetadataSpy).toHaveBeenCalledTimes(0);
    expect(dissociateMetadataSpy).toHaveBeenCalledTimes(0);
    expect(fetchMetadataForVersionSpy).toHaveBeenCalledTimes(0);
    expect(getObjectTaggingSpy).toHaveBeenCalledTimes(0);
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledWith(expect.objectContaining({ versionId: validUuidv4 }), expect.any(Object));
    expect(putObjectTaggingSpy).toHaveBeenCalledTimes(0);
    expect(versionTrx.commit).toHaveBeenCalledTimes(0);
  });

  it('should look up COMS version when given a versionId', async () => {
    fetchMetadataForVersionSpy.mockResolvedValue([]);
    getSpy.mockResolvedValue(comsVersion);
    headObjectSpy.mockResolvedValue({});

    const result = await service.syncMetadata(validUuidv4, path, bucketId);

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(0);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(associateMetadataSpy).toHaveBeenCalledTimes(0);
    expect(dissociateMetadataSpy).toHaveBeenCalledTimes(0);
    expect(fetchMetadataForVersionSpy).toHaveBeenCalledTimes(1);
    expect(fetchMetadataForVersionSpy).toHaveBeenCalledWith(expect.objectContaining({
      versionIds: comsVersion.id
    }), expect.any(Object));
    expect(getSpy).toHaveBeenCalledTimes(1);
    expect(getSpy).toHaveBeenCalledWith(expect.objectContaining({ versionId: validUuidv4 }), expect.any(Object));
    expect(headObjectSpy).toHaveBeenCalledTimes(1);
    expect(headObjectSpy).toHaveBeenCalledWith(expect.objectContaining({
      filePath: path,
      s3VersionId: comsVersion.s3VersionId,
      bucketId: bucketId
    }));
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });

  it('should use COMS version when given a version', async () => {
    fetchMetadataForVersionSpy.mockResolvedValue([]);
    headObjectSpy.mockResolvedValue({});

    const result = await service.syncMetadata(comsVersion, path, bucketId);

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(0);

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(associateMetadataSpy).toHaveBeenCalledTimes(0);
    expect(dissociateMetadataSpy).toHaveBeenCalledTimes(0);
    expect(fetchMetadataForVersionSpy).toHaveBeenCalledTimes(1);
    expect(fetchMetadataForVersionSpy).toHaveBeenCalledWith(expect.objectContaining({
      versionIds: comsVersion.id
    }), expect.any(Object));
    expect(getSpy).toHaveBeenCalledTimes(0);
    expect(headObjectSpy).toHaveBeenCalledTimes(1);
    expect(headObjectSpy).toHaveBeenCalledWith(expect.objectContaining({
      filePath: path,
      s3VersionId: comsVersion.s3VersionId,
      bucketId: bucketId
    }));
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });

  it('should dissociate and associate metadata appropriately', async () => {
    fetchMetadataForVersionSpy.mockResolvedValue([{
      metadata: [{
        key: 'currentKey',
        value: 'currentValue'
      },
      {
        key: 'oldKey',
        value: 'oldValue'
      }]
    }]);
    headObjectSpy.mockResolvedValue({
      Metadata: {
        currentKey: 'currentValue',
        newKey: 'newValue'
      }
    });

    const result = await service.syncMetadata(comsVersion, path, bucketId);

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'currentKey', value: 'currentValue' }),
      expect.objectContaining({ key: 'newKey', value: 'newValue' })
    ]));

    expect(Version.startTransaction).toHaveBeenCalledTimes(1);
    expect(associateMetadataSpy).toHaveBeenCalledTimes(1);
    expect(associateMetadataSpy).toHaveBeenCalledWith(comsVersion.id, expect.arrayContaining([expect.objectContaining({
      key: 'newKey',
      value: 'newValue'
    })]), expect.any(String), expect.any(Object));
    expect(dissociateMetadataSpy).toHaveBeenCalledTimes(1);
    expect(dissociateMetadataSpy).toHaveBeenCalledWith(comsVersion.id, expect.arrayContaining([expect.objectContaining({
      key: 'oldKey',
      value: 'oldValue'
    })]), expect.any(Object));
    expect(fetchMetadataForVersionSpy).toHaveBeenCalledTimes(1);
    expect(fetchMetadataForVersionSpy).toHaveBeenCalledWith(expect.objectContaining({
      versionIds: comsVersion.id
    }), expect.any(Object));
    expect(getSpy).toHaveBeenCalledTimes(0);
    expect(headObjectSpy).toHaveBeenCalledTimes(1);
    expect(headObjectSpy).toHaveBeenCalledWith(expect.objectContaining({
      filePath: path,
      s3VersionId: comsVersion.s3VersionId,
      bucketId: bucketId
    }));
    expect(versionTrx.commit).toHaveBeenCalledTimes(1);
  });
});
