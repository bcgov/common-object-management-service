const controller = require('../../../src/controllers/sync');
const {
  bucketService,
  objectService,
  objectQueueService,
  storageService,
  userService
} = require('../../../src/services');
const utils = require('../../../src/components/utils');
const dbutils = require('../../../src/db/models/utils');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};

const bucketId = 'bucketId';
const path = 'path';

let res = undefined;

beforeEach(() => {
  res = mockResponse();
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('syncBucket', () => {
  const enqueueSpy = jest.spyOn(objectQueueService, 'enqueue');
  const getCurrentIdentitySpy = jest.spyOn(utils, 'getCurrentIdentity');
  const getCurrentUserIdSpy = jest.spyOn(userService, 'getCurrentUserId');
  const listAllObjectVersionsSpy = jest.spyOn(storageService, 'listAllObjectVersions');
  const searchObjectsSpy = jest.spyOn(objectService, 'searchObjects');
  const trxWrapperSpy = jest.spyOn(dbutils, 'trxWrapper');
  const updateSpy = jest.spyOn(bucketService, 'update');
  const next = jest.fn();

  it('should enqueue all objects in a bucket', async () => {
    const USR_IDENTITY = 'xxxy';
    const USR_ID = 'abc-123';
    const req = {
      params: bucketId
    };

    enqueueSpy.mockResolvedValue(1);
    getCurrentIdentitySpy.mockReturnValue(USR_IDENTITY);
    getCurrentUserIdSpy.mockReturnValue(USR_ID);
    listAllObjectVersionsSpy.mockResolvedValue({
      DeleteMarkers: [{ Key: path }],
      Versions: [{ Key: path }]
    });
    searchObjectsSpy.mockResolvedValue({ total: 1, data: [{ path: path }] });
    trxWrapperSpy.mockImplementation(callback => callback({}));
    updateSpy.mockResolvedValue({});

    await controller.syncBucket(req, res, next);

    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(1);
    expect(searchObjectsSpy).toHaveBeenCalledTimes(1);
    expect(updateSpy).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(next).toHaveBeenCalledTimes(0);
  });

  it('should handle unexpected errors', async () => {
    const req = {
      params: bucketId
    };
    listAllObjectVersionsSpy.mockImplementation(() => { throw new Error('error'); });
    searchObjectsSpy.mockResolvedValue([{ path: path }]);

    await controller.syncBucket(req, res, next);

    expect(enqueueSpy).toHaveBeenCalledTimes(0);
    expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(1);
    expect(searchObjectsSpy).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('syncObject', () => {
  const enqueueSpy = jest.spyOn(objectQueueService, 'enqueue');
  const next = jest.fn();

  it('should enqueue an object', async () => {
    const req = {
      currentObject: {
        bucketId: bucketId,
        path: path
      }
    };
    enqueueSpy.mockResolvedValue(1);

    await controller.syncObject(req, res, next);

    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(enqueueSpy).toHaveBeenCalledWith(expect.objectContaining({
      jobs: expect.arrayContaining([{ bucketId: bucketId, path: path }])
    }));
    expect(res.json).toHaveBeenCalledWith(1);
    expect(res.status).toHaveBeenCalledWith(202);
    expect(next).toHaveBeenCalledTimes(0);
  });

  it('should handle unexpected errors', async () => {
    const req = {
      currentObject: {
        bucketId: bucketId,
        path: path
      }
    };
    enqueueSpy.mockImplementation(() => { throw new Error('error'); });

    await controller.syncObject(req, res, next);

    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(enqueueSpy).toHaveBeenCalledWith(expect.objectContaining({
      jobs: expect.arrayContaining([{ bucketId: bucketId, path: path }])
    }));
    expect(next).toHaveBeenCalledTimes(1);
  });
});

describe('syncStatus', () => {
  const queueSizeSpy = jest.spyOn(objectQueueService, 'queueSize');
  const next = jest.fn();

  it('should return the current sync queue size', async () => {
    const req = {};
    queueSizeSpy.mockResolvedValue(0);

    await controller.syncStatus(req, res, next);

    expect(queueSizeSpy).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(0);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).toHaveBeenCalledTimes(0);
  });

  it('should handle unexpected errors', async () => {
    const req = {};
    queueSizeSpy.mockImplementation(() => { throw new Error('error'); });

    await controller.syncStatus(req, res, next);

    expect(queueSizeSpy).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
