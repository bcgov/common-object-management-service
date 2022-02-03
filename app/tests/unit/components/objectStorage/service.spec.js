const {
  DeleteObjectCommand,
  // GetObjectCommand,
  HeadObjectCommand,
  ListObjectVersionsCommand
  // PutObjectCommand,
  // S3Client
} = require('@aws-sdk/client-s3');
const { mockClient } = require('aws-sdk-client-mock');
const config = require('config');

const service = require('../../../../src/components/objectStorage/service');

const bucket = config.get('objectStorage.bucket');

const s3ClientMock = mockClient(service._s3Client);

describe('_s3Client', () => {
  beforeEach(() => {
    s3ClientMock.reset();
  });

  it('should be an object', () => {
    expect(service._s3Client).toBeTruthy();
    expect(typeof service._s3Client).toBe('object');
  });
});

describe('deleteObject', () => {
  beforeEach(() => {
    s3ClientMock.reset();
    s3ClientMock.on(DeleteObjectCommand).resolves({});
  });

  it('should send a delete object command', () => {
    const filePath = 'filePath';
    const result = service.deleteObject({ filePath });

    expect(result).toBeTruthy();
    expect(s3ClientMock.calls()).toHaveLength(1);
    expect(s3ClientMock.commandCalls(DeleteObjectCommand, {
      Bucket: bucket,
      Key: filePath
    }, true)).toHaveLength(1);
  });
});

describe('headObject', () => {
  beforeEach(() => {
    s3ClientMock.reset();
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

describe('listObjectVersion', () => {
  beforeEach(() => {
    s3ClientMock.reset();
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
