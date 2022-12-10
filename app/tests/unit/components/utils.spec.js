const config = require('config');

const { AuthMode, AuthType } = require('../../../src/components/constants');
const { objectService } = require('../../../src/services');
const utils = require('../../../src/components/utils');

// Mock config library - @see {@link https://stackoverflow.com/a/64819698}
jest.mock('config');

beforeEach(() => {
  jest.resetAllMocks();
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('addDashesToUuid', () => {
  it.each([
    [undefined, undefined],
    [null, null],
    [123, 123],
    [{}, {}],
    ['123456789012345678901234567890', '123456789012345678901234567890'],
    ['e0603b59-2edc-45f7-acc7-b0cccd6656e1', 'e0603b592edc45f7acc7b0cccd6656e1'],
    ['e0603b59-2edc-45f7-acc7-b0cccd6656e1', 'E0603B592EDC45F7ACC7B0CCCD6656E1']
  ])('should return %o given %j', (expected, str) => {
    expect(utils.addDashesToUuid(str)).toEqual(expected);
  });
});

describe('getMetadata', () => {
  const headers = {
    'Content-Length': 1234,
    'x-amz-meta-foo': 'bar',
    'x-amz-meta-baz': 'quz',
    'X-Amz-Meta-Bam': 'blam',
    'x-AmZ-mEtA-rUn': 'ran',
  };

  it('should return new object containing metadata headers without x-amz-meta- prefix', () => {
    expect(utils.getMetadata(headers)).toEqual({
      foo: 'bar',
      baz: 'quz',
      bam: 'blam',
      run: 'ran'
    });
  });
});

describe('getPath', () => {
  const delimitSpy = jest.spyOn(utils, 'delimit');
  const joinPath = jest.spyOn(utils, 'joinPath');
  const getBucketKey = jest.spyOn(objectService, 'getBucketKey');

  const key = 'abc';
  const osKey = 'key';
  const value = 'abc/obj';

  it('should return a valid path without a database', async () => {
    delimitSpy.mockReturnValue(key);
    joinPath.mockReturnValue(value);
    config.get.mockReturnValueOnce(osKey); // objectStorage.key
    config.has.mockReturnValueOnce(false); // db.enabled

    const result = await utils.getPath('obj');

    expect(result).toEqual(value);

    expect(delimitSpy).toHaveBeenCalledTimes(1);
    expect(delimitSpy).toHaveBeenCalledWith(osKey);
    expect(joinPath).toHaveBeenCalledTimes(1);
    expect(joinPath).toHaveBeenCalledWith(key, 'obj');
    expect(getBucketKey).toHaveBeenCalledTimes(0);
  });

  it('should return a valid path with a good database lookup', async () => {
    delimitSpy.mockReturnValue('wrong');
    joinPath.mockReturnValue(value);
    getBucketKey.mockResolvedValue({ key: key });
    config.get.mockReturnValueOnce(osKey); // objectStorage.key
    config.has.mockReturnValueOnce(true); // db.enabled

    const result = await utils.getPath('obj');

    expect(result).toEqual(value);

    expect(delimitSpy).toHaveBeenCalledTimes(1);
    expect(delimitSpy).toHaveBeenCalledWith(osKey);
    expect(joinPath).toHaveBeenCalledTimes(1);
    expect(joinPath).toHaveBeenCalledWith(key, 'obj');
    expect(getBucketKey).toHaveBeenCalledTimes(1);
    expect(getBucketKey).toHaveBeenCalledWith('obj');
  });

  it('should return a valid path with a bad database lookup', async () => {
    delimitSpy.mockReturnValue(key);
    joinPath.mockReturnValue(value);
    getBucketKey.mockImplementation(() => { throw new Error(); });
    config.get.mockReturnValueOnce(osKey); // objectStorage.key
    config.has.mockReturnValueOnce(true); // db.enabled

    const result = await utils.getPath('obj');

    expect(result).toEqual(value);

    expect(delimitSpy).toHaveBeenCalledTimes(1);
    expect(delimitSpy).toHaveBeenCalledWith(osKey);
    expect(joinPath).toHaveBeenCalledTimes(1);
    expect(joinPath).toHaveBeenCalledWith(key, 'obj');
    expect(getBucketKey).toHaveBeenCalledTimes(1);
    expect(getBucketKey).toHaveBeenCalledWith('obj');
  });
});

describe('delimit', () => {
  beforeAll(() => {
    if (jest.isMockFunction(utils.delimit)) {
      utils.delimit.mockRestore();
    }
  });

  it.each([
    // Should return empty string if falsy input
    ['', undefined],
    ['', null],
    ['', ''],
    // Strings with trailing delimiters should remain unchanged
    ['1234/', '1234/'],
    ['/', '/'],
    // Strings without trailing delimiters should have delimiter appended
    ['1234/', '1234'],
    ['    /', '    ']
  ])('should return %o given %j', (expected, str) => {
    expect(utils.delimit(str)).toEqual(expected);
  });
});

describe('getAppAuthMode', () => {
  it.each([
    [AuthMode.NOAUTH, false, false],
    [AuthMode.BASICAUTH, true, false],
    [AuthMode.OIDCAUTH, false, true],
    [AuthMode.FULLAUTH, true, true]
  ])('should return %s when basicAuth.enabled %s and keycloak.enabled %s', (expected, basicAuth, keycloak) => {
    config.has
      .mockReturnValueOnce(basicAuth) // basicAuth.enabled
      .mockReturnValueOnce(keycloak); // keycloak.enabled

    const result = utils.getAppAuthMode();

    expect(result).toEqual(expected);
    expect(config.has).toHaveBeenCalledTimes(2);
  });
});

describe('getCurrentIdentity', () => {
  const getCurrentTokenClaimSpy = jest.spyOn(utils, 'getCurrentTokenClaim');
  const parseIdentityKeyClaimsSpy = jest.spyOn(utils, 'parseIdentityKeyClaims');

  const idirClaim = 'idir_user_guid';
  const subClaim = 'sub';

  beforeEach(() => {
    getCurrentTokenClaimSpy.mockReset().mockImplementation(() => { });
    parseIdentityKeyClaimsSpy.mockReset();
  });

  it.each([
    [undefined, [subClaim]],
    [undefined, [idirClaim, subClaim]],
    [null, [subClaim]],
    [null, [idirClaim, subClaim]],
    ['', [subClaim]],
    ['', [idirClaim, subClaim]],
    [[], [subClaim]],
    [[], [idirClaim, subClaim]],
    [{}, [subClaim]],
    [{}, [idirClaim, subClaim]]
  ])('should call functions correctly given %j', (currentUser, idKeys) => {
    parseIdentityKeyClaimsSpy.mockReturnValue(idKeys);

    utils.getCurrentIdentity(currentUser);

    expect(getCurrentTokenClaimSpy).toHaveBeenCalledTimes(idKeys.length);
    if (idKeys.length > 1) expect(getCurrentTokenClaimSpy).toHaveBeenCalledWith(currentUser, idirClaim, undefined);
    expect(getCurrentTokenClaimSpy).toHaveBeenCalledWith(currentUser, subClaim, undefined);
    expect(parseIdentityKeyClaimsSpy).toHaveBeenCalledTimes(1);
    expect(parseIdentityKeyClaimsSpy).toHaveBeenCalledWith();
  });

  it.each([
    [undefined, [subClaim]],
    [undefined, [idirClaim, subClaim]],
    [null, [subClaim]],
    [null, [idirClaim, subClaim]],
    ['', [subClaim]],
    ['', [idirClaim, subClaim]],
    [[], [subClaim]],
    [[], [idirClaim, subClaim]],
    [{}, [subClaim]],
    [{}, [idirClaim, subClaim]]
  ])('should call functions correctly given %j and defaultValue \'default\'', (currentUser, idKeys) => {
    const defaultValue = 'default';
    parseIdentityKeyClaimsSpy.mockReturnValue(idKeys);

    utils.getCurrentIdentity(currentUser, defaultValue);

    expect(getCurrentTokenClaimSpy).toHaveBeenCalledTimes(idKeys.length);
    if (idKeys.length > 1) expect(getCurrentTokenClaimSpy).toHaveBeenCalledWith(currentUser, idirClaim, undefined);
    expect(getCurrentTokenClaimSpy).toHaveBeenCalledWith(currentUser, subClaim, undefined);
    expect(parseIdentityKeyClaimsSpy).toHaveBeenCalledTimes(1);
    expect(parseIdentityKeyClaimsSpy).toHaveBeenCalledWith();
  });
});

describe('getCurrentSubject', () => {
  const getCurrentTokenClaimSpy = jest.spyOn(utils, 'getCurrentTokenClaim');

  beforeEach(() => {
    getCurrentTokenClaimSpy.mockReset().mockImplementation(() => { });
  });

  it.each([undefined, null, '', [], {}])('should call getCurrentTokenClaim correctly given %j', (currentUser) => {
    utils.getCurrentSubject(currentUser);

    expect(getCurrentTokenClaimSpy).toHaveBeenCalledTimes(1);
    expect(getCurrentTokenClaimSpy).toHaveBeenCalledWith(currentUser, 'sub', undefined);
  });

  it.each([undefined, null, '', [], {}])('should call getCurrentTokenClaim correctly given %j and defaultValue \'default\'', (currentUser) => {
    const defaultValue = 'default';
    utils.getCurrentSubject(currentUser, defaultValue);

    expect(getCurrentTokenClaimSpy).toHaveBeenCalledTimes(1);
    expect(getCurrentTokenClaimSpy).toHaveBeenCalledWith(currentUser, 'sub', defaultValue);
  });
});

describe('getCurrentTokenClaim', () => {
  const defaultValue = 'default';

  beforeAll(() => {
    if (jest.isMockFunction(utils.getCurrentTokenClaim)) {
      utils.getCurrentTokenClaim.mockRestore();
    }
  });

  it.each([
    // Should return defaultValue if no currentUser
    [undefined, undefined, undefined],
    [undefined, undefined, 'bad'],
    [undefined, undefined, 'sub'],
    [undefined, null, undefined],
    [undefined, null, 'bad'],
    [undefined, null, 'sub'],
    // Should return defaultValue if invalid currentUser
    [undefined, '', undefined],
    [undefined, '', 'bad'],
    [undefined, '', 'sub'],
    [undefined, {}, undefined],
    [undefined, {}, 'bad'],
    [undefined, {}, 'sub'],
    [undefined, { a: 1 }, undefined],
    [undefined, { a: 1 }, 'bad'],
    [undefined, { a: 1 }, 'sub'],
    // Should return defaultValue if not authType Bearer
    [undefined, { authType: AuthType.BASIC }, undefined],
    [undefined, { authType: AuthType.BASIC }, 'bad'],
    [undefined, { authType: AuthType.BASIC }, 'sub'],
    // Should return claim value if authType Bearer
    [undefined, { authType: AuthType.BEARER, tokenPayload: { sub: 'foo' } }, undefined],
    [undefined, { authType: AuthType.BEARER, tokenPayload: { sub: 'foo' } }, 'bad'],
    ['foo', { authType: AuthType.BEARER, tokenPayload: { sub: 'foo' } }, 'sub'],
  ])('should return %j given currentUser %j and claim %j', (expected, currentUser, claim) => {
    expect(utils.getCurrentTokenClaim(currentUser, claim)).toBe(expected);
  });

  it.each([
    // Should return defaultValue if no currentUser
    [defaultValue, undefined, undefined],
    [defaultValue, undefined, 'bad'],
    [defaultValue, undefined, 'sub'],
    [defaultValue, null, undefined],
    [defaultValue, null, 'bad'],
    [defaultValue, null, 'sub'],
    // Should return defaultValue if invalid currentUser
    [defaultValue, '', undefined],
    [defaultValue, '', 'bad'],
    [defaultValue, '', 'sub'],
    [defaultValue, {}, undefined],
    [defaultValue, {}, 'bad'],
    [defaultValue, {}, 'sub'],
    [defaultValue, { a: 1 }, undefined],
    [defaultValue, { a: 1 }, 'bad'],
    [defaultValue, { a: 1 }, 'sub'],
    // Should return defaultValue if not authType Bearer
    [defaultValue, { authType: AuthType.BASIC }, undefined],
    [defaultValue, { authType: AuthType.BASIC }, 'bad'],
    [defaultValue, { authType: AuthType.BASIC }, 'sub'],
    // Should return claim value if authType Bearer
    [undefined, { authType: AuthType.BEARER, tokenPayload: { sub: 'foo' } }, undefined],
    [undefined, { authType: AuthType.BEARER, tokenPayload: { sub: 'foo' } }, 'bad'],
    ['foo', { authType: AuthType.BEARER, tokenPayload: { sub: 'foo' } }, 'sub'],
  ])('should return %j given currentUser %j, claim %j and defaultValue \'default\'', (expected, currentUser, claim) => {
    expect(utils.getCurrentTokenClaim(currentUser, claim, defaultValue)).toBe(expected);
  });
});

describe('getKeyValue', () => {
  const inputArr = { k1: 'v1', k2: 'v2' };
  const outputArr = [{ key: 'k1', value: 'v1' }, { key: 'k2', value: 'v2' }];

  it('should convert array as expected', () => {
    expect(utils.getKeyValue(inputArr)).toEqual(outputArr);
    expect(utils.getKeyValue({})).toEqual([]);
  });
});

describe('getGitRevision', () => {
  expect(typeof utils.getGitRevision()).toBe('string');
});

describe('getObjectsByKeyValue', () => {
  it.each([
    [undefined, [], undefined, undefined],
    [undefined, [], 'foo', 'bar'],
    [{ key: 'a', value: '1' }, [{ key: 'a', value: '1' }, { key: 'b', value: '1' }], 'a', '1'],
    [{ key: 'b', value: '1' }, [{ key: 'a', value: '1' }, { key: 'b', value: '1' }], 'b', '1'],
  ])('should yield %j when given array %j, key %s and value %s', (expected, array, key, value) => {
    expect(utils.getObjectsByKeyValue(array, key, value)).toEqual(expected);
  });
});

describe('groupByObject', () => {
  const test1 = { foo: 'baz', blah: 'test' };
  const test2 = { foo: 'baz', blah: 'test2' };
  const test3 = { foo: 'free', blah: 'test3' };

  it.each([
    [[], 'foo', 'bar', []],
    [[{ foo: 'baz', bar: [test1] }], 'foo', 'bar', [test1]],
    [[{ foo: 'baz', bar: [test1, test2] }], 'foo', 'bar', [test1, test2]],
    [[{ foo: 'baz', bar: [test1, test2] }, { foo: 'free', bar: [test3] }], 'foo', 'bar', [test1, test2, test3]]
  ])('should return %j given property %s, group %s and objectArray %j', (expected, property, group, objectArray) => {
    expect(utils.groupByObject(property, group, objectArray)).toEqual(expected);
  });
});

describe('isTruthy', () => {
  it('should return undefined given undefined', () => {
    expect(utils.isTruthy(undefined)).toBeUndefined();
  });

  it.each([
    true, 1, 'true', 'TRUE', 't', 'T', 'yes', 'yEs', 'y', 'Y', '1', new String('true')
  ])('should return true given %j', (value) => {
    expect(utils.isTruthy(value)).toBeTruthy();
  });

  it.each([
    false, 0, 'false', 'FALSE', 'f', 'F', 'no', 'nO', 'n', 'N', '0', new String('false'), {}
  ])('should return false given %j', (value) => {
    expect(utils.isTruthy(value)).toBeFalsy();
  });
});

describe('joinPath', () => {
  beforeAll(() => {
    if (jest.isMockFunction(utils.joinPath)) {
      utils.joinPath.mockRestore();
    }
  });

  it('should return blank if nothing supplied', () => {
    expect(utils.joinPath()).toEqual('');
  });

  it('should return multiple parts joined with the delimiter', () => {
    expect(utils.joinPath('my', 'file', 'path')).toEqual('my/file/path');
    expect(utils.joinPath('my', '', 'path')).toEqual('my/path');
    expect(utils.joinPath('my', 'file/path/123', 'abc')).toEqual('my/file/path/123/abc');
  });

  it('should handle no-length sections', () => {
    expect(utils.joinPath('my', 'file//123', 'abc')).toEqual('my/file/123/abc');
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
  it.each([
    // Should return back input if not a string
    [undefined, undefined],
    [12, 12],
    [null, null],
    [['a', 'b'], ['a', 'b']],
    [{ a: 'a', b: 'b' }, { a: 'a', b: 'b' }],
    // Should return an array of split trimmed strings for blanks
    [[''], ''],
    [['', ''], '   ,   '],
    // Should return an array of split trimmed strings
    [['this', 'is', 'a', 'test'], 'this, is , a,test  ']
  ])('should return %j given %j', (expected, value) => {
    expect(utils.parseCSV(value)).toEqual(expected);
  });
});

describe('parseIdentityKeyClaims', () => {
  beforeAll(() => {
    if (jest.isMockFunction(utils.parseIdentityKeyClaims)) {
      utils.parseIdentityKeyClaims.mockRestore();
    }
  });

  it('should return array containing just "sub" when no identityKey', () => {
    config.has.mockReturnValueOnce(false); // keycloak.identityKey
    expect(utils.parseIdentityKeyClaims()).toEqual(['sub']);
  });

  it.each([
    [['foo', 'sub'], 'foo'],
    [['foo', 'bar', 'sub'], 'foo,bar']
  ])('should return %j when identityKey is %j', (expected, value) => {
    config.has.mockReturnValueOnce(true); // keycloak.identityKey
    config.get.mockReturnValueOnce(value); // keycloak.identityKey
    expect(utils.parseIdentityKeyClaims()).toEqual(expected);
  });
});

describe('streamToBuffer', () => {
  it('should reject on a non-stream input', () => {
    expect(utils.streamToBuffer()).rejects.toThrow();
    expect(utils.streamToBuffer(123)).rejects.toThrow();
  });

  it('should return a buffer', () => {
    const Readable = require('stream').Readable;
    const s = new Readable();
    s._read = () => { }; // redundant? see update below
    s.push('your text here');
    s.push(null);

    const result = utils.streamToBuffer(s);

    expect(result).resolves.toBeTruthy();
    expect(result).resolves.toBeInstanceOf(Buffer);
  });
});

describe('toLowerKeys', () => {
  it.each([
    [undefined, undefined],
    [undefined, 1],
    [undefined, {}],
    [[{ key: 'k1', value: 'V1' }], [{ Key: 'k1', Value: 'V1' }]],
    [[{ key: 'k1', value: 'V1' }, { key: 'k2', value: 'V2' }], [{ Key: 'k1', Value: 'V1' }, { Key: 'k2', Value: 'V2' }]]
  ])('should return %j given %j', (expected, value) => {
    expect(utils.toLowerKeys(value)).toEqual(expected);
  });
});
