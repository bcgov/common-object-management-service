const {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsCommand,
  ListObjectVersionsCommand,
  PutObjectCommand
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { mockClient } = require('aws-sdk-client-mock');
const config = require('config');
const { Readable } = require('stream');

const service = require('../../../src/services/storage');
const utils = require('../../../src/components/utils');

const bucket = config.get('objectStorage.bucket');
const key = utils.delimit(config.get('objectStorage.key'));
const defaultTempExpiresIn = parseInt(config.get('objectStorage.defaultTempExpiresIn'), 10);

const s3ClientMock = mockClient(service._s3Client);

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn()
}));
// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
jest.mock('config');

beforeEach(() => {
  s3ClientMock.reset();
});

describe('_s3Client', () => {
  it('should be an object', () => {
    expect(service._s3Client).toBeTruthy();
    expect(typeof service._s3Client).toBe('object');
  });
});

describe('deleteObject', () => {
  beforeEach(() => {
    s3ClientMock.on(DeleteObjectCommand).resolves({});
  });

  it('should send a delete object command for the entire object', () => {
    const filePath = 'filePath';
    const result = service.deleteObject({ filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(DeleteObjectCommand, {
      Bucket: bucket,
      Key: filePath
    }, true)).toHaveLength(1);
  });

  it('should send a delete object command for a specific version', () => {
    const filePath = 'filePath';
    const versionId = '1234';
    const result = service.deleteObject({ filePath, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(DeleteObjectCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: versionId
    }, true)).toHaveLength(1);
  });
});

describe('headBucket', () => {
  beforeEach(() => {
    s3ClientMock.on(HeadBucketCommand).resolves({});
  });

  it('should send a head object command', () => {
    const result = service.headBucket();

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(HeadBucketCommand, {
      Bucket: bucket
    }, true)).toHaveLength(1);
  });
});

describe('headObject', () => {
  beforeEach(() => {
    s3ClientMock.on(HeadObjectCommand).resolves({});
  });

  it('should send a head object command', () => {
    const filePath = 'filePath';
    const result = service.headObject({ filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(HeadObjectCommand, {
      Bucket: bucket,
      Key: filePath
    }, true)).toHaveLength(1);
  });
});

describe('listObjects', () => {
  beforeEach(() => {
    s3ClientMock.on(ListObjectsCommand).resolves({});
  });

  it('should send a list objects command with default 1000 maxKeys', () => {
    const filePath = 'filePath';
    const result = service.listObjects({ filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(ListObjectsCommand, {
      Bucket: bucket,
      Prefix: filePath,
      MaxKeys: 1000
    }, true)).toHaveLength(1);
  });

  it('should send a list objects command with 2000 maxKeys', () => {
    const filePath = 'filePath';
    const maxKeys = 2000;
    const result = service.listObjects({ filePath, maxKeys });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(ListObjectsCommand, {
      Bucket: bucket,
      Prefix: filePath,
      MaxKeys: maxKeys
    }, true)).toHaveLength(1);
  });
});

describe('listObjectVersion', () => {
  beforeEach(() => {
    s3ClientMock.on(ListObjectVersionsCommand).resolves({});
  });

  it('should send a list object versions command', () => {
    const filePath = 'filePath';
    const result = service.listObjectVersion({ filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(ListObjectVersionsCommand, {
      Bucket: bucket,
      Prefix: filePath
    }, true)).toHaveLength(1);
  });
});

describe('presignUrl', () => {
  beforeEach(() => {
    getSignedUrl.mockReset();
  });

  afterAll(() => {
    getSignedUrl.mockRestore();
  });

  it('should call getSignedUrl with default expiry', () => {
    getSignedUrl.mockResolvedValue('');
    const command = {};
    const result = service.presignUrl(command);

    expect(result).toBeTruthy();
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    expect(getSignedUrl).toHaveBeenCalledWith(expect.any(Object), command, { expiresIn: defaultTempExpiresIn });
  });

  it('should call getSignedUrl with custom expiry', () => {
    getSignedUrl.mockResolvedValue('');
    const command = {};
    const expiresIn = 1234;
    const result = service.presignUrl(command, expiresIn);

    expect(result).toBeTruthy();
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    expect(getSignedUrl).toHaveBeenCalledWith(expect.any(Object), command, { expiresIn: expiresIn });
  });
});

describe('putObject', () => {
  beforeEach(() => {
    s3ClientMock.on(PutObjectCommand).resolves({});
  });

  it('should send a put object command', () => {
    const stream = new Readable();
    const id = 'id';
    const originalName = 'originalName';
    const mimeType = 'mimeType';
    const result = service.putObject({ stream, id, originalName, mimeType });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(PutObjectCommand, {
      Bucket: bucket,
      ContentType: mimeType,
      Key: utils.joinPath(key, id),
      Body: stream,
      Metadata: {
        name: originalName,
        id: id
      },
      ServerSideEncryption: 'AES256'
    }, true)).toHaveLength(1);
  });

  it('should send a put object command with custom metadata', () => {
    const stream = new Readable();
    const id = 'id';
    const originalName = 'originalName';
    const mimeType = 'mimeType';
    const metadata = { foo: 'foo', bar: 'bar' };
    const result = service.putObject({ stream, id, originalName, mimeType, metadata });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(PutObjectCommand, {
      Bucket: bucket,
      ContentType: mimeType,
      Key: utils.joinPath(key, id),
      Body: stream,
      Metadata: {
        foo: 'foo',
        bar: 'bar',
        name: originalName,
        id: id
      },
      ServerSideEncryption: 'AES256'
    }, true)).toHaveLength(1);
  });

  it('should send a put object command with custom tags', () => {
    const stream = new Readable();
    const id = 'id';
    const originalName = 'originalName';
    const mimeType = 'mimeType';
    const tags = { foo: 'foo', bar: 'bar' };
    const result = service.putObject({ stream, id, originalName, mimeType, tags });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(PutObjectCommand, {
      Bucket: bucket,
      ContentType: mimeType,
      Key: utils.joinPath(key, id),
      Body: stream,
      Metadata: {
        name: originalName,
        id: id
      },
      ServerSideEncryption: 'AES256',
      Tagging: 'foo=foo&bar=bar'
    }, true)).toHaveLength(1);
  });
});

