const {
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectTaggingCommand,
  GetBucketEncryptionCommand,
  GetBucketVersioningCommand,
  GetObjectCommand,
  GetObjectTaggingCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  ListObjectVersionsCommand,
  PutBucketEncryptionCommand,
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

const DEFAULTREGION = 'us-east-1'; // Need to specify valid AWS region or it'll explode ('us-east-1' is default, 'ca-central-1' for Canada)
const bucket = 'bucket';
const key = 'filePath';
const defaultTempExpiresIn = parseInt(config.get('server.defaultTempExpiresIn'), 10);

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
  utils.getBucket = jest.fn(() => ({
    accessKeyId: 'accessKeyId',
    bucket: bucket,
    endpoint: 'https://endpoint.com',
    key: key,
    region: DEFAULTREGION,
    secretAccessKey: config.get('secretAccessKey')
  }));
  utils.isAtPath = jest.fn(() => true);
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
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
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
    const s3VersionId = '1234';
    const result = await service.copyObject({ copySource, filePath, s3VersionId });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(CopyObjectCommand, {
      Bucket: bucket,
      CopySource: `${bucket}/${copySource}`,
      Key: filePath,
      Metadata: undefined,
      MetadataDirective: MetadataDirective.COPY,
      TaggingDirective: TaggingDirective.COPY,
      VersionId: s3VersionId
    });
  });

  it('should send a copy object command replacing the metadata', async () => {
    const copySource = 'filePath';
    const filePath = 'filePath';
    const metadata = { 'x-amz-meta-test': 123 };
    const metadataDirective = MetadataDirective.REPLACE;
    const result = await service.copyObject({ copySource, filePath, metadata, metadataDirective });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
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
    const s3VersionId = '1234';
    const result = await service.copyObject({ copySource, filePath, metadata, metadataDirective, s3VersionId });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(CopyObjectCommand, {
      Bucket: bucket,
      CopySource: `${bucket}/${copySource}`,
      Key: filePath,
      Metadata: metadata,
      MetadataDirective: metadataDirective,
      TaggingDirective: TaggingDirective.COPY,
      VersionId: s3VersionId
    });
  });

  it('should send a copy object command replacing the tags', async () => {
    const copySource = 'filePath';
    const filePath = 'filePath';
    const tags = { 'test': 123 };
    const taggingDirective = TaggingDirective.REPLACE;
    const result = await service.copyObject({ copySource, filePath, tags, taggingDirective });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
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
    const s3VersionId = '1234';
    const result = await service.copyObject({ copySource, filePath, tags, taggingDirective, s3VersionId });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(CopyObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(CopyObjectCommand, {
      Bucket: bucket,
      CopySource: `${bucket}/${copySource}`,
      Key: filePath,
      Metadata: undefined,
      MetadataDirective: MetadataDirective.COPY,
      Tagging: 'test=123',
      TaggingDirective: taggingDirective,
      VersionId: s3VersionId
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
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(DeleteObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(DeleteObjectCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: undefined
    });
  });

  it('should send a delete object command for a specific version', async () => {
    const filePath = 'filePath';
    const s3VersionId = '1234';
    const result = await service.deleteObject({ filePath, s3VersionId });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(DeleteObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(DeleteObjectCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: s3VersionId
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
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(DeleteObjectTaggingCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(DeleteObjectTaggingCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: undefined
    });
  });

  it('should send a delete object tagging command for a specific version', async () => {
    const filePath = 'filePath';
    const s3VersionId = '1234';
    const result = await service.deleteObjectTagging({ filePath, s3VersionId });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(DeleteObjectTaggingCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(DeleteObjectTaggingCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: s3VersionId
    });
  });
});

describe('headBucket', () => {
  beforeEach(() => {
    s3ClientMock.on(HeadBucketCommand).resolves({});
  });

  it('should send a head bucket command', async () => {
    const result = await service.headBucket({ bucketId: 'abc-123' });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(HeadBucketCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(HeadBucketCommand, {
      Bucket: bucket
    });
  });

  it('should not get the existing bucket if no id provided', async () => {
    const result = await service.headBucket({ region: 'test', bucket: 'specify' });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(0);
    expect(s3ClientMock).toHaveReceivedCommandTimes(HeadBucketCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(HeadBucketCommand, {
      Bucket: 'specify'
    });
  });

  it('should not get the existing bucket if default params', async () => {
    const result = await service.headBucket();

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(0);
    expect(s3ClientMock).toHaveReceivedCommandTimes(HeadBucketCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(HeadBucketCommand, {
      Bucket: undefined
    });
  });
});

describe('getBucketEncryption', () => {
  beforeEach(() => {
    s3ClientMock.on(GetBucketEncryptionCommand).resolves({});
  });

  it('should send a get bucket encryption command', async () => {
    const result = await service.getBucketEncryption();

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(GetBucketEncryptionCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(GetBucketEncryptionCommand, {
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
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
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
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(GetObjectTaggingCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(GetObjectTaggingCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: undefined
    });
  });

  it('should send a put object tagging command for a specific version', async () => {
    const filePath = 'filePath';
    const s3VersionId = '1234';
    const result = await service.getObjectTagging({ filePath, s3VersionId });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(GetObjectTaggingCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(GetObjectTaggingCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: s3VersionId
    });
  });
});

describe('headObject', () => {
  beforeEach(() => {
    s3ClientMock.on(HeadObjectCommand).resolves({});
  });

  it('should send a head object command', async () => {
    const filePath = 'filePath';
    const s3VersionId = '123';
    const result = await service.headObject({ filePath, s3VersionId });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(HeadObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(HeadObjectCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: s3VersionId
    });
  });

  it('should not require a version ID parameter', async () => {
    const filePath = 'filePath';
    const s3VersionId = undefined;
    const result = await service.headObject({ filePath, s3VersionId });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(HeadObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(HeadObjectCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: s3VersionId
    });
  });
});

describe('listAllObjects', () => {
  const listObjectsV2Mock = jest.spyOn(service, 'listObjectsV2');

  beforeEach(() => {
    listObjectsV2Mock.mockReset();
  });

  afterAll(() => {
    listObjectsV2Mock.mockRestore();
  });

  it('should call listObjectsV2 at least once and return an empty array', async () => {
    listObjectsV2Mock.mockResolvedValue({ IsTruncated: false });

    const result = await service.listAllObjects();

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(0);
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(utils.isAtPath).toHaveBeenCalledTimes(0);
    expect(listObjectsV2Mock).toHaveBeenCalledTimes(1);
    expect(listObjectsV2Mock).toHaveBeenCalledWith(expect.objectContaining({
      filePath: key
    }));
  });

  it('should call listObjectsV2 at least once and return an empty array of objects', async () => {
    listObjectsV2Mock.mockResolvedValue({ Contents: [], IsTruncated: false });

    const result = await service.listAllObjects();

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(0);
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(utils.isAtPath).toHaveBeenCalledTimes(0);
    expect(listObjectsV2Mock).toHaveBeenCalledTimes(1);
    expect(listObjectsV2Mock).toHaveBeenCalledWith(expect.objectContaining({
      filePath: key
    }));
  });

  it('should call listObjectsV2 multiple times and return an array of precise path objects', async () => {
    const continueToken = 'token';
    listObjectsV2Mock.mockResolvedValueOnce({ Contents: [{ Key: 'filePath/foo' }], IsTruncated: true, NextContinuationToken: continueToken });
    listObjectsV2Mock.mockResolvedValueOnce({ Contents: [{ Key: 'filePath/bar' }], IsTruncated: false });

    const result = await service.listAllObjects();

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining([
      { Key: 'filePath/foo' },
      { Key: 'filePath/bar' }
    ]));
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(utils.isAtPath).toHaveBeenCalledTimes(2);
    expect(listObjectsV2Mock).toHaveBeenCalledTimes(2);
    expect(listObjectsV2Mock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      filePath: key
    }));
    expect(listObjectsV2Mock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      filePath: key,
      continuationToken: continueToken
    }));
  });

  it('should call listObjectsV2 multiple times and return an array of all path objects', async () => {
    const continueToken = 'token';
    listObjectsV2Mock.mockResolvedValueOnce({ Contents: [{ Key: 'filePath/test/foo' }], IsTruncated: true, NextContinuationToken: continueToken });
    listObjectsV2Mock.mockResolvedValueOnce({ Contents: [{ Key: 'filePath/test/bar' }], IsTruncated: false });

    const result = await service.listAllObjects({ precisePath: false });

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining([
      { Key: 'filePath/test/foo' },
      { Key: 'filePath/test/bar' }
    ]));
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(utils.isAtPath).toHaveBeenCalledTimes(0);
    expect(listObjectsV2Mock).toHaveBeenCalledTimes(2);
    expect(listObjectsV2Mock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      filePath: key
    }));
    expect(listObjectsV2Mock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      filePath: key,
      continuationToken: continueToken
    }));
  });

  it('should call listObjectsV2 multiple times with the right bucketId and filePath, returning an array of objects', async () => {
    const continueToken = 'token';
    const customPath = 'filePath/test';
    listObjectsV2Mock.mockResolvedValueOnce({ Contents: [{ Key: 'filePath/test/foo' }], IsTruncated: true, NextContinuationToken: continueToken });
    listObjectsV2Mock.mockResolvedValueOnce({ Contents: [{ Key: 'filePath/test/bar' }], IsTruncated: false });

    const result = await service.listAllObjects({ filePath: customPath, bucketId: bucket });

    expect(result).toBeTruthy();
    expect(Array.isArray(result)).toBeTruthy();
    expect(result).toHaveLength(2);
    expect(result).toEqual(expect.arrayContaining([
      { Key: 'filePath/test/foo' },
      { Key: 'filePath/test/bar' }
    ]));
    expect(utils.getBucket).toHaveBeenCalledTimes(0);
    expect(utils.isAtPath).toHaveBeenCalledTimes(2);
    expect(listObjectsV2Mock).toHaveBeenCalledTimes(2);
    expect(listObjectsV2Mock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      filePath: customPath,
      bucketId: bucket
    }));
    expect(listObjectsV2Mock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      filePath: customPath,
      continuationToken: continueToken,
      bucketId: bucket
    }));
  });
});

