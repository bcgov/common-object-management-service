const { MockModel, MockTransaction } = require('../../common/dbHelper');

jest.mock('../../../src/db/models/tables/objectModel', () => MockModel);

const service = require('../../../src/services/object');

const bucketId = '00000000-0000-0000-0000-000000000000';
const objectId = '00000000-0000-0000-0000-000000000000';
const userId = '00000000-0000-0000-0000-000000000000';

const data = {
  id: objectId,
  bucketId: bucketId,
  path: 'path',
  public: 'true',
  active: 'true',
  createdBy: userId
};

const params = {
  id: objectId,
  bucketId: bucketId,
  path: 'path',
  public: 'true',
  active: 'true',
  createdBy: userId,
  mimeType: 'mime',
  deleteMarker: 'delete',
  latest: 'latest'
};

beforeEach(() => {
  MockModel.mockReset();
  MockTransaction.mockReset();
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('bucket', () => {
  const createSpy = jest.spyOn(service, 'create');
  const deleteSpy = jest.spyOn(service, 'delete');
  const getBucketKeySpy = jest.spyOn(service, 'getBucketKey');
  const searchObjectsSpy = jest.spyOn(service, 'searchObjects');
  const readSpy = jest.spyOn(service, 'read');
  const updateSpy = jest.spyOn(service, 'update');

  beforeEach(() => {
    createSpy.mockReset();
    deleteSpy.mockReset();
    searchObjectsSpy.mockReset();
    getBucketKeySpy.mockReset();
    readSpy.mockReset();
    updateSpy.mockReset();
  });

  afterAll(() => {
    createSpy.mockRestore();
    deleteSpy.mockRestore();
    searchObjectsSpy.mockRestore();
    getBucketKeySpy.mockRestore();
    readSpy.mockRestore();
    updateSpy.mockRestore();
  });

  it('Create object', async () => {
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.create(data, etrx);
    expect(createSpy).toHaveBeenCalledTimes(1);
  });

  it('Delete object', async () => {
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.delete(objectId, etrx);
    expect(deleteSpy).toHaveBeenCalledTimes(1);
  });

  it('Get bucket key', async () => {
    await service.getBucketKey(objectId);
    expect(getBucketKeySpy).toHaveBeenCalledTimes(1);
  });

  it('Search objects', async () => {
    await service.searchObjects(params);
    expect(searchObjectsSpy).toHaveBeenCalledTimes(1);
  });

  it('Read object', async () => {
    await service.read(objectId);
    expect(readSpy).toHaveBeenCalledTimes(1);
  });

  it('Update object', async () => {
    const etrx = await jest.fn().mockResolvedValue(MockTransaction);
    await service.update(data, etrx);
    expect(updateSpy).toHaveBeenCalledTimes(1);
  });

});
