const { NIL: OBJECT_ID, NIL: SYSTEM_USER, NIL: VERSION_ID } = require('uuid');

const { resetReturnThis } = require('../../common/helper');
const ObjectModel = require('../../../src/db/models/tables/objectModel');
const Tag = require('../../../src/db/models/tables/tag');
const Version = require('../../../src/db/models/tables/version');
const VersionTag = require('../../../src/db/models/tables/versionTag');
const utils = require('../../../src/components/utils');

jest.mock('../../../src/db/models/tables/objectModel', () => ({
  commit: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),

  allowGraph: jest.fn().mockReturnThis(),
  modify: jest.fn().mockReturnThis(),
  modifyGraph: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  then: jest.fn().mockReturnThis(),
  withGraphJoined: jest.fn().mockReturnThis()
}));
jest.mock('../../../src/db/models/tables/tag', () => ({
  commit: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),

  allowGraph: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  filter: jest.fn().mockReturnThis(),
  find: jest.fn().mockReturnThis(),
  joinRelated: jest.fn().mockReturnThis(),
  map: jest.fn().mockReturnThis(),
  modify: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  whereIn: jest.fn().mockReturnThis(),
  whereNull: jest.fn().mockReturnThis(),
  withGraphJoined: jest.fn().mockReturnThis()
}));
jest.mock('../../../src/db/models/tables/version', () => ({
  commit: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),

  allowGraph: jest.fn().mockReturnThis(),
  modify: jest.fn().mockReturnThis(),
  modifyGraph: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  then: jest.fn().mockReturnThis(),
  withGraphJoined: jest.fn().mockReturnThis()
}));
jest.mock('../../../src/db/models/tables/versionTag', () => ({
  commit: jest.fn().mockReturnThis(),
  startTransaction: jest.fn().mockReturnThis(),

  allowGraph: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  modify: jest.fn().mockReturnThis(),
  query: jest.fn().mockReturnThis(),
  some: jest.fn().mockReturnThis(),
  where: jest.fn().mockReturnThis(),
  withGraphJoined: jest.fn().mockReturnThis()
}));

const service = require('../../../src/services/tag');

const params = { tagset: [{ key: 'C', value: '10' }], objectIds: [OBJECT_ID], userId: SYSTEM_USER };
const tags = [{ key: 'A', value: '1' }, { key: 'B', value: '2' }];
const versionId = VERSION_ID;

beforeEach(() => {
  jest.clearAllMocks();
  resetReturnThis(ObjectModel);
  resetReturnThis(Tag);
  resetReturnThis(Version);
  resetReturnThis(VersionTag);
});

describe('replaceTags', () => {
  const getObjectsByKeyValueSpy = jest.spyOn(utils, 'getObjectsByKeyValue');
  const associateTagsSpy = jest.spyOn(service, 'associateTags');

  beforeEach(() => {
    getObjectsByKeyValueSpy.mockReset();
    associateTagsSpy.mockReset();
  });

  afterAll(() => {
    getObjectsByKeyValueSpy.mockRestore();
    associateTagsSpy.mockRestore();
  });

  it('Makes the incoming list of tags the definitive set associated with versionId', async () => {
    getObjectsByKeyValueSpy.mockResolvedValue(...tags);
    associateTagsSpy.mockResolvedValue(...tags);
    await service.replaceTags(versionId, tags);

    expect(Tag.startTransaction).toHaveBeenCalledTimes(1);
    expect(Tag.query).toHaveBeenCalledTimes(1);
    expect(Tag.query).toHaveBeenCalledWith(expect.anything());
    expect(Tag.joinRelated).toHaveBeenCalledTimes(1);
    expect(Tag.joinRelated).toBeCalledWith('versionTag');
    expect(Tag.where).toHaveBeenCalledTimes(1);
    expect(Tag.where).toBeCalledWith('versionId', versionId);
    expect(Tag.commit).toHaveBeenCalledTimes(1);
  });
});

describe('associateTags', () => {
  const createTagsSpy = jest.spyOn(service, 'createTags');

  beforeEach(() => {
    createTagsSpy.mockReset();
  });

  afterAll(() => {
    createTagsSpy.mockRestore();
  });

  it('CreateTags to create new Tag records associates new tags to the versionId', async () => {
    createTagsSpy.mockResolvedValue([{ key: 'C', value: '10' }]);

    await service.associateTags(versionId, tags);

    expect(Tag.startTransaction).toHaveBeenCalledTimes(1);
    expect(VersionTag.query).toHaveBeenCalledTimes(1);
    expect(VersionTag.query).toHaveBeenCalledWith(expect.anything());
    expect(VersionTag.modify).toHaveBeenCalledTimes(1);
    expect(VersionTag.modify).toHaveBeenCalledWith('filterVersionId', versionId);
    expect(VersionTag.some).toHaveBeenCalledTimes(1);
    expect(Tag.commit).toHaveBeenCalledTimes(1);
  });
});