describe('listAllObjectVersions', () => {
  const listObjectVersionMock = jest.spyOn(service, 'listObjectVersion');
  const bucketId = 'abc';

  beforeEach(() => {
    listObjectVersionMock.mockReset();
  });

  afterAll(() => {
    listObjectVersionMock.mockRestore();
  });

  it('should call listObjectVersion at least once and yield empty arrays', async () => {
    listObjectVersionMock.mockResolvedValue({ IsTruncated: false });

    const result = await service.listAllObjectVersions({ filePath: '/' });

    expect(result).toBeTruthy();
    expect(Array.isArray(result.DeleteMarkers)).toBeTruthy();
    expect(result.DeleteMarkers).toHaveLength(0);
    expect(Array.isArray(result.Versions)).toBeTruthy();
    expect(result.Versions).toHaveLength(0);
    expect(utils.getBucket).toHaveBeenCalledTimes(0);
    expect(utils.isAtPath).toHaveBeenCalledTimes(0);
    expect(listObjectVersionMock).toHaveBeenCalledTimes(1);
    expect(listObjectVersionMock).toHaveBeenCalledWith(expect.objectContaining({
      filePath: ''
    }));
  });

  it('should call listObjectVersion at least once with bucket lookup and yield empty arrays', async () => {
    utils.getBucket.mockResolvedValue({ key: key });
    listObjectVersionMock.mockResolvedValue({ IsTruncated: false });

    const result = await service.listAllObjectVersions({ bucketId: bucketId });

    expect(result).toBeTruthy();
    expect(Array.isArray(result.DeleteMarkers)).toBeTruthy();
    expect(result.DeleteMarkers).toHaveLength(0);
    expect(Array.isArray(result.Versions)).toBeTruthy();
    expect(result.Versions).toHaveLength(0);
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(utils.getBucket).toHaveBeenCalledWith(bucketId);
    expect(utils.isAtPath).toHaveBeenCalledTimes(0);
    expect(listObjectVersionMock).toHaveBeenCalledTimes(1);
    expect(listObjectVersionMock).toHaveBeenCalledWith(expect.objectContaining({
      filePath: key,
      bucketId: bucketId
    }));
  });

  it('should call listObjectVersion multiple times and return precise path objects', async () => {
    const nextKeyMarker = 'token';
    listObjectVersionMock.mockResolvedValueOnce({ DeleteMarkers: [{ Key: 'filePath/foo' }], IsTruncated: true, NextKeyMarker: nextKeyMarker });
    listObjectVersionMock.mockResolvedValueOnce({ Versions: [{ Key: 'filePath/bar' }], IsTruncated: false });

    const result = await service.listAllObjectVersions({ filePath: 'filePath' });

    expect(result).toBeTruthy();
    expect(Array.isArray(result.DeleteMarkers)).toBeTruthy();
    expect(result.DeleteMarkers).toHaveLength(1);
    expect(result.DeleteMarkers).toEqual(expect.arrayContaining([
      { Key: 'filePath/foo' }
    ]));
    expect(Array.isArray(result.Versions)).toBeTruthy();
    expect(result.Versions).toHaveLength(1);
    expect(result.Versions).toEqual(expect.arrayContaining([
      { Key: 'filePath/bar' }
    ]));
    expect(utils.getBucket).toHaveBeenCalledTimes(0);
    expect(utils.isAtPath).toHaveBeenCalledTimes(2);
    expect(listObjectVersionMock).toHaveBeenCalledTimes(2);
    expect(listObjectVersionMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      filePath: key
    }));
    expect(listObjectVersionMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      filePath: key,
      keyMarker: nextKeyMarker
    }));
  });

  it('should call listObjectVersion multiple times and return all path objects', async () => {
    const nextKeyMarker = 'token';
    listObjectVersionMock.mockResolvedValueOnce({ DeleteMarkers: [{ Key: 'filePath/test/foo' }], IsTruncated: true, NextKeyMarker: nextKeyMarker });
    listObjectVersionMock.mockResolvedValueOnce({ Versions: [{ Key: 'filePath/test/bar' }], IsTruncated: false });

    const result = await service.listAllObjectVersions({ filePath: 'filePath', precisePath: false });

    expect(result).toBeTruthy();
    expect(Array.isArray(result.DeleteMarkers)).toBeTruthy();
    expect(result.DeleteMarkers).toHaveLength(1);
    expect(result.DeleteMarkers).toEqual(expect.arrayContaining([
      { Key: 'filePath/test/foo' }
    ]));
    expect(Array.isArray(result.Versions)).toBeTruthy();
    expect(result.Versions).toHaveLength(1);
    expect(result.Versions).toEqual(expect.arrayContaining([
      { Key: 'filePath/test/bar' }
    ]));
    expect(utils.getBucket).toHaveBeenCalledTimes(0);
    expect(utils.isAtPath).toHaveBeenCalledTimes(0);
    expect(listObjectVersionMock).toHaveBeenCalledTimes(2);
    expect(listObjectVersionMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      filePath: key
    }));
    expect(listObjectVersionMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      filePath: key,
      keyMarker: nextKeyMarker
    }));
  });

  it('should call listObjectVersion multiple times and return all latest path objects', async () => {
    const nextKeyMarker = 'token';
    listObjectVersionMock.mockResolvedValueOnce({ DeleteMarkers: [{ Key: 'filePath/test/foo', IsLatest: true }], IsTruncated: true, NextKeyMarker: nextKeyMarker });
    listObjectVersionMock.mockResolvedValueOnce({ Versions: [{ Key: 'filePath/test/bar', IsLatest: false }], IsTruncated: false });

    const result = await service.listAllObjectVersions({ filePath: 'filePath', precisePath: false, filterLatest: true });

    expect(result).toBeTruthy();
    expect(Array.isArray(result.DeleteMarkers)).toBeTruthy();
    expect(result.DeleteMarkers).toHaveLength(1);
    expect(result.DeleteMarkers).toEqual(expect.arrayContaining([
      { Key: 'filePath/test/foo', IsLatest: true }
    ]));
    expect(Array.isArray(result.Versions)).toBeTruthy();
    expect(result.Versions).toHaveLength(0);
    expect(utils.getBucket).toHaveBeenCalledTimes(0);
    expect(utils.isAtPath).toHaveBeenCalledTimes(0);
    expect(listObjectVersionMock).toHaveBeenCalledTimes(2);
    expect(listObjectVersionMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      filePath: key
    }));
    expect(listObjectVersionMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      filePath: key,
      keyMarker: nextKeyMarker
    }));
  });
});

