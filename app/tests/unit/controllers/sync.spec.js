const controller = require('../../../src/controllers/sync');
const {
  objectQueueService,
} = require('../../../src/services');

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
  const req = {
    query: {
      bucketId: undefined
    }
  };

  it('should return the current sync queue size', async () => {
    queueSizeSpy.mockResolvedValue(0);

    await controller.syncStatus(req, res, next);

    expect(queueSizeSpy).toHaveBeenCalledTimes(1);
    expect(res.json).toHaveBeenCalledWith(0);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(next).toHaveBeenCalledTimes(0);
  });

  it('should handle unexpected errors', async () => {
    queueSizeSpy.mockImplementation(() => { throw new Error('error'); });

    await controller.syncStatus(req, res, next);

    expect(queueSizeSpy).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
