const config = require('config');

const { AuthMode, AuthType } = require('../../../src/components/constants');
const utils = require('../../../src/components/utils');

// Mock config library - @see https://stackoverflow.com/a/64819698
jest.mock('config');

beforeEach(() => {
  config.get.mockReset();
  config.has.mockReset();
});

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

describe('getAppAuthMode', () => {
  it('should return no auth', () => {
    // define enabled flags basicAuth.enabled then keycloak.enabled
    config.has
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(false);
    // define enabled flags
    expect(utils.getAppAuthMode()).toEqual(AuthMode.NOAUTH);
    expect(config.has).toHaveBeenCalledTimes(2);
  });
  it('should return basic auth', () => {
    // define enabled flags basicAuth.enabled then keycloak.enabled
    config.has
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    expect(utils.getAppAuthMode()).toEqual(AuthMode.BASICAUTH);
    expect(config.has).toHaveBeenCalledTimes(2);
  });
  it('should return oidc auth', () => {
    // define enabled flags basicAuth.enabled then keycloak.enabled
    config.has
      .mockReturnValueOnce(false)
      .mockReturnValueOnce(true);
    expect(utils.getAppAuthMode()).toEqual(AuthMode.OIDCAUTH);
    expect(config.has).toHaveBeenCalledTimes(2);
  });
  it('should return full auth', () => {
    // define enabled flags basicAuth.enabled then keycloak.enabled
    config.has
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);
    expect(utils.getAppAuthMode()).toEqual(AuthMode.FULLAUTH);
    expect(config.has).toHaveBeenCalledTimes(2);
  });
});

describe('getCurrentOidcId', () => {
  it('should return the undefined defaul if no current user', () => {
    expect(utils.getCurrentOidcId()).toBeUndefined();
    expect(utils.getCurrentOidcId(null)).toBeUndefined();
    expect(utils.getCurrentOidcId(undefined)).toBeUndefined();
    expect(utils.getCurrentOidcId('')).toBeUndefined();
  });

  it('should return the defined default if no current user', () => {
    const def = 'abc-123';
    expect(utils.getCurrentOidcId(null, def)).toEqual(def);
    expect(utils.getCurrentOidcId(undefined, def)).toEqual(def);
    expect(utils.getCurrentOidcId('', def)).toEqual(def);
  });

  it('should return the defined default if not BEARER auth type', () => {
    const def = 'abc-123';
    expect(utils.getCurrentOidcId({}, def)).toEqual(def);
    expect(utils.getCurrentOidcId({ a: 1 }, def)).toEqual(def);
    expect(utils.getCurrentOidcId({ authType: AuthType.BASIC }, def)).toEqual(def);
  });

  it('should return the sub if it it BEARER', () => {
    const currentUser = {
      authType: AuthType.BEARER,
      tokenPayload: {
        sub: 'xyz-sub'
      }
    };
    expect(utils.getCurrentOidcId(currentUser)).toEqual('xyz-sub');
    expect(utils.getCurrentOidcId(currentUser, 'a default')).toEqual('xyz-sub');
  });
});

describe('mixedQueryToArray', () => {
  it('should return undefined if no param', () => {
    expect(utils.mixedQueryToArray()).toBeUndefined();
    expect(utils.mixedQueryToArray(null)).toBeUndefined();
    expect(utils.mixedQueryToArray(undefined)).toBeUndefined();
    expect(utils.mixedQueryToArray('')).toBeUndefined();
    expect(utils.mixedQueryToArray(false)).toBeUndefined();
  });

  it('should return the undefined for an empty array', () => {
    expect(utils.mixedQueryToArray([])).toBeUndefined();
  });

  it('should return a one item array for a single string', () => {
    expect(utils.mixedQueryToArray('word')).toEqual(['word']);
    expect(utils.mixedQueryToArray('more than than one word word')).toEqual(['more than than one word word']);
    expect(utils.mixedQueryToArray(['word'])).toEqual(['word']);
  });

  it('should return an array with the appropriate set when there are multiples', () => {
    expect(utils.mixedQueryToArray('there,are,duplicates,here,yes,here,there,is,here')).toEqual(['there', 'are', 'duplicates', 'here', 'yes', 'is']);
  });

  it('should return an array with the appropriate set when there are multiples and spaces', () => {
    expect(utils.mixedQueryToArray('there,  are, duplicates,  here ,yes ,here ,there,is,here ')).toEqual(['there', 'are', 'duplicates', 'here', 'yes', 'is']);
  });

  it('should return an array with the appropriate set when there are multiples and spaces', () => {
    expect(utils.mixedQueryToArray(['there', '  are', ' duplicates', '  here ', 'yes ', 'here ', 'there', 'is', 'here '])).toEqual(['there', 'are', 'duplicates', 'here', 'yes', 'is']);
  });
});

describe('parseCSV', () => {
  it('should return the input back if it is not a string', () => {
    expect(utils.parseCSV(undefined)).toEqual(undefined);
    expect(utils.parseCSV(12)).toEqual(12);
    expect(utils.parseCSV(null)).toEqual(null);
    expect(utils.parseCSV(['a', 'b'])).toEqual(['a', 'b']);
    expect(utils.parseCSV({ a: 'a', b: 'b' })).toEqual({ a: 'a', b: 'b' });
  });

  it('should return an array of split trimmed strings for blanks', () => {
    expect(utils.parseCSV('')).toEqual(['']);
    expect(utils.parseCSV('   ,   ')).toEqual(['', '']);
  });

  it('should return an array of split trimmed strings for blanks', () => {
    expect(utils.parseCSV('this, is , a,test  ')).toEqual(['this', 'is', 'a', 'test']);
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

describe('streamToBuffer', () => {
  it('should reject on a non stream input', async () => {
    await expect(utils.streamToBuffer())
      .rejects
      .toThrow();
    await expect(utils.streamToBuffer(123))
      .rejects
      .toThrow();
  });
  it('should return a buffer', async () => {
    const Readable = require('stream').Readable;
    const s = new Readable();
    s._read = () => { }; // redundant? see update below
    s.push('your text here');
    s.push(null);
    const res = await utils.streamToBuffer(s);
    await expect(res).toBeTruthy();
    await expect(res).toBeInstanceOf(Buffer);
  });
});
