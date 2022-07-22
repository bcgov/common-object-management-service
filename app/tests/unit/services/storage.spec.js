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
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { mockClient } = require('aws-sdk-client-mock');
const config = require('config');
const { Readable } = require('stream');

const service = require('../../../src/services/storage');
const utils = require('../../../src/components/utils');
const { MetadataDirective, TaggingDirective } = require('../../../src/components/constants');

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

describe('copyObject', () => {
  beforeEach(() => {
    s3ClientMock.on(CopyObjectCommand).resolves({});
  });

  it('should send a copy object command copying the metadata and tags', () => {
    const copySource = 'filePath';
    const filePath = 'filePath';
    const result = service.copyObject({ copySource, filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(CopyObjectCommand, {
      Bucket: bucket,
      CopySource: `${bucket}/${copySource}`,
      Key: filePath,
      Metadata: undefined,
      MetadataDirective: MetadataDirective.COPY,
      TaggingDirective: TaggingDirective.COPY,
      VersionId: undefined
    }, true)).toHaveLength(1);
  });

  it('should send a copy object command copying the metadata and tags for a specific version', () => {
    const copySource = 'filePath';
    const filePath = 'filePath';
    const versionId = '1234';
    const result = service.copyObject({ copySource, filePath, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(CopyObjectCommand, {
      Bucket: bucket,
      CopySource: `${bucket}/${copySource}`,
      Key: filePath,
      Metadata: undefined,
      MetadataDirective: MetadataDirective.COPY,
      TaggingDirective: TaggingDirective.COPY,
      VersionId: versionId
    }, true)).toHaveLength(1);
  });

  it('should send a copy object command replacing the metadata', () => {
    const copySource = 'filePath';
    const filePath = 'filePath';
    const metadata = { 'x-amz-meta-test': 123 };
    const metadataDirective = MetadataDirective.REPLACE;
    const result = service.copyObject({ copySource, filePath, metadata, metadataDirective });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(CopyObjectCommand, {
      Bucket: bucket,
      CopySource: `${bucket}/${copySource}`,
      Key: filePath,
      Metadata: metadata,
      MetadataDirective: metadataDirective,
      TaggingDirective: TaggingDirective.COPY,
      VersionId: undefined
    }, true)).toHaveLength(1);
  });

  it('should send a copy object command replacing the metadata for a specific version', () => {
    const copySource = 'filePath';
    const filePath = 'filePath';
    const metadata = { 'x-amz-meta-test': 123 };
    const metadataDirective = MetadataDirective.REPLACE;
    const versionId = '1234';
    const result = service.copyObject({ copySource, filePath, metadata, metadataDirective, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(CopyObjectCommand, {
      Bucket: bucket,
      CopySource: `${bucket}/${copySource}`,
      Key: filePath,
      Metadata: metadata,
      MetadataDirective: metadataDirective,
      TaggingDirective: TaggingDirective.COPY,
      VersionId: versionId
    }, true)).toHaveLength(1);
  });

  it('should send a copy object command replacing the tags', () => {
    const copySource = 'filePath';
    const filePath = 'filePath';
    const tags = { 'test': 123 };
    const taggingDirective = TaggingDirective.REPLACE;
    const result = service.copyObject({ copySource, filePath, tags, taggingDirective });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(CopyObjectCommand, {
      Bucket: bucket,
      CopySource: `${bucket}/${copySource}`,
      Key: filePath,
      Metadata: undefined,
      MetadataDirective: MetadataDirective.COPY,
      Tagging: 'test=123',
      TaggingDirective: taggingDirective,
      VersionId: undefined
    }, true)).toHaveLength(1);
  });

  it('should send a copy object command replacing the tags for a specific version', () => {
    const copySource = 'filePath';
    const filePath = 'filePath';
    const tags = { 'test': 123 };
    const taggingDirective = TaggingDirective.REPLACE;
    const versionId = '1234';
    const result = service.copyObject({ copySource, filePath, tags, taggingDirective, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(CopyObjectCommand, {
      Bucket: bucket,
      CopySource: `${bucket}/${copySource}`,
      Key: filePath,
      Metadata: undefined,
      MetadataDirective: MetadataDirective.COPY,
      Tagging: 'test=123',
      TaggingDirective: taggingDirective,
      VersionId: versionId
    }, true)).toHaveLength(1);
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
      Key: filePath,
      VersionId: undefined
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

describe('deleteObjectTagging', () => {
  beforeEach(() => {
    s3ClientMock.on(DeleteObjectTaggingCommand).resolves({});
  });

  it('should send a delete object tagging command', () => {
    const filePath = 'filePath';
    const result = service.deleteObjectTagging({ filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(DeleteObjectTaggingCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: undefined
    }, true)).toHaveLength(1);
  });

  it('should send a delete object tagging command for a specific version', () => {
    const filePath = 'filePath';
    const versionId = '1234';
    const result = service.deleteObjectTagging({ filePath, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(DeleteObjectTaggingCommand, {
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

  it('should send a head bucket command', () => {
    const result = service.headBucket();

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(HeadBucketCommand, {
      Bucket: bucket
    }, true)).toHaveLength(1);
  });
});

describe('getBucketVersioning', () => {
  beforeEach(() => {
    s3ClientMock.on(GetBucketVersioningCommand).resolves({});
  });

  it('should send a get bucket versioning command', () => {
    const result = service.getBucketVersioning();

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(GetBucketVersioningCommand, {
      Bucket: bucket
    }, true)).toHaveLength(1);
  });
});

describe('getObjectTagging', () => {
  beforeEach(() => {
    s3ClientMock.on(GetObjectTaggingCommand).resolves({});
  });

  it('should send a get object tagging command', () => {
    const filePath = 'filePath';
    const result = service.getObjectTagging({ filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(GetObjectTaggingCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: undefined
    }, true)).toHaveLength(1);
  });

  it('should send a put object tagging command for a specific version', () => {
    const filePath = 'filePath';
    const versionId = '1234';
    const result = service.getObjectTagging({ filePath, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(GetObjectTaggingCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: versionId
    }, true)).toHaveLength(1);
  });
});

describe('headObject', () => {
  beforeEach(() => {
    s3ClientMock.on(HeadObjectCommand).resolves({});
  });

  it('should send a head object command', () => {
    const filePath = 'filePath';
    const versionId = '123';
    const result = service.headObject({ filePath, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(HeadObjectCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: versionId
    }, true)).toHaveLength(1);
  });

  it('should not require a version ID parameter', () => {
    const filePath = 'filePath';
    const versionId = undefined;
    const result = service.headObject({ filePath, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(HeadObjectCommand, {
      Bucket: bucket,
      Key: filePath,
      VersionId: versionId
    }, true)).toHaveLength(1);
  });
});

describe('listObjects', () => {
  beforeEach(() => {
    s3ClientMock.on(ListObjectsCommand).resolves({});
  });

  it('should send a list objects command with default 2^31-1 maxKeys', () => {
    const filePath = 'filePath';
    const result = service.listObjects({ filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(ListObjectsCommand, {
      Bucket: bucket,
      Prefix: filePath,
      MaxKeys: (2 ** 31) - 1
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
    const mimeType = 'mimeType';
    const metadata = { name: 'originalName', id: id };
    const result = service.putObject({ stream, id, mimeType, metadata });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(PutObjectCommand, {
      Bucket: bucket,
      ContentType: mimeType,
      Key: utils.joinPath(key, id),
      Body: stream,
      Metadata: metadata,
    }, true)).toHaveLength(1);
  });

  it('should send a put object command with custom metadata', () => {
    const stream = new Readable();
    const id = 'id';
    const mimeType = 'mimeType';
    const metadata = { name: 'originalName', id: id, foo: 'foo', bar: 'bar' };
    const result = service.putObject({ stream, id, mimeType, metadata });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(PutObjectCommand, {
      Bucket: bucket,
      ContentType: mimeType,
      Key: utils.joinPath(key, id),
      Body: stream,
      Metadata: metadata
    }, true)).toHaveLength(1);
  });

  it('should send a put object command with custom tags', () => {
    const stream = new Readable();
    const id = 'id';
    const mimeType = 'mimeType';
    const metadata = { name: 'originalName', id: id };
    const tags = { foo: 'foo', bar: 'bar' };
    const result = service.putObject({ stream, id, mimeType, metadata, tags });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(PutObjectCommand, {
      Bucket: bucket,
      ContentType: mimeType,
      Key: utils.joinPath(key, id),
      Body: stream,
      Metadata: metadata,
      Tagging: 'foo=foo&bar=bar'
    }, true)).toHaveLength(1);
  });
});

describe('putObjectTagging', () => {
  beforeEach(() => {
    s3ClientMock.on(PutObjectTaggingCommand).resolves({});
  });

  it('should send a put object tagging command', () => {
    const filePath = 'filePath';
    const tags = [{ Key: 'abc', Value: '123' }];
    const result = service.putObjectTagging({ filePath, tags });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(PutObjectTaggingCommand, {
      Bucket: bucket,
      Key: filePath,
      Tagging: {
        TagSet: [{ Key: 'abc', Value: '123' }]
      },
      VersionId: undefined
    }, true)).toHaveLength(1);
  });

  it('should send a put object tagging command for a specific version', () => {
    const filePath = 'filePath';
    const versionId = '1234';
    const tags = [{ Key: 'abc', Value: '123' }];
    const result = service.putObjectTagging({ filePath, tags, versionId });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(PutObjectTaggingCommand, {
      Bucket: bucket,
      Key: filePath,
      Tagging: {
        TagSet: [{ Key: 'abc', Value: '123' }]
      },
      VersionId: versionId
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
      Key: filePath,
      VersionId: undefined
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
