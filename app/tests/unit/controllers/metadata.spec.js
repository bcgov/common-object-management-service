const controller = require('../../../src/controllers/metadata');
const { metadataService } = require('../../../src/services');

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

describe('searchMetadata', () => {
  // mock service calls
  const metadataSearchMetadataSpy = jest.spyOn(metadataService, 'searchMetadata');
  const next = jest.fn();

  it('should return all metadata with no params', async () => {
    // request object
    const req = {
      currentUser: { authType: 'BEARER' },
      headers: {}
    };

    const GoodResponse = [{
      key: 'foo',
      value: 'bar'
    },
    {
      key: 'baz',
      value: 'quz'
    }];

    metadataSearchMetadataSpy.mockReturnValue(GoodResponse);

    await controller.searchMetadata(req, res, next);

    expect(metadataSearchMetadataSpy).toHaveBeenCalledWith({
      metadata: undefined,
    });

    expect(res.json).toHaveBeenCalledWith(GoodResponse);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return only matching metadata', async () => {
    // request object
    const req = {
      currentUser: { authType: 'BEARER' },
      headers: { 'x-amz-meta-foo': '' }
    };

    const GoodResponse = [{
      key: 'foo',
      value: 'bar'
    }];

    metadataSearchMetadataSpy.mockReturnValue(GoodResponse);

    await controller.searchMetadata(req, res, next);

    expect(metadataSearchMetadataSpy).toHaveBeenCalledWith({
      metadata: { foo: '' },
    });
    expect(res.json).toHaveBeenCalledWith(GoodResponse);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