describe('readObject', () => {
  beforeEach(() => {
    s3ClientMock.on(GetObjectCommand).resolves({});
  });

  it('should send a get object command for the latest object', () => {
    const filePath = 'filePath';
    const result = service.readObject({ filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(GetObjectCommand, {
      Bucket: bucket,
      Key: filePath
    }, true)).toHaveLength(1);
  });

  it('should send a get object command for a specific version', () => {
    const filePath = 'filePath';
    const versionId = '1234';
    const result = service.readObject({ filePath, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(GetObjectCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: versionId
    }, true)).toHaveLength(1);
  });
});

// TODO: Figure out a way to intercept GetObjectCommand constructor parameters for higher level validation
describe('readSignedUrl', () => {
  const presignUrlMock = jest.spyOn(service, 'presignUrl');

  beforeEach(() => {
    presignUrlMock.mockResolvedValue('url');
  });

  afterAll(() => {
    presignUrlMock.mockRestore();
  });

  it('should call presignUrl with a get object command for the latest object and default expiration', () => {
    const filePath = 'filePath';
    const result = service.readSignedUrl({ filePath });

    expect(result).toBeTruthy();
    expect(presignUrlMock).toHaveBeenCalledTimes(1);
    expect(presignUrlMock).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        Bucket: bucket,
        Key: filePath
      }
    }), defaultTempExpiresIn);
  });

  it('should call presignUrl with a get object command for a specific version and default expiration', () => {
    const filePath = 'filePath';
    const versionId = '1234';
    const result = service.readSignedUrl({ filePath, versionId });

    expect(result).toBeTruthy();
    expect(presignUrlMock).toHaveBeenCalledTimes(1);
    expect(presignUrlMock).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        Bucket: bucket,
        Key: filePath,
        VersionId: versionId
      }
    }), defaultTempExpiresIn);
  });

  it('should call presignUrl with a get object command for a specific version and custom expiration', () => {
    const filePath = 'filePath';
    const versionId = '1234';
    const expires = '2345';
    const result = service.readSignedUrl({ filePath, versionId, expiresIn: expires });

    expect(result).toBeTruthy();
    expect(presignUrlMock).toHaveBeenCalledTimes(1);
    expect(presignUrlMock).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        Bucket: bucket,
        Key: filePath,
        VersionId: versionId
      }
    }), expires);
  });
});
