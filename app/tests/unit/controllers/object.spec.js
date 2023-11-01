const Problem = require('api-problem');
const { MAXCOPYOBJECTLENGTH, MetadataDirective, TaggingDirective } = require('../../../src/components/constants');

const utils = require('../../../src/db/models/utils');

const controller = require('../../../src/controllers/object');
const { storageService, objectService, metadataService, tagService, versionService, userService } = require('../../../src/services');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};
// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
jest.mock('config');

let res = undefined;
beforeEach(() => {
  res = mockResponse();
});

afterEach(() => {
  jest.resetAllMocks();
});

describe('addMetadata', () => {
  // mock service calls
  const storageGetObjectTaggingSpy = jest.spyOn(storageService, 'getObjectTagging');
  const storageHeadObjectSpy = jest.spyOn(storageService, 'headObject');
  const storageCopyObjectSpy = jest.spyOn(storageService, 'copyObject');
  const versionCopySpy = jest.spyOn(versionService, 'copy');
  const metadataAssociateMetadataSpy = jest.spyOn(metadataService, 'associateMetadata');
  const tagAssociateTagsSpy = jest.spyOn(tagService, 'associateTags');
  const trxWrapperSpy = jest.spyOn(utils, 'trxWrapper');
  const setHeadersSpy = jest.spyOn(controller, '_processS3Headers');

  const next = jest.fn();

  // response from S3
  const GoodResponse = {
    ContentLength: 1234,
    CopyObjectResultETag: { ETag: '"abcd"' },
    Metadata: { foo: 'bar' },
    VersionId: '5678'
  };
  const BadResponse = {
    MontentLength: MAXCOPYOBJECTLENGTH + 1
  };

  it('should error when Content-Length is greater than 5GB', async () => {
    // request object
    const req = {};

    storageHeadObjectSpy.mockReturnValue(BadResponse);
    await controller.addMetadata(req, res, next);
    expect(next).toHaveBeenCalledWith(new Problem(500, 'Internal Server Error'));
  });

  it('should add the metadata', async () => {
    // request object
    const req = {
      currentObject: {
        path: 'xyz-789'
      },
      headers: { 'x-amz-meta-baz': 'quz' },
      params: { objectId: 'xyz-789' },
      query: {}
    };

    storageHeadObjectSpy.mockResolvedValue(GoodResponse);
    storageGetObjectTaggingSpy.mockResolvedValue({ TagSet: [] });
    storageCopyObjectSpy.mockResolvedValue(GoodResponse);
    trxWrapperSpy.mockImplementation(callback => callback({}));
    versionCopySpy.mockResolvedValue({ id: '5dad1ec9-d3c0-4b0f-8ead-cb4d9fa98987' });
    metadataAssociateMetadataSpy.mockResolvedValue({});
    setHeadersSpy.mockImplementation(x => x);

    await controller.addMetadata(req, res, next);

    expect(storageCopyObjectSpy).toHaveBeenCalledWith({
      copySource: 'xyz-789',
      filePath: 'xyz-789',
      metadata: {
        foo: 'bar',
        baz: 'quz'
      },
      tags: {
        'coms-id': 'xyz-789'
      },
      metadataDirective: MetadataDirective.REPLACE,
      taggingDirective: TaggingDirective.REPLACE,
      s3VersionId: undefined
    });

    expect(trxWrapperSpy).toHaveBeenCalledTimes(1);
    expect(versionCopySpy).toHaveBeenCalledTimes(1);
    expect(metadataAssociateMetadataSpy).toHaveBeenCalledTimes(1);
    expect(tagAssociateTagsSpy).toHaveBeenCalledTimes(1);
    expect(res.status).toHaveBeenCalledWith(204);
  });
});

