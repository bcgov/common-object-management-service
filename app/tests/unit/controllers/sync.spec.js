const controller = require('../../../src/controllers/sync');
const { objectService, objectQueueService, storageService } = require('../../../src/services');

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
  const listAllObjectVersionsSpy = jest.spyOn(storageService, 'listAllObjectVersions');
  const searchObjectsSpy = jest.spyOn(objectService, 'searchObjects');
  const next = jest.fn();

  it('should enqueue all objects in a bucket', async () => {
    const req = {
      params: bucketId
    };
    enqueueSpy.mockResolvedValue(1);
    listAllObjectVersionsSpy.mockResolvedValue({
      DeleteMarkers: [{ Key: path }],
      Versions: [{ Key: path }]
    });
    searchObjectsSpy.mockResolvedValue([{ path: path }]);

    await controller.syncBucket(req, res, next);

    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(listAllObjectVersionsSpy).toHaveBeenCalledTimes(1);
    expect(searchObjectsSpy).toHaveBeenCalledTimes(1);
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
