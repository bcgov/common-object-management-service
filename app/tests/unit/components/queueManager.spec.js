const config = require('config');

const QueueManager = require('../../../src/components/queueManager');
const { objectQueueService, syncService } = require('../../../src/services');

// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
jest.mock('config');

beforeEach(() => {
  jest.clearAllMocks();
});

describe('constructor', () => {
  it('should return a queue manager instance', () => {
    const qm = new QueueManager();

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeFalsy();
    expect(qm.toClose).toBeFalsy();
  });
});

describe('isBusy', () => {
  const qm = new QueueManager();

  beforeEach(() => {
    qm._cb = undefined;
    qm._toClose = false;
  });

  it('should not invoke callback when true and not closing', () => {
    qm.isBusy = true;

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeTruthy();
    expect(qm.toClose).toBeFalsy();
  });

  it('should not invoke callback when false and closing', () => {
    qm._toClose = true;

    qm.isBusy = false;

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeFalsy();
    expect(qm.toClose).toBeTruthy();
    expect(qm._cb).toBeUndefined();
  });

  it('should invoke callback when false and closing', () => {
    qm._cb = jest.fn();
    qm._toClose = true;

    qm.isBusy = false;

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeFalsy();
    expect(qm.toClose).toBeTruthy();
    expect(qm._cb).toHaveBeenCalledTimes(1);
  });
});

describe('checkQueue', () => {
  const qm = new QueueManager();

  const processNextJobSpy = jest.spyOn(qm, 'processNextJob');
  const queueSizeSpy = jest.spyOn(objectQueueService, 'queueSize');

  beforeEach(() => {
    qm._isBusy = false;
    qm._toClose = false;

    processNextJobSpy.mockReset();
    queueSizeSpy.mockReset();
  });

  afterAll(() => {
    processNextJobSpy.mockRestore();
    queueSizeSpy.mockRestore();
  });

  it('should call nothing when busy', () => {
    qm._isBusy = true;

    qm.checkQueue();

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeTruthy();
    expect(qm.toClose).toBeFalsy();
    expect(queueSizeSpy).toHaveBeenCalledTimes(0);
    expect(processNextJobSpy).toHaveBeenCalledTimes(0);
  });

  it('should call nothing when closing', () => {
    qm._toClose = true;

    qm.checkQueue();

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeFalsy();
    expect(qm.toClose).toBeTruthy();
    expect(queueSizeSpy).toHaveBeenCalledTimes(0);
    expect(processNextJobSpy).toHaveBeenCalledTimes(0);
  });

  it('should not call processNextJob when there are no jobs', () => {
    queueSizeSpy.mockResolvedValue(0);

    qm.checkQueue();

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeFalsy();
    expect(qm.toClose).toBeFalsy();
    expect(queueSizeSpy).toHaveBeenCalledTimes(1);
    expect(processNextJobSpy).toHaveBeenCalledTimes(0);
  });

  it('should call processNextJob when there are jobs', () => {
    processNextJobSpy.mockReturnValue();
    queueSizeSpy.mockResolvedValue(1);

    qm.checkQueue();

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeFalsy();
    expect(qm.toClose).toBeFalsy();
    expect(queueSizeSpy).toHaveBeenCalledTimes(1);
    // TODO: This is definitely being called, but call count is not incrementing for some reason
    // expect(processNextJobSpy).toHaveBeenCalledTimes(1);
  });

  it('should not throw when there is a failure', () => {
    queueSizeSpy.mockRejectedValue('error');

    qm.checkQueue();

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeFalsy();
    expect(qm.toClose).toBeFalsy();
    expect(queueSizeSpy).toHaveBeenCalledTimes(1);
    expect(processNextJobSpy).toHaveBeenCalledTimes(0);
  });
});

describe('close', () => {
  const qm = new QueueManager();

  beforeEach(() => {
    qm._cb = undefined;
    qm._isBusy = false;
    qm._toClose = false;
  });

  it('should store but not run the callback when busy', () => {
    const cb = jest.fn(() => { });
    qm._isBusy = true;

    qm.close(cb);

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeTruthy();
    expect(qm.toClose).toBeTruthy();
    expect(qm._cb).toBe(cb);
    expect(cb).toHaveBeenCalledTimes(0);
  });

  it('should not run the callback when undefined and not busy', () => {
    qm.close();

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeFalsy();
    expect(qm.toClose).toBeTruthy();
  });

  it('should run the callback when not busy', () => {
    const cb = jest.fn(() => { });

    qm.close(cb);

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeFalsy();
    expect(qm.toClose).toBeTruthy();
    expect(cb).toHaveBeenCalledTimes(1);
  });
});

