const {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectTaggingCommand,
  GetBucketVersioningCommand,
  GetObjectCommand,
  GetObjectTaggingCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsCommand,
  ListObjectVersionsCommand,
  PutObjectCommand,
  PutObjectTaggingCommand,
  S3Client
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { mockClient } = require('aws-sdk-client-mock');
require('aws-sdk-client-mock-jest'); // Must be globally imported
const config = require('config');
const { Readable } = require('stream');

const service = require('../../../src/services/storage');
const utils = require('../../../src/components/utils');
const { MetadataDirective, TaggingDirective } = require('../../../src/components/constants');

const bucket = 'bucket';
const key = 'filePath';
const defaultTempExpiresIn = parseInt(config.get('objectStorage.defaultTempExpiresIn'), 10);

const s3ClientMock = mockClient(S3Client);

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn()
}));
// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
jest.mock('config');

beforeEach(() => {
  s3ClientMock.reset();
  config.get
    .mockReturnValueOnce('accessKeyId') // objectStorage.accessKeyId
    .mockReturnValueOnce(bucket) // objectStorage.bucket
    .mockReturnValueOnce('https://endpoint.com') // objectStorage.endpoint
    .mockReturnValueOnce(key) // objectStorage.key
    .mockReturnValueOnce('secretAccessKey'); // objectStorage.secretAccessKey
});

describe('_getS3Client', () => {
  it('should be a function', () => {
    expect(service._getS3Client).toBeTruthy();
    expect(typeof service._getS3Client).toBe('function');
  });
});

