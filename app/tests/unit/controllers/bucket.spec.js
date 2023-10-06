const Problem = require('api-problem');
const { UniqueViolationError } = require('objection');
const { NIL: SYSTEM_USER } = require('uuid');

const controller = require('../../../src/controllers/bucket');
const {
  bucketService,
  storageService,
  userService,
} = require('../../../src/services');
const utils = require('../../../src/components/utils');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};
// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
jest.mock('config');
// Mock out utils library and use a spy to observe behavior
jest.mock('../../../src/components/utils');

let res = undefined;
beforeEach(() => {
  res = mockResponse();
});

afterEach(() => {
  jest.resetAllMocks();
});

const CURRENT_USER = { authType: 'BEARER' };
const REQUEST_BUCKET = 'abcxyz';
const REQUEST_BUCKET_ID = 'ec4ef891-6304-4976-90b8-0f6a6fca6fac';

describe('createBucket', () => {
  // mock service calls
  const createSpy = jest.spyOn(bucketService, 'create');
  const checkGrantPermissionsSpy = jest.spyOn(bucketService, 'checkGrantPermissions');
  const getCurrentIdentitySpy = jest.spyOn(utils, 'getCurrentIdentity');
  const getCurrentUserIdSpy = jest.spyOn(userService, 'getCurrentUserId');
  const headBucketSpy = jest.spyOn(storageService, 'headBucket');

  const next = jest.fn();

  it('should return a 201 if all good', async () => {
    // request object
    const req = {
      body: { bucket: REQUEST_BUCKET, region: 'test' },
      currentUser: CURRENT_USER,
      headers: {},
      query: {},
    };

    const USR_IDENTITY = 'xxxy';
    const USR_ID = 'abc-123';

    createSpy.mockReturnValue(true);
    getCurrentIdentitySpy.mockReturnValue(USR_IDENTITY);
    getCurrentUserIdSpy.mockReturnValue(USR_ID);
    headBucketSpy.mockReturnValue(true);

    await controller.createBucket(req, res, next);

    expect(headBucketSpy).toHaveBeenCalledTimes(1);
    expect(headBucketSpy).toHaveBeenCalledWith(expect.objectContaining(req.body));
    expect(getCurrentIdentitySpy).toHaveBeenCalledTimes(1);
    expect(getCurrentIdentitySpy).toHaveBeenCalledWith(
      CURRENT_USER,
      SYSTEM_USER
    );
    expect(getCurrentUserIdSpy).toHaveBeenCalledTimes(1);
    expect(getCurrentUserIdSpy).toHaveBeenCalledWith(USR_IDENTITY);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith({ ...req.body, userId: USR_ID });

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('redacts secrets in the response', async () => {
    // request object
    const req = {
      body: { bucket: REQUEST_BUCKET, region: 'test' },
    };

    const CREATE_RES = {
      accessKeyId: 'no no no',
      secretAccessKey: 'absolutely not',
      other: 'some field',
      xyz: 123,
    };
    createSpy.mockReturnValue(CREATE_RES);
    getCurrentUserIdSpy.mockReturnValue(true);
    headBucketSpy.mockReturnValue(true);

    await controller.createBucket(req, res, next);
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        accessKeyId: 'REDACTED',
        secretAccessKey: 'REDACTED',
        other: 'some field',
        xyz: 123,
      })
    );
  });

  it('responds with error when invalid bucket head', async () => {
    // request object
    const req = {
      body: { bucket: REQUEST_BUCKET, region: 'test' },
      currentUser: CURRENT_USER,
      headers: {},
      query: {},
    };

    const USR_IDENTITY = 'xxxy';
    const USR_ID = 'abc-123';

    createSpy.mockReturnValue(true);
    getCurrentIdentitySpy.mockReturnValue(USR_IDENTITY);
    getCurrentUserIdSpy.mockReturnValue(USR_ID);
    headBucketSpy.mockImplementationOnce(() => {
      throw new Error();
    });

    await controller.createBucket(req, res, next);

    expect(headBucketSpy).toHaveBeenCalledTimes(1);
    expect(headBucketSpy).toHaveBeenCalledWith(expect.objectContaining(req.body));
    expect(getCurrentIdentitySpy).toHaveBeenCalledTimes(0);
    expect(getCurrentUserIdSpy).toHaveBeenCalledTimes(0);
    expect(createSpy).toHaveBeenCalledTimes(0);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(expect.any(Problem));
  });

  it('nexts an error if the bucket service fails to create', async () => {
    // request object
    const req = {
      body: { bucket: REQUEST_BUCKET, region: 'test' },
      currentUser: CURRENT_USER,
      headers: {},
      query: {},
    };

    const USR_IDENTITY = 'xxxy';
    const USR_ID = 'abc-123';

    createSpy.mockImplementationOnce(() => {
      throw new Error();
    });
    getCurrentIdentitySpy.mockReturnValue(USR_IDENTITY);
    getCurrentUserIdSpy.mockReturnValue(USR_ID);
    headBucketSpy.mockReturnValue(true);

    await controller.createBucket(req, res, next);

    expect(headBucketSpy).toHaveBeenCalledTimes(1);
    expect(headBucketSpy).toHaveBeenCalledWith(expect.objectContaining(req.body));
    expect(getCurrentIdentitySpy).toHaveBeenCalledTimes(1);
    expect(getCurrentIdentitySpy).toHaveBeenCalledWith(
      CURRENT_USER,
      SYSTEM_USER
    );
    expect(getCurrentUserIdSpy).toHaveBeenCalledTimes(1);
    expect(getCurrentUserIdSpy).toHaveBeenCalledWith(USR_IDENTITY);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith({ ...req.body, userId: USR_ID });

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Problem(500, 'Internal Server Error'));
  });

  // Skipping until someone can figure out the instanceof issue in the catch block
  it.skip('handles unique violation errors if perms are ok', async () => {
    // request object
    const req = {
      body: { bucket: REQUEST_BUCKET, region: 'test' },
      currentUser: CURRENT_USER,
      headers: {},
      query: {},
    };

    const USR_IDENTITY = 'xxxy';
    const USR_ID = 'abc-123';

    createSpy.mockImplementationOnce(() => {
      // This doesn't seem to work for me arghh
      // See the `if (e instanceof UniqueViolationError) {`
      // part of the catch block in the createBucket methdod
      throw new UniqueViolationError();
    });
    checkGrantPermissionsSpy.mockReturnValue(true);
    getCurrentIdentitySpy.mockReturnValue(USR_IDENTITY);
    getCurrentUserIdSpy.mockReturnValue(USR_ID);
    headBucketSpy.mockReturnValue(true);

    await controller.createBucket(req, res, next);

    expect(headBucketSpy).toHaveBeenCalledTimes(1);
    expect(headBucketSpy).toHaveBeenCalledWith(expect.objectContaining(req.body));
    expect(getCurrentIdentitySpy).toHaveBeenCalledTimes(1);
    expect(getCurrentIdentitySpy).toHaveBeenCalledWith(
      CURRENT_USER,
      SYSTEM_USER
    );
    expect(getCurrentUserIdSpy).toHaveBeenCalledTimes(1);
    expect(getCurrentUserIdSpy).toHaveBeenCalledWith(USR_IDENTITY);
    expect(createSpy).toHaveBeenCalledTimes(1);
    expect(createSpy).toHaveBeenCalledWith({ ...req.body, userId: USR_ID });
    expect(checkGrantPermissionsSpy).toHaveBeenCalledTimes(1);
    expect(checkGrantPermissionsSpy).toHaveBeenCalledWith(expect.objectContaining({ ...req.body, userId: USR_ID }));

    expect(res.status).toHaveBeenCalledWith(201);
  });
});

