const { NIL: BUCKET_ID, NIL: SYSTEM_USER } = require('uuid');

const { resetModel, trxBuilder } = require('../../common/helper');
const ObjectQueue = require('../../../src/db/models/tables/objectQueue');

const objectQueueTrx = trxBuilder();
jest.mock('../../../src/db/models/tables/objectQueue', () => ({
  startTransaction: jest.fn(),
  then: jest.fn(),

  count: jest.fn(),
  delete: jest.fn(),
  first: jest.fn(),
  ignore: jest.fn(),
  insert: jest.fn(),
  modify: jest.fn(),
  onConflict: jest.fn(),
  query: jest.fn(),
  returning: jest.fn()
}));

const service = require('../../../src/services/objectQueue');

beforeEach(() => {
  jest.clearAllMocks();
  resetModel(ObjectQueue, objectQueueTrx);
});

describe('dequeue', () => {
  it('Pops a job from the object queue if available via findNextJob', async () => {
    await service.dequeue();

    expect(ObjectQueue.startTransaction).toHaveBeenCalledTimes(1);
    expect(ObjectQueue.query).toHaveBeenCalledTimes(1);
    expect(ObjectQueue.query).toBeCalledWith(expect.anything());
    expect(ObjectQueue.modify).toHaveBeenCalledTimes(1);
    expect(ObjectQueue.modify).toBeCalledWith('findNextJob');
    expect(ObjectQueue.delete).toHaveBeenCalledTimes(1);
    expect(ObjectQueue.returning).toHaveBeenCalledTimes(1);
    expect(ObjectQueue.returning).toBeCalledWith('*');
    expect(objectQueueTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('enqueue', () => {
  it('Inserts a job into the object queue only if it is not already present', async () => {
    ObjectQueue.ignore.mockReturnValue([]);
    const data = {
      jobs: [{
        path: 'path',
        bucketId: BUCKET_ID
      }],
      full: true,
      retries: 0,
      createdBy: SYSTEM_USER
    };

    await service.enqueue(data);

    expect(ObjectQueue.startTransaction).toHaveBeenCalledTimes(1);
    expect(ObjectQueue.query).toHaveBeenCalledTimes(1);
    expect(ObjectQueue.query).toBeCalledWith(expect.anything());
    expect(ObjectQueue.insert).toHaveBeenCalledTimes(1);
    expect(ObjectQueue.insert).toBeCalledWith(expect.arrayContaining([
      expect.objectContaining({
        bucketId: data.jobs[0].bucketId,
        createdBy: data.createdBy,
        full: data.full,
        path: data.jobs[0].path,
        retries: data.retries
      })
    ]));
    expect(ObjectQueue.onConflict).toHaveBeenCalledTimes(1);
    expect(ObjectQueue.ignore).toHaveBeenCalledTimes(1);
    expect(objectQueueTrx.commit).toHaveBeenCalledTimes(1);
  });
});

describe('queueSize', () => {
  it('Returns the number of jobs in the queue', async () => {
    await service.queueSize();

    expect(ObjectQueue.query).toHaveBeenCalledTimes(1);
    expect(ObjectQueue.count).toHaveBeenCalledTimes(1);
    expect(ObjectQueue.first).toHaveBeenCalledTimes(1);
    expect(ObjectQueue.then).toHaveBeenCalledTimes(1);
  });
});