describe('listObjectsV2', () => {
  beforeEach(() => {
    s3ClientMock.on(ListObjectsV2Command).resolves({});
  });

  it('should send a list objects command with default undefined maxKeys', async () => {
    const filePath = 'filePath';
    const result = await service.listObjectsV2({ filePath });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(ListObjectsV2Command, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(ListObjectsV2Command, {
      Bucket: bucket,
      Prefix: filePath,
      MaxKeys: undefined
    });
  });

  it('should send a list objects command with 200 maxKeys', async () => {
    const filePath = 'filePath';
    const maxKeys = 200;
    const result = await service.listObjectsV2({ filePath, maxKeys });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(ListObjectsV2Command, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(ListObjectsV2Command, {
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
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
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
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    expect(getSignedUrl).toHaveBeenCalledWith(expect.any(Object), command, { expiresIn: defaultTempExpiresIn });
  });

  it('should call getSignedUrl with custom expiry', async () => {
    getSignedUrl.mockResolvedValue('foo');
    const command = {};
    const expiresIn = 1234;
    const result = await service.presignUrl(command, expiresIn);

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    expect(getSignedUrl).toHaveBeenCalledWith(expect.any(Object), command, { expiresIn: expiresIn });
  });
});

describe('putBucketEncryption', () => {
  beforeEach(() => {
    s3ClientMock.on(PutBucketEncryptionCommand).resolves({});
  });

  it('should send a get bucket encryption command', async () => {
    const result = await service.putBucketEncryption();

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutBucketEncryptionCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(PutBucketEncryptionCommand, {
      Bucket: bucket,
      ServerSideEncryptionConfiguration: {
        Rules: [{
          ApplyServerSideEncryptionByDefault: {
            SSEAlgorithm: 'AES256'
          }
        }]
      }
    });
  });
});

describe('putObject', () => {
  const name = 'foo.txt';
  const keyPath = utils.joinPath(key, name);
  const length = 123;

  beforeEach(() => {
    s3ClientMock.on(PutObjectCommand).resolves({});
  });

  it('should send a put object command', async () => {
    const stream = new Readable();
    const mimeType = 'mimeType';
    const result = await service.putObject({ stream, name, length, mimeType });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: bucket,
      ContentLength: length,
      ContentType: mimeType,
      Key: keyPath,
      Body: stream
    });
  });

  it('should send a put object command with custom metadata', async () => {
    const stream = new Readable();
    const mimeType = 'mimeType';
    const metadata = { foo: 'foo', bar: 'bar' };
    const result = await service.putObject({ stream, name, length, mimeType, metadata });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: bucket,
      ContentLength: length,
      ContentType: mimeType,
      Key: keyPath,
      Body: stream,
      Metadata: metadata
    });
  });

  it('should send a put object command with custom tags', async () => {
    const stream = new Readable();
    const mimeType = 'mimeType';
    const tags = { foo: 'foo', bar: 'bar' };
    const result = await service.putObject({ stream, name, length, mimeType, tags });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: bucket,
      ContentLength: length,
      ContentType: mimeType,
      Key: keyPath,
      Body: stream,
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
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
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
    const s3VersionId = '1234';
    const tags = [{ Key: 'abc', Value: '123' }];
    const result = await service.putObjectTagging({ filePath, tags, s3VersionId });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectTaggingCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(PutObjectTaggingCommand, {
      Bucket: bucket,
      Key: filePath,
      Tagging: {
        TagSet: [{ Key: 'abc', Value: '123' }]
      },
      VersionId: s3VersionId
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
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: undefined
    });
  });

  it('should send a get object command for a specific version', async () => {
    const filePath = 'filePath';
    const s3VersionId = '1234';
    const result = await service.readObject({ filePath, s3VersionId });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(GetObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(GetObjectCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: s3VersionId
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

  it('should call presignUrl with a get object command for the latest object and default expiration and bucketId', async () => {
    const filePath = 'filePath';
    const bucketId = 'abc';
    const result = await service.readSignedUrl({ filePath, bucketId: bucketId });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(presignUrlMock).toHaveBeenCalledTimes(1);
    expect(presignUrlMock).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        Bucket: bucket,
        Key: filePath
      }
    }), defaultTempExpiresIn, bucketId);
  });

  it('should call presignUrl with a get object command for a specific version and default expiration', async () => {
    const filePath = 'filePath';
    const s3VersionId = '1234';
    const bucketId = 'abc';
    const result = await service.readSignedUrl({ filePath, s3VersionId, bucketId });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(presignUrlMock).toHaveBeenCalledTimes(1);
    expect(presignUrlMock).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        Bucket: bucket,
        Key: filePath,
        VersionId: s3VersionId
      }
    }), defaultTempExpiresIn, bucketId);
  });

  it('should call presignUrl with a get object command for a specific version and custom expiration', async () => {
    const filePath = 'filePath';
    const s3VersionId = '1234';
    const expires = '2345';
    const bucketId = 'abc';
    const result = await service.readSignedUrl({ filePath, s3VersionId, expiresIn: expires, bucketId });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(presignUrlMock).toHaveBeenCalledTimes(1);
    expect(presignUrlMock).toHaveBeenCalledWith(expect.objectContaining({
      input: {
        Bucket: bucket,
        Key: filePath,
        VersionId: s3VersionId
      }
    }), expires, bucketId);
  });
});

