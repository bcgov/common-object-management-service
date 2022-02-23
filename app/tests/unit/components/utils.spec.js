const utils = require('../../../src/components/utils');



describe('delimit', () => {
  it('should return blank if no input string', () => {
    expect(utils.delimit(undefined)).toEqual('');
    expect(utils.delimit('')).toEqual('');
    expect(utils.delimit(null)).toEqual('');
  });

  it('should return the input string if it already ends with delimiter', () => {
    expect(utils.delimit('1234/')).toEqual('1234/');
    expect(utils.delimit('/')).toEqual('/');
  });

  it('should return the input string plus the delimiter', () => {
    expect(utils.delimit('1234')).toEqual('1234/');
    expect(utils.delimit('    ')).toEqual('    /');
  });
});

describe('join', () => {
  it('should return blank if nothing supplied', () => {
    expect(utils.join()).toEqual('');
  });

  it('should return multiple parts joined with the delimiter', () => {
    expect(utils.join('my', 'file', 'path')).toEqual('my/file/path');
    expect(utils.join('my', '', 'path')).toEqual('my/path');
    expect(utils.join('my', 'file/path/123', 'abc')).toEqual('my/file/path/123/abc');
  });

  it('should handle no-length sections', () => {
    expect(utils.join('my', 'file//123', 'abc')).toEqual('my/file/123/abc');
  });
});

describe('getPath', () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  const delimitSpy = jest.spyOn(utils, 'delimit');
  const joinSpy = jest.spyOn(utils, 'join');

  it('should return whatever join returns', () => {
    // test actual join impl below
    delimitSpy.mockReturnValue('abc');
    joinSpy.mockReturnValue('abc/obj');
    expect(utils.getPath('obj')).toEqual('abc/obj');
    expect(delimitSpy).toHaveBeenCalledTimes(1);
    expect(joinSpy).toHaveBeenCalledTimes(1);
    expect(joinSpy).toHaveBeenCalledWith('abc', 'obj');
  });
});