describe('copyObject', () => {
  beforeEach(() => {
    s3ClientMock.on(CopyObjectCommand).resolves({});
  });

  it('should send a copy object command copying the metadata and tags', async () => {
    const copySource = 'filePath';
    const filePath = 'filePath';
    const result = await service.copyObject({ copySource, filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(CopyObjectCommand, {
      Bucket: bucket,
      CopySource: `${bucket}/${copySource}`,
      Key: filePath,
      Metadata: undefined,
      MetadataDirective: MetadataDirective.COPY,
      TaggingDirective: TaggingDirective.COPY,
      VersionId: undefined
    });
  });

  it('should send a copy object command copying the metadata and tags for a specific version', async () => {
    const copySource = 'filePath';
    const filePath = 'filePath';
    const versionId = '1234';
    const result = await service.copyObject({ copySource, filePath, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(CopyObjectCommand, {
      Bucket: bucket,
      CopySource: `${bucket}/${copySource}`,
      Key: filePath,
      Metadata: undefined,
      MetadataDirective: MetadataDirective.COPY,
      TaggingDirective: TaggingDirective.COPY,
      VersionId: versionId
    });
  });

  it('should send a copy object command replacing the metadata', async () => {
    const copySource = 'filePath';
    const filePath = 'filePath';
    const metadata = { 'x-amz-meta-test': 123 };
    const metadataDirective = MetadataDirective.REPLACE;
    const result = await service.copyObject({ copySource, filePath, metadata, metadataDirective });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(CopyObjectCommand, {
      Bucket: bucket,
      CopySource: `${bucket}/${copySource}`,
      Key: filePath,
      Metadata: metadata,
      MetadataDirective: metadataDirective,
      TaggingDirective: TaggingDirective.COPY,
      VersionId: undefined
    });
  });

  it('should send a copy object command replacing the metadata for a specific version', async () => {
    const copySource = 'filePath';
    const filePath = 'filePath';
    const metadata = { 'x-amz-meta-test': 123 };
    const metadataDirective = MetadataDirective.REPLACE;
    const versionId = '1234';
    const result = await service.copyObject({ copySource, filePath, metadata, metadataDirective, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(CopyObjectCommand, {
      Bucket: bucket,
      CopySource: `${bucket}/${copySource}`,
      Key: filePath,
      Metadata: metadata,
      MetadataDirective: metadataDirective,
      TaggingDirective: TaggingDirective.COPY,
      VersionId: versionId
    });
  });

  it('should send a copy object command replacing the tags', async () => {
    const copySource = 'filePath';
    const filePath = 'filePath';
    const tags = { 'test': 123 };
    const taggingDirective = TaggingDirective.REPLACE;
    const result = await service.copyObject({ copySource, filePath, tags, taggingDirective });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(CopyObjectCommand, {
      Bucket: bucket,
      CopySource: `${bucket}/${copySource}`,
      Key: filePath,
      Metadata: undefined,
      MetadataDirective: MetadataDirective.COPY,
      Tagging: 'test=123',
      TaggingDirective: taggingDirective,
      VersionId: undefined
    });
  });

  it('should send a copy object command replacing the tags for a specific version', async () => {
    const copySource = 'filePath';
    const filePath = 'filePath';
    const tags = { 'test': 123 };
    const taggingDirective = TaggingDirective.REPLACE;
    const versionId = '1234';
    const result = await service.copyObject({ copySource, filePath, tags, taggingDirective, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(CopyObjectCommand, {
      Bucket: bucket,
      CopySource: `${bucket}/${copySource}`,
      Key: filePath,
      Metadata: undefined,
      MetadataDirective: MetadataDirective.COPY,
      Tagging: 'test=123',
      TaggingDirective: taggingDirective,
      VersionId: versionId
    });
  });
});

describe('deleteObject', () => {
  beforeEach(() => {
    s3ClientMock.on(DeleteObjectCommand).resolves({});
  });

  it('should send a delete object command for the entire object', async () => {
    const filePath = 'filePath';
    const result = await service.deleteObject({ filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(DeleteObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(DeleteObjectCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: undefined
    });
  });

  it('should send a delete object command for a specific version', async () => {
    const filePath = 'filePath';
    const versionId = '1234';
    const result = await service.deleteObject({ filePath, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(DeleteObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(DeleteObjectCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: versionId
    });
  });
});

describe('deleteObjectTagging', () => {
  beforeEach(() => {
    s3ClientMock.on(DeleteObjectTaggingCommand).resolves({});
  });

  it('should send a delete object tagging command', async () => {
    const filePath = 'filePath';
    const result = await service.deleteObjectTagging({ filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(DeleteObjectTaggingCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(DeleteObjectTaggingCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: undefined
    });
  });

  it('should send a delete object tagging command for a specific version', async () => {
    const filePath = 'filePath';
    const versionId = '1234';
    const result = await service.deleteObjectTagging({ filePath, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(DeleteObjectTaggingCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(DeleteObjectTaggingCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: versionId
    });
  });
});

describe('headBucket', () => {
  beforeEach(() => {
    s3ClientMock.on(HeadBucketCommand).resolves({});
  });

  it('should send a head bucket command', async () => {
    const result = await service.headBucket();

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(HeadBucketCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(HeadBucketCommand, {
      Bucket: bucket
    });
  });
});

describe('getBucketVersioning', () => {
  beforeEach(() => {
    s3ClientMock.on(GetBucketVersioningCommand).resolves({});
  });

  it('should send a get bucket versioning command', async () => {
    const result = await service.getBucketVersioning();

    expect(result).toBeFalsy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(GetBucketVersioningCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(GetBucketVersioningCommand, {
      Bucket: bucket
    });
  });
});

describe('getObjectTagging', () => {
  beforeEach(() => {
    s3ClientMock.on(GetObjectTaggingCommand).resolves({});
  });

  it('should send a get object tagging command', async () => {
    const filePath = 'filePath';
    const result = await service.getObjectTagging({ filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(GetObjectTaggingCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(GetObjectTaggingCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: undefined
    });
  });

  it('should send a put object tagging command for a specific version', async () => {
    const filePath = 'filePath';
    const versionId = '1234';
    const result = await service.getObjectTagging({ filePath, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(GetObjectTaggingCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(GetObjectTaggingCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: versionId
    });
  });
});

describe('headObject', () => {
  beforeEach(() => {
    s3ClientMock.on(HeadObjectCommand).resolves({});
  });

  it('should send a head object command', async () => {
    const filePath = 'filePath';
    const versionId = '123';
    const result = await service.headObject({ filePath, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(HeadObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(HeadObjectCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: versionId
    });
  });

  it('should not require a version ID parameter', async () => {
    const filePath = 'filePath';
    const versionId = undefined;
    const result = await service.headObject({ filePath, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(HeadObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(HeadObjectCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: versionId
    });
  });
});

describe('listObjects', () => {
  beforeEach(() => {
    s3ClientMock.on(ListObjectsCommand).resolves({});
  });

  it('should send a list objects command with default 2^31-1 maxKeys', async () => {
    const filePath = 'filePath';
    const result = await service.listObjects({ filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(ListObjectsCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(ListObjectsCommand, {
      Bucket: bucket,
      Prefix: filePath,
      MaxKeys: (2 ** 31) - 1
    });
  });

  it('should send a list objects command with 2000 maxKeys', async () => {
    const filePath = 'filePath';
    const maxKeys = 2000;
    const result = await service.listObjects({ filePath, maxKeys });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(ListObjectsCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(ListObjectsCommand, {
      Bucket: bucket,
      Prefix: filePath,
      MaxKeys: maxKeys
    });
  });
});

describe('listObjectVersion', () => {
  beforeEach(() => {
    s3ClientMock.on(ListObjectVersionsCommand).resolves({});
  });

  it('should send a list object versions command', async () => {
    const filePath = 'filePath';
    const result = await service.listObjectVersion({ filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(ListObjectVersionsCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(ListObjectVersionsCommand, {
      Bucket: bucket,
      Prefix: filePath
    });
  });
});

describe('presignUrl', () => {
  beforeEach(() => {
    getSignedUrl.mockReset();
  });

  afterAll(() => {
    getSignedUrl.mockRestore();
  });

  it('should call getSignedUrl with default expiry', async () => {
    getSignedUrl.mockResolvedValue('foo');
    const command = {};
    const result = await service.presignUrl(command);

    expect(result).toBeTruthy();
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    expect(getSignedUrl).toHaveBeenCalledWith(expect.any(Object), command, { expiresIn: defaultTempExpiresIn });
  });

  it('should call getSignedUrl with custom expiry', async () => {
    getSignedUrl.mockResolvedValue('foo');
    const command = {};
    const expiresIn = 1234;
    const result = await service.presignUrl(command, expiresIn);

    expect(result).toBeTruthy();
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    expect(getSignedUrl).toHaveBeenCalledWith(expect.any(Object), command, { expiresIn: expiresIn });
  });
});

describe('putObject', () => {
  const getPathSpy = jest.spyOn(utils, 'getPath');
  const id = 'id';
  const keyPath = utils.joinPath(key, id);

  beforeEach(() => {
    getPathSpy.mockReturnValue(keyPath);
    s3ClientMock.on(PutObjectCommand).resolves({});
  });

  afterAll(() => {
    getPathSpy.mockRestore();
  });

  it('should send a put object command', async () => {
    const stream = new Readable();
    const mimeType = 'mimeType';
    const metadata = { name: 'originalName', id: id };
    const result = await service.putObject({ stream, id, mimeType, metadata });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: bucket,
      ContentType: mimeType,
      Key: keyPath,
      Body: stream,
      Metadata: metadata,
    });
  });

  it('should send a put object command with custom metadata', async () => {
    const stream = new Readable();
    const mimeType = 'mimeType';
    const metadata = { name: 'originalName', id: id, foo: 'foo', bar: 'bar' };
    const result = await service.putObject({ stream, id, mimeType, metadata });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: bucket,
      ContentType: mimeType,
      Key: keyPath,
      Body: stream,
      Metadata: metadata
    });
  });

  it('should send a put object command with custom tags', async () => {
    const stream = new Readable();
    const mimeType = 'mimeType';
    const metadata = { name: 'originalName', id: id };
    const tags = { foo: 'foo', bar: 'bar' };
    const result = await service.putObject({ stream, id, mimeType, metadata, tags });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: bucket,
      ContentType: mimeType,
      Key: keyPath,
      Body: stream,
      Metadata: metadata,
      Tagging: 'foo=foo&bar=bar'
    });
  });
});

describe('putObjectTagging', () => {
  beforeEach(() => {
    s3ClientMock.on(PutObjectTaggingCommand).resolves({});
  });

  it('should send a put object tagging command', async () => {
    const filePath = 'filePath';
    const tags = [{ Key: 'abc', Value: '123' }];
    const result = await service.putObjectTagging({ filePath, tags });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectTaggingCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(PutObjectTaggingCommand, {
      Bucket: bucket,
      Key: filePath,
      Tagging: {
        TagSet: [{ Key: 'abc', Value: '123' }]
      },
      VersionId: undefined
    });
  });

  it('should send a put object tagging command for a specific version', async () => {
    const filePath = 'filePath';
    const versionId = '1234';
    const tags = [{ Key: 'abc', Value: '123' }];
    const result = await service.putObjectTagging({ filePath, tags, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectTaggingCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(PutObjectTaggingCommand, {
      Bucket: bucket,
      Key: filePath,
      Tagging: {
        TagSet: [{ Key: 'abc', Value: '123' }]
      },
      VersionId: versionId
    });
  });
});

describe('readObject', () => {
  beforeEach(() => {
    s3ClientMock.on(GetObjectCommand).resolves({});
  });

  it('should send a get object command for the latest object', async () => {
    const filePath = 'filePath';
    const result = await service.readObject({ filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: undefined
    });
  });

  it('should send a get object command for a specific version', async () => {
    const filePath = 'filePath';
    const versionId = '1234';
    const result = await service.readObject({ filePath, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: versionId
    });
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

  it('should call presignUrl with a get object command for the latest object and default expiration', async () => {
    const filePath = 'filePath';
    const result = await service.readSignedUrl({ filePath });

    expect(result).toBeTruthy();
    expect(presignUrlMock).toHaveBeenCalledTimes(1);
    expect(presignUrlMock).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        Bucket: bucket,
        Key: filePath
      }
    }), defaultTempExpiresIn);
  });

  it('should call presignUrl with a get object command for a specific version and default expiration', async () => {
    const filePath = 'filePath';
    const versionId = '1234';
    const result = await service.readSignedUrl({ filePath, versionId });

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

  it('should call presignUrl with a get object command for a specific version and custom expiration', async () => {
    const filePath = 'filePath';
    const versionId = '1234';
    const expires = '2345';
    const result = await service.readSignedUrl({ filePath, versionId, expiresIn: expires });

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