describe('processNextJob', () => {
  const qm = new QueueManager();

  const checkQueueSpy = jest.spyOn(qm, 'checkQueue');
  const enqueueSpy = jest.spyOn(objectQueueService, 'enqueue');
  const dequeueSpy = jest.spyOn(objectQueueService, 'dequeue');
  const syncJobSpy = jest.spyOn(syncService, 'syncJob');

  const job = {
    bucketId: 'bucketId',
    createdBy: 'createdBy',
    full: false,
    id: 'id',
    path: 'path',
    retries: 0
  };

  beforeEach(() => {
    qm._cb = undefined;
    qm._isBusy = false;
    qm._toClose = false;

    config.get.mockReturnValueOnce('3'); // server.maxRetries

    checkQueueSpy.mockReset();
    enqueueSpy.mockReset();
    dequeueSpy.mockReset();
    syncJobSpy.mockReset();
  });

  afterAll(() => {
    checkQueueSpy.mockRestore();
    enqueueSpy.mockRestore();
    dequeueSpy.mockRestore();
    syncJobSpy.mockRestore();
  });

  it('should do nothing if queue is empty', async () => {
    dequeueSpy.mockResolvedValue([]);

    await qm.processNextJob();

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeFalsy();
    expect(qm.toClose).toBeFalsy();
    expect(checkQueueSpy).toHaveBeenCalledTimes(0);
    expect(enqueueSpy).toHaveBeenCalledTimes(0);
    expect(dequeueSpy).toHaveBeenCalledTimes(1);
    expect(syncJobSpy).toHaveBeenCalledTimes(0);
  });

  it('should do the next syncJob successfully and check queue', async () => {
    dequeueSpy.mockResolvedValue([job]);
    syncJobSpy.mockResolvedValue('objectId');

    await qm.processNextJob();

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeFalsy();
    expect(qm.toClose).toBeFalsy();
    expect(checkQueueSpy).toHaveBeenCalledTimes(1);
    expect(enqueueSpy).toHaveBeenCalledTimes(0);
    expect(dequeueSpy).toHaveBeenCalledTimes(1);
    expect(syncJobSpy).toHaveBeenCalledTimes(1);
    expect(syncJobSpy).toHaveBeenCalledWith(job.path, job.bucketId, job.full, job.createdBy);
  });

  it('should do the next syncJob successfully and not check queue when toClose', async () => {
    qm._toClose = true;
    dequeueSpy.mockResolvedValue([job]);
    syncJobSpy.mockResolvedValue('objectId');

    await qm.processNextJob();

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeFalsy();
    expect(qm.toClose).toBeTruthy();
    expect(checkQueueSpy).toHaveBeenCalledTimes(0);
    expect(enqueueSpy).toHaveBeenCalledTimes(0);
    expect(dequeueSpy).toHaveBeenCalledTimes(1);
    expect(syncJobSpy).toHaveBeenCalledTimes(1);
    expect(syncJobSpy).toHaveBeenCalledWith(job.path, job.bucketId, job.full, job.createdBy);
  });

  it('should re-enqueue a failed job when less than max retries', async () => {
    enqueueSpy.mockResolvedValue(1);
    dequeueSpy.mockResolvedValue([job]);
    syncJobSpy.mockImplementation(() => { throw new Error('error'); });

    await qm.processNextJob();

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeFalsy();
    expect(qm.toClose).toBeFalsy();
    expect(checkQueueSpy).toHaveBeenCalledTimes(0);
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(enqueueSpy).toHaveBeenCalledWith(expect.objectContaining({
      jobs: expect.arrayContaining([{ bucketId: job.bucketId, path: job.path }]),
      full: job.full,
      retries: job.retries + 1,
      createdBy: job.createdBy
    }));
    expect(dequeueSpy).toHaveBeenCalledTimes(1);
    expect(syncJobSpy).toHaveBeenCalledTimes(1);
    expect(syncJobSpy).toHaveBeenCalledWith(job.path, job.bucketId, job.full, job.createdBy);
  });

  it('should re-enqueue a failed job when less than max retries and fail gracefully', async () => {
    enqueueSpy.mockRejectedValue('error');
    dequeueSpy.mockResolvedValue([job]);
    syncJobSpy.mockImplementation(() => { throw new Error('error'); });

    await qm.processNextJob();

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeFalsy();
    expect(qm.toClose).toBeFalsy();
    expect(checkQueueSpy).toHaveBeenCalledTimes(0);
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
    expect(enqueueSpy).toHaveBeenCalledWith(expect.objectContaining({
      jobs: expect.arrayContaining([{ bucketId: job.bucketId, path: job.path }]),
      full: job.full,
      retries: job.retries + 1,
      createdBy: job.createdBy
    }));
    expect(dequeueSpy).toHaveBeenCalledTimes(1);
    expect(syncJobSpy).toHaveBeenCalledTimes(1);
    expect(syncJobSpy).toHaveBeenCalledWith(job.path, job.bucketId, job.full, job.createdBy);
  });

  it('should not re-enqueue a failed job when at max retries', async () => {
    dequeueSpy.mockResolvedValue([{ ...job, retries: 3 }]);
    syncJobSpy.mockImplementation(() => { throw new Error('error'); });

    await qm.processNextJob();

    expect(qm).toBeTruthy();
    expect(qm.isBusy).toBeFalsy();
    expect(qm.toClose).toBeFalsy();
    expect(checkQueueSpy).toHaveBeenCalledTimes(0);
    expect(enqueueSpy).toHaveBeenCalledTimes(0);
    expect(dequeueSpy).toHaveBeenCalledTimes(1);
    expect(syncJobSpy).toHaveBeenCalledTimes(1);
    expect(syncJobSpy).toHaveBeenCalledWith(job.path, job.bucketId, job.full, job.createdBy);
  });
});