describe('dissociateTags', () => {
  it('Dissociates all provided tags from a versionId', async () => {
    await service.dissociateTags(versionId, tags);

    expect(Tag.startTransaction).toHaveBeenCalledTimes(1);
    expect(VersionTag.query).toHaveBeenCalledTimes(2);
    expect(VersionTag.query).toHaveBeenCalledWith(expect.anything());
    expect(VersionTag.allowGraph).toHaveBeenCalledTimes(2);
    expect(VersionTag.allowGraph).toBeCalledWith('tag');
    expect(VersionTag.withGraphJoined).toHaveBeenCalledTimes(2);
    expect(VersionTag.withGraphJoined).toBeCalledWith('tag');
    expect(VersionTag.where).toHaveBeenCalledTimes(2);
    expect(VersionTag.modify).toHaveBeenCalledTimes(2);
    expect(VersionTag.modify).toBeCalledWith('filterVersionId', versionId);
    expect(VersionTag.delete).toHaveBeenCalledTimes(2);
    expect(Tag.commit).toHaveBeenCalledTimes(1);
  });
});

describe('pruneOrphanedTags', () => {
  it('Deletes tag records if they are no longer related to any versions', async () => {
    await service.pruneOrphanedTags();

    expect(Tag.startTransaction).toHaveBeenCalledTimes(1);
    expect(Tag.query).toHaveBeenCalledTimes(2);
    expect(Tag.query).toHaveBeenCalledWith(expect.anything());
    expect(Tag.allowGraph).toHaveBeenCalledTimes(1);
    expect(Tag.allowGraph).toBeCalledWith('versionTag');
    expect(Tag.withGraphJoined).toHaveBeenCalledTimes(1);
    expect(Tag.withGraphJoined).toBeCalledWith('versionTag');
    expect(Tag.select).toHaveBeenCalledTimes(1);
    expect(Tag.select).toBeCalledWith('tag.id');
    expect(Tag.whereNull).toHaveBeenCalledTimes(1);
    expect(Tag.whereNull).toBeCalledWith('versionTag.tagId');
    expect(Tag.delete).toHaveBeenCalledTimes(1);
    expect(Tag.delete).toBeCalledWith();
    expect(Tag.whereIn).toHaveBeenCalledTimes(1);
    expect(Tag.whereIn).toBeCalledWith('id', expect.any(Object));
    expect(Tag.commit).toHaveBeenCalledTimes(1);
  });
});

describe('createTags', () => {
  it('Inserts any tag records if they dont already exist in db', async () => {
    await service.createTags(tags);

    expect(Tag.startTransaction).toHaveBeenCalledTimes(1);
    expect(Tag.query).toHaveBeenCalledTimes(1);
    expect(Tag.query).toHaveBeenCalledWith(expect.anything());
    expect(Tag.select).toHaveBeenCalledTimes(1);
    expect(Tag.commit).toHaveBeenCalledTimes(1);
  });
});

describe('fetchTagsForObject', () => {
  it('Fetch matching tags on latest version of provided objects', async () => {
    service.fetchTagsForObject(params);

    expect(ObjectModel.query).toHaveBeenCalledTimes(1);
    expect(ObjectModel.select).toHaveBeenCalledTimes(1);
    expect(ObjectModel.select).toBeCalledWith('object.id AS objectId');
    expect(ObjectModel.allowGraph).toHaveBeenCalledTimes(1);
    expect(ObjectModel.allowGraph).toBeCalledWith('version.tag');
    expect(ObjectModel.withGraphJoined).toHaveBeenCalledTimes(1);
    expect(ObjectModel.withGraphJoined).toBeCalledWith('version.tag');
    expect(ObjectModel.modifyGraph).toHaveBeenCalledTimes(2);
    expect(ObjectModel.modify).toHaveBeenCalledTimes(2);
    expect(ObjectModel.modify).toBeCalledWith('filterIds', [SYSTEM_USER]);
    expect(ObjectModel.then).toHaveBeenCalledTimes(1);
  });
});

describe('fetchTagsForVersion', () => {
  it('Fetch tags for specific versions', async () => {
    service.fetchTagsForVersion(params);

    expect(Version.query).toHaveBeenCalledTimes(1);
    expect(Version.select).toHaveBeenCalledTimes(1);
    expect(Version.select).toBeCalledWith('version.id as versionId', 'version.s3VersionId');
    expect(Version.allowGraph).toHaveBeenCalledTimes(1);
    expect(Version.allowGraph).toBeCalledWith('tag as tagset');
    expect(Version.withGraphJoined).toHaveBeenCalledTimes(1);
    expect(Version.withGraphJoined).toBeCalledWith('tag as tagset');
    expect(Version.modifyGraph).toHaveBeenCalledTimes(1);
    expect(Version.modify).toHaveBeenCalledTimes(2);
    expect(Version.orderBy).toHaveBeenCalledTimes(1);
    expect(Version.orderBy).toBeCalledWith('version.createdAt', 'desc');
    expect(Version.then).toHaveBeenCalledTimes(1);
  });
});

describe('searchTags', () => {
  it('Search and filter for specific tag keys', async () => {
    service.searchTags([]);

    expect(Tag.query).toHaveBeenCalledTimes(1);
    expect(Tag.modify).toHaveBeenCalledTimes(1);
  });
});