describe('upload', () => {
  const id = 'id';

  beforeEach(() => {
    s3ClientMock.on(PutObjectCommand).resolves({});
    s3ClientMock.on(PutObjectTaggingCommand).resolves({});
  });

  afterEach(() => {
    jest.resetAllMocks(); // TODO: Figure out why we can't do this at top level?
  });

  it('should send a put object command', async () => {
    const stream = new Readable({
      read() {
        this.push(null); // End the stream
      }
    });
    const mimeType = 'mimeType';
    const metadata = { 'coms-name': 'originalName', 'coms-id': id };
    const result = await service.upload({ stream, id, mimeType, metadata });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedCommandWith(PutObjectCommand, {
      Bucket: bucket,
      ContentType: mimeType,
      Key: expect.any(String), // TODO: Fix after getPath is refactored
      Body: expect.any(Object),
      Metadata: metadata,
    });
  });

  it('should send a put object and put object tagging command', async () => {
    const stream = new Readable({
      read() {
        this.push(null); // End the stream
      }
    });
    const mimeType = 'mimeType';
    const metadata = { 'coms-name': 'originalName', 'coms-id': id };
    const tags = { foo: 'bar' };
    const result = await service.upload({ stream, id, mimeType, metadata, tags });

    expect(result).toBeTruthy();
    expect(utils.getBucket).toHaveBeenCalledTimes(1);
    expect(s3ClientMock).toHaveReceivedCommandTimes(PutObjectCommand, 1);
    expect(s3ClientMock).toHaveReceivedNthCommandWith(1, PutObjectCommand, {
      Bucket: bucket,
      ContentType: mimeType,
      Key: expect.any(String), // TODO: Fix after getPath is refactored
      Body: expect.any(Buffer),
      Metadata: metadata,
      Tagging: 'foo=bar'
    });
  });
});