describe('deleteBucket', () => {
  // mock service calls
  const addDashesToUuidSpy = jest.spyOn(utils, 'addDashesToUuid');
  const deleteSpy = jest.spyOn(bucketService, 'delete');

  const next = jest.fn();

  it('should return a 204 if all good', async () => {
    // request object
    const req = {
      params: { bucketId: REQUEST_BUCKET_ID },
      headers: {},
      query: {},
    };

    addDashesToUuidSpy.mockReturnValue(REQUEST_BUCKET_ID);
    deleteSpy.mockReturnValue(true);

    await controller.deleteBucket(req, res, next);

    expect(addDashesToUuidSpy).toHaveBeenCalledTimes(1);
    expect(addDashesToUuidSpy).toHaveBeenCalledWith(REQUEST_BUCKET_ID);
    expect(deleteSpy).toHaveBeenCalledWith(REQUEST_BUCKET_ID);

    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('return a problem if bucket service breaks', async () => {
    // request object
    const req = {
      params: { bucketId: REQUEST_BUCKET_ID },
      headers: {},
      query: {},
    };

    addDashesToUuidSpy.mockReturnValue(REQUEST_BUCKET_ID);
    deleteSpy.mockImplementationOnce(() => {
      throw new Problem(502, 'Unknown BucketService Error');
    });

    await controller.deleteBucket(req, res, next);

    expect(addDashesToUuidSpy).toHaveBeenCalledTimes(1);
    expect(addDashesToUuidSpy).toHaveBeenCalledWith(REQUEST_BUCKET_ID);
    expect(deleteSpy).toHaveBeenCalledWith(REQUEST_BUCKET_ID);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      new Problem(502, 'Unknown BucketService Error')
    );
  });
});

describe('headBucket', () => {
  // mock service calls
  const addDashesToUuidSpy = jest.spyOn(utils, 'addDashesToUuid');
  const headBucketSpy = jest.spyOn(storageService, 'headBucket');

  const next = jest.fn();

  it('should return a 204 if all good', async () => {
    // request object
    const req = {
      params: { bucketId: REQUEST_BUCKET_ID },
      headers: {},
      query: {},
    };

    addDashesToUuidSpy.mockReturnValue(REQUEST_BUCKET_ID);
    headBucketSpy.mockReturnValue(true);

    await controller.headBucket(req, res, next);

    expect(addDashesToUuidSpy).toHaveBeenCalledTimes(1);
    expect(addDashesToUuidSpy).toHaveBeenCalledWith(REQUEST_BUCKET_ID);
    expect(headBucketSpy).toHaveBeenCalledWith({
      bucketId: REQUEST_BUCKET_ID,
    });

    expect(res.status).toHaveBeenCalledWith(204);
  });

  it('return a problem if storage service breaks', async () => {
    // request object
    const req = {
      params: { bucketId: REQUEST_BUCKET_ID },
      headers: {},
      query: {},
    };

    addDashesToUuidSpy.mockReturnValue(REQUEST_BUCKET_ID);
    headBucketSpy.mockImplementationOnce(() => {
      throw new Problem(502, 'Unknown BucketService Error');
    });

    await controller.headBucket(req, res, next);

    expect(addDashesToUuidSpy).toHaveBeenCalledTimes(1);
    expect(addDashesToUuidSpy).toHaveBeenCalledWith(REQUEST_BUCKET_ID);
    expect(headBucketSpy).toHaveBeenCalledWith({
      bucketId: REQUEST_BUCKET_ID,
    });

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      new Problem(502, 'Unknown BucketService Error')
    );
  });
});