describe('addTags', () => {
  // mock service calls
  const storageGetObjectTaggingSpy = jest.spyOn(storageService, 'getObjectTagging');
  const storagePutObjectTaggingSpy = jest.spyOn(storageService, 'putObjectTagging');
  const getCurrentUserIdSpy = jest.spyOn(userService, 'getCurrentUserId');


  const next = jest.fn();

  it('should add the new tags', async () => {
    // response from S3
    const getObjectTaggingResponse = { TagSet: []};

    // request object
    const req = {
      currentObject: { bucketId: 'bid-123', path: 'xyz-789' },
      params: { objectId: 'xyz-789' },
      query: {
        tagset: { foo: 'bar', baz: 'bam' },
        s3VersionId: '123'
      }
    };
    getCurrentUserIdSpy.mockReturnValue('user-123');
    storageGetObjectTaggingSpy.mockResolvedValue(getObjectTaggingResponse);
    storagePutObjectTaggingSpy.mockResolvedValue({});

    await controller.addTags(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(storagePutObjectTaggingSpy).toHaveBeenCalledWith({
      bucketId: 'bid-123',
      filePath: 'xyz-789',
      tags: [
        { Key: 'foo', Value: 'bar' },
        { Key: 'baz', Value: 'bam' },
        { Key: 'coms-id', Value: 'xyz-789' }
      ],
      s3VersionId: '123'
    });
  });

  // TODO: enable this test after a re-factor error reporting
  it.skip('responds 409 when total tags is greater than 10', async () => {
    // response from S3
    const getObjectTaggingResponse = {
      TagSet: [
        { Key: 'coms-id', Value: 'xyz-789' }
      ]
    };

    // request object
    const req = {
      params: { objectId: 'xyz-789' },
      query: {
        tagset: { a: '1', b: '2', c: '3', d: '4', e: '5', f: '6', g: '7', h: '8', i: '9', j: '10'}
      }
    };

    storageGetObjectTaggingSpy.mockResolvedValue(getObjectTaggingResponse);

    await controller.addTags(req, res, next);

    // expect(next).toHaveReturned(new Problem(422, 'User-defined Tag count limit is 9'));
  });

  it('should concatenate the new tags', async () => {
    // response from S3
    const getObjectTaggingResponse = {
      TagSet: [{ Key: 'abc', Value: '123' }]
    };

    // request object
    const req = {
      currentObject: { bucketId: 'bid-123', path: 'xyz-789' },
      params: { objectId: 'xyz-789' },
      query: {
        tagset: { foo: 'bar', baz: 'bam' }
      }
    };

    storageGetObjectTaggingSpy.mockResolvedValue(getObjectTaggingResponse);
    storagePutObjectTaggingSpy.mockResolvedValue({});

    await controller.addTags(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(storagePutObjectTaggingSpy).toHaveBeenCalledWith({
      bucketId: 'bid-123',
      filePath: 'xyz-789',
      tags: [
        { Key: 'foo', Value: 'bar' },
        { Key: 'baz', Value: 'bam' },
        { Key: 'abc', Value: '123' },
        { Key: 'coms-id', Value: 'xyz-789' }
      ],
      s3VersionId: undefined
    });
  });
});

describe('deleteMetadata', () => {
  // mock service calls
  const storageHeadObjectSpy = jest.spyOn(storageService, 'headObject');
  const storageCopyObjectSpy = jest.spyOn(storageService, 'copyObject');
  const storageGetObjectTaggingSpy = jest.spyOn(storageService, 'getObjectTagging');

  const next = jest.fn();

  // response from S3
  const GoodResponse = {
    ContentLength: 1234,
    Metadata: { foo: 'bar', baz: 'quz' }
  };
  const BadResponse = {
    ContentLength: MAXCOPYOBJECTLENGTH + 1
  };
  const getObjectTaggingResponse = {
    TagSet: [{ Key: 'abc', Value: '123' }]
  };

  it('should error when Content-Length is greater than 5GB', async () => {
    // request object
    const req = {};

    storageHeadObjectSpy.mockReturnValue(BadResponse);
    await controller.deleteMetadata(req, res, next);
    expect(next).toHaveBeenCalledWith(new Problem(500, 'Internal Server Error'));
  });

  it('should delete the requested metadata', async () => {
    // request object
    const req = {
      currentObject: { bucketId: 'bid-123', path: 'xyz-789' },
      headers: { 'x-amz-meta-foo': 'bar' },
      params: { objectId: 'xyz-789' },
      query: {}
    };

    storageHeadObjectSpy.mockReturnValue(GoodResponse);
    storageCopyObjectSpy.mockReturnValue({});
    storageGetObjectTaggingSpy.mockResolvedValue(getObjectTaggingResponse);

    await controller.deleteMetadata(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(storageCopyObjectSpy).toHaveBeenCalledWith({
      bucketId: 'bid-123',
      copySource: 'xyz-789',
      filePath: 'xyz-789',
      metadata: {
        baz: 'quz'
      },
      metadataDirective: MetadataDirective.REPLACE,
      taggingDirective: TaggingDirective.REPLACE,
      tags: {
        abc: '123',
        'coms-id': 'xyz-789'
      },
      s3VersionId: undefined
    });
  });

  it('should delete all the metadata when none provided', async () => {
    // request object
    const req = {
      currentObject: { bucketId: 'bid-123', path: 'xyz-789' },
      headers: {},
      params: { objectId: 'xyz-789' },
      query: {}
    };

    storageHeadObjectSpy.mockReturnValue(GoodResponse);
    storageCopyObjectSpy.mockReturnValue({});
    storageGetObjectTaggingSpy.mockResolvedValue(getObjectTaggingResponse);

    await controller.deleteMetadata(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(storageCopyObjectSpy).toHaveBeenCalledWith({
      bucketId: 'bid-123',
      copySource: 'xyz-789',
      filePath: 'xyz-789',
      metadata: undefined,
      metadataDirective: MetadataDirective.REPLACE,
      taggingDirective: TaggingDirective.REPLACE,
      tags: {
        abc: '123',
        'coms-id': 'xyz-789'
      },
      s3VersionId: undefined
    });
  });
});

describe('deleteObject', () => {
  // mock service calls
  const getCurrentUserIdSpy = jest.spyOn(userService, 'getCurrentUserId');
  const storageDeleteObjectSpy = jest.spyOn(storageService, 'deleteObject');
  const objectDeleteSpy = jest.spyOn(objectService, 'delete');
  const versionCreateSpy = jest.spyOn(versionService, 'create');
  const versionDeleteSpy = jest.spyOn(versionService, 'delete');
  const versionListSpy = jest.spyOn(versionService, 'list');
  const pruneOrphanedMetadataSpy = jest.spyOn(metadataService, 'pruneOrphanedMetadata');
  const pruneOrphanedTagsSpy = jest.spyOn(tagService, 'pruneOrphanedTags');

  // request object
  const req = {
    params: { objectId: 'xyz-789' },
  };
  const next = jest.fn();

  // response from S3
  const DeleteMarker = {
    DeleteMarker: true,
    VersionId: '1234'
  };

  it('should call version service to create a delete marker in db', async () => {
    // request is to delete an object (no s3VersionId query parameter passed)
    req.query = {};
    getCurrentUserIdSpy.mockReturnValue('user-123');
    // storage response is a DeleteMarker
    storageDeleteObjectSpy.mockReturnValue(DeleteMarker);

    await controller.deleteObject(req, res, next);

    expect(versionCreateSpy).toHaveBeenCalledTimes(1);
    expect(versionCreateSpy).toHaveBeenCalledWith({
      id: 'xyz-789',
      isLatest: true,
      deleteMarker: true,
      s3VersionId: '1234',
    }, 'user-123');
  });

  it('should delete object if versioning not enabled', async () => {
    req.query = {};
    // storage response has no version properties
    storageDeleteObjectSpy.mockReturnValue({});

    await controller.deleteObject(req, res, next);

    expect(versionCreateSpy).toHaveBeenCalledTimes(0);
    expect(objectDeleteSpy).toHaveBeenCalledTimes(1);
    expect(objectDeleteSpy).toHaveBeenCalledWith('xyz-789');
  });

  it('should return the storage service response', async () => {
    req.query = {};
    storageDeleteObjectSpy.mockReturnValue(DeleteMarker);
    versionCreateSpy.mockReturnValue({});

    await controller.deleteObject(req, res, next);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(DeleteMarker);
    expect(next).toHaveBeenCalledTimes(0);
  });

  it('should call version service to delete a version', async () => {
    // version delete request includes s3VersionId query param
    req.query = { s3VersionId: '123' };
    getCurrentUserIdSpy.mockResolvedValue('456');
    // S3 returns version that was deleted
    storageDeleteObjectSpy.mockReturnValue({
      VersionId: '123'
    });

    await controller.deleteObject(req, res, next);
    expect(versionDeleteSpy).toHaveBeenCalledTimes(1);
    expect(versionDeleteSpy).toHaveBeenCalledWith('xyz-789', '123');
  });

  it('should delete object if object has no other remaining versions', async () => {
    req.query = { s3VersionId: '123' };
    getCurrentUserIdSpy.mockReturnValue('user-123');
    storageDeleteObjectSpy.mockReturnValue({
      VersionId: '123'
    });
    versionDeleteSpy.mockReturnValue({});
    pruneOrphanedMetadataSpy.mockReturnValue({});
    pruneOrphanedTagsSpy.mockReturnValue({});
    // list all versions returns empty array
    versionListSpy.mockReturnValue([]);

    await controller.deleteObject(req, res, next);

    expect(versionListSpy).toHaveBeenCalledTimes(1);
    expect(objectDeleteSpy).toHaveBeenCalledTimes(1);
    expect(objectDeleteSpy).toHaveBeenCalledWith('xyz-789');
  });

  it('should return a problem if an exception happens', async () => {
    storageDeleteObjectSpy.mockImplementationOnce(() => { throw new Error(); });

    await controller.deleteObject(req, res, next);
    expect(storageDeleteObjectSpy).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(new Problem(500, 'Internal Server Error'));
  });
});

describe('deleteTags', () => {
  // mock service calls
  const storageGetObjectTaggingSpy = jest.spyOn(storageService, 'getObjectTagging');
  const storagePutObjectTaggingSpy = jest.spyOn(storageService, 'putObjectTagging');
  const storageDeleteObjectTaggingSpy = jest.spyOn(storageService, 'deleteObjectTagging');

  const next = jest.fn();

  it('should delete all tags when no query keys are present', async () => {
    // response from S3
    const getObjectTaggingResponse = {};

    // request object
    const req = {
      currentObject: { bucketId: 'bid-123', path: 'xyz-789' },
      params: { objectId: 'xyz-789' },
      query: { foo: 'bar', baz: 'bam' }
    };

    storageGetObjectTaggingSpy.mockReturnValue(getObjectTaggingResponse);
    storagePutObjectTaggingSpy.mockResolvedValue({});

    await controller.deleteTags(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(storageDeleteObjectTaggingSpy).toHaveBeenCalledTimes(0);
    expect(storagePutObjectTaggingSpy).toHaveBeenCalledTimes(1);
    expect(storagePutObjectTaggingSpy).toHaveBeenCalledWith({
      bucketId: 'bid-123',
      filePath: 'xyz-789',
      tags: [{ Key: 'coms-id', Value: 'xyz-789' }],
      s3VersionId: undefined
    });
  });

  it('should delete the requested tags', async () => {
    // response from S3
    const getObjectTaggingResponse = {
      TagSet: [
        { Key: 'foo', Value: 'bar' },
        { Key: 'baz', Value: 'bam' },
        { Key: 'abc', Value: '123' }]
    };

    // request object
    const req = {
      currentObject: { bucketId: 'bid-123', path: 'xyz-789' },
      params: { objectId: 'xyz-789' },
      query: {
        tagset: { foo: '', baz: '' }
      }
    };

    storageGetObjectTaggingSpy.mockReturnValue(getObjectTaggingResponse);
    storagePutObjectTaggingSpy.mockResolvedValue({});

    await controller.deleteTags(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(storagePutObjectTaggingSpy).toHaveBeenCalledWith({
      bucketId: 'bid-123',
      filePath: 'xyz-789',
      tags: [
        { Key: 'abc', Value: '123' },
        { Key: 'coms-id', Value: 'xyz-789' }
      ],
      s3VersionId: undefined
    });
    expect(storageDeleteObjectTaggingSpy).toHaveBeenCalledTimes(0);
  });
});

describe('listObjectVersions', () => {
  // mock service calls
  const versionListSpy = jest.spyOn(versionService, 'list');
  const next = jest.fn();
  // mock request parameters
  const req = {
    params: { objectId: 'abc' },
  };

  it('should call version Service list', async () => {
    versionListSpy.mockReturnValue({});

    await controller.listObjectVersion(req, res, next);

    expect(versionListSpy).toHaveBeenCalledWith('abc');
    expect(res.status).toHaveBeenCalledWith(200);
  });
});

describe('replaceMetadata', () => {
  // mock service calls
  const storageGetObjectTaggingSpy = jest.spyOn(storageService, 'getObjectTagging');
  const storageHeadObjectSpy = jest.spyOn(storageService, 'headObject');
  const storageCopyObjectSpy = jest.spyOn(storageService, 'copyObject');

  const next = jest.fn();

  // response from S3
  const GoodResponse = {
    ContentLength: 1234,
    Metadata: { 'coms-id': 1, 'coms-name': 'test', foo: 'bar' }
  };
  const BadResponse = {
    ContentLength: MAXCOPYOBJECTLENGTH + 1
  };

  it('should error when Content-Length is greater than 5GB', async () => {
    // request object
    const req = {};

    storageHeadObjectSpy.mockReturnValue(BadResponse);
    await controller.replaceMetadata(req, res, next);
    expect(next).toHaveBeenCalledWith(new Problem(500, 'Internal Server Error'));
  });

  it('should replace the metadata', async () => {
    // request object
    const req = {
      currentObject: { bucketId: 'bid-123', path: 'xyz-789' },
      headers: { 'x-amz-meta-baz': 'quz' },
      params: { objectId: 'xyz-789' },
      query: {}
    };

    storageHeadObjectSpy.mockReturnValue(GoodResponse);
    storageGetObjectTaggingSpy.mockResolvedValue({ TagSet: [] });
    storageCopyObjectSpy.mockReturnValue({});

    await controller.replaceMetadata(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(storageCopyObjectSpy).toHaveBeenCalledWith({
      bucketId: 'bid-123',
      copySource: 'xyz-789',
      filePath: 'xyz-789',
      metadata: { baz: 'quz' },
      metadataDirective: MetadataDirective.REPLACE,
      taggingDirective: TaggingDirective.REPLACE,
      tags: { 'coms-id': 'xyz-789' },
      s3VersionId: undefined
    });
  });

  it('should replace replace the name', async () => {
    // request object
    const req = {
      currentObject: { bucketId: 'bid-123', path: 'xyz-789' },
      headers: { 'x-amz-meta-coms-name': 'newName', 'x-amz-meta-baz': 'quz' },
      params: { objectId: 'xyz-789' },
      query: {}
    };

    storageHeadObjectSpy.mockReturnValue(GoodResponse);
    storageGetObjectTaggingSpy.mockResolvedValue({ TagSet: [] });
    storageCopyObjectSpy.mockReturnValue({});

    await controller.replaceMetadata(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(storageCopyObjectSpy).toHaveBeenCalledWith({
      bucketId: 'bid-123',
      copySource: 'xyz-789',
      filePath: 'xyz-789',
      metadata: { baz: 'quz', 'coms-name': 'newName' },
      metadataDirective: MetadataDirective.REPLACE,
      taggingDirective: TaggingDirective.REPLACE,
      tags: { 'coms-id': 'xyz-789' },
      s3VersionId: undefined
    });
  });
});

describe('replaceTags', () => {
  // mock service calls
  const storageGetObjectTaggingSpy = jest.spyOn(storageService, 'getObjectTagging');
  const storagePutObjectTaggingSpy = jest.spyOn(storageService, 'putObjectTagging');

  const next = jest.fn();

  it('should add the new tags', async () => {
    // response from S3
    const getObjectTaggingResponse = {};

    // request object
    const req = {
      currentObject: { bucketId: 'bid-123', path: 'xyz-789' },
      params: { objectId: 'xyz-789' },
      query: {
        tagset: { foo: 'bar', baz: 'bam' }
      }
    };

    storageGetObjectTaggingSpy.mockReturnValue(getObjectTaggingResponse);
    storagePutObjectTaggingSpy.mockReturnValue({});

    await controller.replaceTags(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(storagePutObjectTaggingSpy).toHaveBeenCalledWith({
      bucketId: 'bid-123',
      filePath: 'xyz-789',
      tags: [
        { Key: 'foo', Value: 'bar' },
        { Key: 'baz', Value: 'bam' },
        { Key: 'coms-id', Value: 'xyz-789' }
      ],
      s3VersionId: undefined
    });
  });
});

