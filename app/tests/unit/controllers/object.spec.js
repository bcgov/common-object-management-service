const Problem = require('api-problem');
const { AuthType, MAXCOPYOBJECTLENGTH, MetadataDirective } = require('../../../src/components/constants');

const controller = require('../../../src/controllers/object');
const { storageService, objectService, versionService } = require('../../../src/services');

const mockResponse = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.end = jest.fn().mockReturnValue(res);
  return res;
};
// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
jest.mock('config');

const res = mockResponse();

describe('addMetadata', () => {
  // mock service calls
  const storageHeadObjectSpy = jest.spyOn(storageService, 'headObject');
  const storageCopyObjectSpy = jest.spyOn(storageService, 'copyObject');

  const next = jest.fn();

  // response from S3
  const GoodResponse = {
    ContentLength: 1234,
    Metadata: { id: 1, foo: 'bar' }
  };
  const BadResponse = {
    MontentLength: MAXCOPYOBJECTLENGTH + 1
  };

  it('should error when Content-Length is greater than 5GB', async () => {
    // request object
    const req = {};

    storageHeadObjectSpy.mockReturnValue(BadResponse);
    await controller.addMetadata(req, res, next);
    expect(next).toHaveBeenCalledWith(new Problem(502, 'Unknown ObjectService Error'));
  });

  it('responds 422 when no keys are present', async () => {
    // request object
    const req = {
      headers: {},
      params: { objId: 'xyz-789' },
      query: {}
    };

    storageHeadObjectSpy.mockReturnValue(GoodResponse);

    await controller.addMetadata(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('should add the metadata', async () => {
    // request object
    const req = {
      headers: { 'x-amz-meta-baz': 'quz' },
      params: { objId: 'xyz-789' },
      query: {}
    };

    storageHeadObjectSpy.mockReturnValue(GoodResponse);
    storageCopyObjectSpy.mockReturnValue({});

    await controller.addMetadata(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(storageCopyObjectSpy).toHaveBeenCalledWith({
      copySource: 'xyz-789',
      filePath: 'xyz-789',
      metadata: {
        foo: 'bar',
        baz: 'quz',
        id: 1
      },
      metadataDirective: MetadataDirective.REPLACE,
      versionId: undefined
    });
  });
});

describe('deleteMetadata', () => {
  // mock service calls
  const storageHeadObjectSpy = jest.spyOn(storageService, 'headObject');
  const storageCopyObjectSpy = jest.spyOn(storageService, 'copyObject');

  const next = jest.fn();

  // response from S3
  const GoodResponse = {
    ContentLength: 1234,
    Metadata: { id: 1, name: 'test', foo: 'bar', baz: 'quz' }
  };
  const BadResponse = {
    ContentLength: MAXCOPYOBJECTLENGTH + 1
  };

  it('should error when Content-Length is greater than 5GB', async () => {
    // request object
    const req = {};

    storageHeadObjectSpy.mockReturnValue(BadResponse);
    await controller.deleteMetadata(req, res, next);
    expect(next).toHaveBeenCalledWith(new Problem(502, 'Unknown ObjectService Error'));
  });

  it('should delete the requested metadata', async () => {
    // request object
    const req = {
      headers: { 'x-amz-meta-foo': 'bar' },
      params: { objId: 'xyz-789' },
      query: {}
    };

    storageHeadObjectSpy.mockReturnValue(GoodResponse);
    storageCopyObjectSpy.mockReturnValue({});

    await controller.deleteMetadata(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(storageCopyObjectSpy).toHaveBeenCalledWith({
      copySource: 'xyz-789',
      filePath: 'xyz-789',
      metadata: {
        baz: 'quz',
        id: 1,
        name: 'test',
      },
      metadataDirective: MetadataDirective.REPLACE,
      versionId: undefined
    });
  });

  it('should delete all the metadata when none provided', async () => {
    // request object
    const req = {
      headers: {},
      params: { objId: 'xyz-789' },
      query: {}
    };

    storageHeadObjectSpy.mockReturnValue(GoodResponse);
    storageCopyObjectSpy.mockReturnValue({});

    await controller.deleteMetadata(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(storageCopyObjectSpy).toHaveBeenCalledWith({
      copySource: 'xyz-789',
      filePath: 'xyz-789',
      metadata: {
        id: 1,
        name: 'test'
      },
      metadataDirective: MetadataDirective.REPLACE,
      versionId: undefined
    });
  });
});

describe('deleteObject', () => {
  // mock service calls
  const storageDeleteObjectSpy = jest.spyOn(storageService, 'deleteObject');
  const objectDeleteSpy = jest.spyOn(objectService, 'delete');
  const versionCreateSpy = jest.spyOn(versionService, 'create');
  const versionDeleteSpy = jest.spyOn(versionService, 'delete');
  const versionListSpy = jest.spyOn(versionService, 'list');

  // request object
  const req = {
    currentUser: { authType: AuthType.BEARER, tokenPayload: { sub: 'testsub' } },
    params: { objId: 'xyz-789' }
  };
  const next = jest.fn();

  // response from S3
  const DeleteMarker = {
    DeleteMarker: true,
    VersionId: '1234'
  };

  it('should call version service to create a delete marker in db', async () => {
    // request is to delete an object (no versionId query parameter passed)
    req.query = {};
    // storage response is a DeleteMarker
    storageDeleteObjectSpy.mockReturnValue(DeleteMarker);

    await controller.deleteObject(req, res, next);

    expect(versionCreateSpy).toHaveBeenCalledTimes(1);
    expect(versionCreateSpy).toHaveBeenCalledWith([{
      id: 'xyz-789',
      DeleteMarker: true,
      VersionId: '1234',
      mimeType: null,
      originalName: null
    }], 'testsub');
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
    // version delete request includes versionId query param
    req.query = { versionId: '123' };
    // S3 returns version that was deleted
    storageDeleteObjectSpy.mockReturnValue({
      VersionId: '123'
    });

    await controller.deleteObject(req, res, next);
    expect(versionDeleteSpy).toHaveBeenCalledTimes(1);
    expect(versionDeleteSpy).toHaveBeenCalledWith('xyz-789', '123');
  });

  it('should delete object if object has no other remaining versions', async () => {
    req.query = { versionId: '123' };
    storageDeleteObjectSpy.mockReturnValue({
      VersionId: '123'
    });
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
    expect(next).toHaveBeenCalledWith(new Problem(502, 'Unknown ObjectService Error'));
  });
});


describe('replaceMetadata', () => {
  // mock service calls
  const storageHeadObjectSpy = jest.spyOn(storageService, 'headObject');
  const storageCopyObjectSpy = jest.spyOn(storageService, 'copyObject');

  const next = jest.fn();

  // response from S3
  const GoodResponse = {
    ContentLength: 1234,
    Metadata: { id: 1, name: 'test', foo: 'bar' }
  };
  const BadResponse = {
    ContentLength: MAXCOPYOBJECTLENGTH + 1
  };

  it('should error when Content-Length is greater than 5GB', async () => {
    // request object
    const req = {};

    storageHeadObjectSpy.mockReturnValue(BadResponse);
    await controller.replaceMetadata(req, res, next);
    expect(next).toHaveBeenCalledWith(new Problem(502, 'Unknown ObjectService Error'));
  });

  it('responds 422 when no keys are present', async () => {
    // request object
    const req = {
      headers: {},
      params: { objId: 'xyz-789' },
      query: {}
    };

    storageHeadObjectSpy.mockReturnValue(GoodResponse);

    await controller.replaceMetadata(req, res, next);

    expect(res.status).toHaveBeenCalledWith(422);
  });

  it('should replace the metadata', async () => {
    // request object
    const req = {
      headers: { 'x-amz-meta-baz': 'quz' },
      params: { objId: 'xyz-789' },
      query: {}
    };

    storageHeadObjectSpy.mockReturnValue(GoodResponse);
    storageCopyObjectSpy.mockReturnValue({});

    await controller.replaceMetadata(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(storageCopyObjectSpy).toHaveBeenCalledWith({
      copySource: 'xyz-789',
      filePath: 'xyz-789',
      metadata: {
        id: 1,
        name: 'test',
        baz: 'quz'
      },
      metadataDirective: MetadataDirective.REPLACE,
      versionId: undefined
    });
  });

  it('should replace replace the name', async () => {
    // request object
    const req = {
      headers: { 'x-amz-meta-name': 'newName', 'x-amz-meta-baz': 'quz' },
      params: { objId: 'xyz-789' },
      query: {}
    };

    storageHeadObjectSpy.mockReturnValue(GoodResponse);
    storageCopyObjectSpy.mockReturnValue({});

    await controller.replaceMetadata(req, res, next);

    expect(res.status).toHaveBeenCalledWith(204);
    expect(storageCopyObjectSpy).toHaveBeenCalledWith({
      copySource: 'xyz-789',
      filePath: 'xyz-789',
      metadata: {
        id: 1,
        name: 'newName',
        baz: 'quz'
      },
      metadataDirective: MetadataDirective.REPLACE,
      versionId: undefined
    });
  });
});
