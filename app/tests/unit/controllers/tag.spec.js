const controller = require('../../../src/controllers/tag');
const { tagService } = require('../../../src/services');

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


describe('searchTags', () => {
  // mock service calls
  const tagSearchTagsSpy = jest.spyOn(tagService, 'searchTags');

  const next = jest.fn();

  it('should return all tags with no params', async () => {
    // request object
    const req = {
      currentUser: { authType: 'BEARER' },
      headers: {},
      query: {}
    };

    const GoodResponse = [{
      key: 'foo',
      value: 'bar'
    },
    {
      key: 'baz',
      value: 'quz'
    }];

    tagSearchTagsSpy.mockReturnValue(GoodResponse);

    await controller.searchTags(req, res, next);

    expect(tagSearchTagsSpy).toHaveBeenCalledWith({
      tags: undefined,
    });

    expect(res.json).toHaveBeenCalledWith(GoodResponse);
    expect(res.status).toHaveBeenCalledWith(200);
  });

  it('should return only matching tags', async () => {
    // request object
    const req = {
      currentUser: { authType: 'BEARER' },
      headers: {},
      query: {
        tagset: {
          foo: ''
        }
      }
    };

    const GoodResponse = [{
      key: 'foo',
      value: 'bar'
    }];

    tagSearchTagsSpy.mockReturnValue(GoodResponse);

    await controller.searchTags(req, res, next);

    expect(tagSearchTagsSpy).toHaveBeenCalledWith({
      tag: { foo: '' },
    });
    expect(res.json).toHaveBeenCalledWith(GoodResponse);
    expect(res.status).toHaveBeenCalledWith(200);
  });
});