describe('readBucket', () => {
  // mock service calls
  const addDashesToUuidSpy = jest.spyOn(utils, 'addDashesToUuid');
  const readSpy = jest.spyOn(bucketService, 'read');

  const next = jest.fn();

  it('should return a 204 if all good', async () => {
    // request object
    const req = {
      params: { bucketId: REQUEST_BUCKET_ID },
      headers: {},
      query: {},
    };

    addDashesToUuidSpy.mockReturnValue(REQUEST_BUCKET_ID);
    readSpy.mockReturnValue(true);

    await controller.readBucket(req, res, next);

    expect(addDashesToUuidSpy).toHaveBeenCalledTimes(1);
    expect(addDashesToUuidSpy).toHaveBeenCalledWith(REQUEST_BUCKET_ID);
    expect(readSpy).toHaveBeenCalledWith(REQUEST_BUCKET_ID);

    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('return a problem if storage service breaks', async () => {
    // request object
    const req = {
      params: { bucketId: REQUEST_BUCKET_ID },
      headers: {},
      query: {},
    };

    addDashesToUuidSpy.mockReturnValue(REQUEST_BUCKET_ID);
    readSpy.mockImplementationOnce(() => {
      throw new Problem(502, 'Unknown BucketService Error');
    });

    await controller.readBucket(req, res, next);

    expect(addDashesToUuidSpy).toHaveBeenCalledTimes(1);
    expect(addDashesToUuidSpy).toHaveBeenCalledWith(REQUEST_BUCKET_ID);
    expect(readSpy).toHaveBeenCalledWith(REQUEST_BUCKET_ID);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(
      new Problem(502, 'Unknown BucketService Error')
    );
  });

  it('redacts secrets in the response', async () => {
    // request object
    const req = {
      params: { bucketId: REQUEST_BUCKET_ID },
      headers: {},
      query: {},
    };

    const READ_RES = {
      accessKeyId: 'no no no',
      secretAccessKey: 'absolutely not',
      other: 'some field',
      xyz: 123,
    };
    readSpy.mockReturnValue(READ_RES);

    await controller.readBucket(req, res, next);
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        accessKeyId: 'REDACTED',
        secretAccessKey: 'REDACTED',
        other: 'some field',
        xyz: 123,
      })
    );
  });

});
