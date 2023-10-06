const { currentUpload } = require('../../../src/middleware/upload');

beforeEach(() => {
  jest.resetAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('currentUpload', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      get: jest.fn(),
      socket: { server: {} }
    };
    res = {};
    next = jest.fn();
  });

  it.each([
    [0, undefined, false, undefined, undefined, undefined],
    [0, undefined, false, 0, undefined, undefined],
    [1, { contentLength: 539, filename: undefined, mimeType: 'application/octet-stream' }, false, 539, undefined, undefined],
    [1, { contentLength: 539, filename: undefined, mimeType: 'application/octet-stream' }, false, 539, 'inline', undefined],
    [1, { contentLength: 539, filename: undefined, mimeType: 'application/octet-stream' }, false, 539, 'xattachment', undefined],
    [1, { contentLength: 539, filename: undefined, mimeType: 'application/octet-stream' }, false, 539, 'attachment; xfilename="foo.txt"', undefined],
    [1, { contentLength: 539, filename: 'foo.txt', mimeType: 'application/octet-stream' }, false, 539, 'attachment; filename="foo.txt"', undefined],
    [1, { contentLength: 539, filename: 'foo.txt', mimeType: 'text/plain' }, false, 539, 'attachment; filename="foo.txt"', 'text/plain'],
    [1, { contentLength: 539, filename: 'föo.txt', mimeType: 'text/plain' }, false, 539, 'attachment; filename=foo.txt; filename*=UTF-8\'\'f%C3%B6o.txt', 'text/plain'],
    [1, { contentLength: 539, filename: 'föo.txt', mimeType: 'text/plain' }, false, 539, 'attachment; filename*=UTF-8\'\'f%C3%B6o.txt; filename=foo.txt', 'text/plain'],
    [0, undefined, true, undefined, undefined, undefined],
    [0, undefined, true, 0, undefined, undefined],
    [0, undefined, true, 539, undefined, undefined],
    [0, undefined, true, 539, 'inline', undefined],
    [0, undefined, true, 539, 'xattachment', undefined],
    [0, undefined, true, 539, 'attachment; xfilename="foo.txt"', undefined],
    [1, { contentLength: 539, filename: 'foo.txt', mimeType: 'application/octet-stream' }, true, 539, 'attachment; filename="foo.txt"', undefined],
    [1, { contentLength: 539, filename: 'foo.txt', mimeType: 'text/plain' }, true, 539, 'attachment; filename="foo.txt"', 'text/plain'],
    [1, { contentLength: 539, filename: 'föo.txt', mimeType: 'text/plain' }, true, 539, 'attachment; filename=foo.txt; filename*=UTF-8\'\'f%C3%B6o.txt', 'text/plain'],
    [1, { contentLength: 539, filename: 'föo.txt', mimeType: 'text/plain' }, true, 539, 'attachment; filename*=UTF-8\'\'f%C3%B6o.txt; filename=foo.txt', 'text/plain']
  ])('should call next %i times with currentUpload %j given strict %j, length %j, disposition %j and type %j', (nextCount, current, strict, length, disposition, type) => {
    const sendCount = 1 - nextCount;

    req.get.mockReturnValueOnce(length); // contentlength
    req.get.mockReturnValueOnce(disposition); // contentdisposition
    req.get.mockReturnValueOnce(type); // contenttype

    const result = currentUpload(strict);
    expect(result).toBeInstanceOf(Function);
    if (sendCount) expect(() => result(req, res, next)).toThrow();
    else expect(() => result(req, res, next)).not.toThrow();

    expect(req.currentUpload).toEqual(current);
    expect(next).toHaveBeenCalledTimes(nextCount);
    if (nextCount) {
      expect(req.socket.server.requestTimeout).toEqual(0);
      expect(next).toHaveBeenCalledWith();
    }
  });
});

