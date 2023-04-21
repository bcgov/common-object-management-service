const { NIL: OBJECT_ID, NIL: SYSTEM_USER, NIL: VERSION_ID } = require('uuid');

const { resetModel, trxBuilder } = require('../../common/helper');
const ObjectModel = require('../../../src/db/models/tables/objectModel');
const Tag = require('../../../src/db/models/tables/tag');
const Version = require('../../../src/db/models/tables/version');
const VersionTag = require('../../../src/db/models/tables/versionTag');
const utils = require('../../../src/components/utils');

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

const tagTrx = trxBuilder();
jest.mock('../../../src/db/models/tables/tag', () => ({
  startTransaction: jest.fn(),
  then: jest.fn(),

  allowGraph: jest.fn(),
  delete: jest.fn(),
  filter: jest.fn(),
  find: jest.fn(),
  joinRelated: jest.fn(),
  map: jest.fn(),
  modify: jest.fn(),
  query: jest.fn(),
  select: jest.fn(),
  where: jest.fn(),
  whereIn: jest.fn(),
  whereNull: jest.fn(),
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

const versionTagTrx = trxBuilder();
jest.mock('../../../src/db/models/tables/versionTag', () => ({
  startTransaction: jest.fn(),
  then: jest.fn(),

  allowGraph: jest.fn(),
  delete: jest.fn(),
  modify: jest.fn(),
  query: jest.fn(),
  some: jest.fn(),
  where: jest.fn(),
  withGraphJoined: jest.fn()
}));

const service = require('../../../src/services/tag');

const params = { tagset: [{ key: 'C', value: '10' }], objectIds: [OBJECT_ID], userId: SYSTEM_USER };
const tags = [{ key: 'A', value: '1' }, { key: 'B', value: '2' }];
const versionId = VERSION_ID;

beforeEach(() => {
  jest.clearAllMocks();
  resetModel(ObjectModel, objectModelTrx);
  resetModel(Tag, tagTrx);
  resetModel(Version, versionTrx);
  resetModel(VersionTag, versionTagTrx);
});

describe.skip('replaceTags', () => {
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
    expect(tagTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe.skip('associateTags', () => {
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
    expect(tagTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe.skip('dissociateTags', () => {
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
    expect(tagTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe.skip('pruneOrphanedTags', () => {
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
    expect(tagTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe.skip('createTags', () => {
  it('Inserts any tag records if they dont already exist in db', async () => {
    await service.createTags(tags);

    expect(Tag.startTransaction).toHaveBeenCalledTimes(1);
    expect(Tag.query).toHaveBeenCalledTimes(1);
    expect(Tag.query).toHaveBeenCalledWith(expect.anything());
    expect(Tag.select).toHaveBeenCalledTimes(1);
    expect(tagTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe.skip('fetchTagsForObject', () => {
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

describe.skip('fetchTagsForVersion', () => {
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
